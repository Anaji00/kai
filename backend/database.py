import os
import logging
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.engine import make_url
from sqlalchemy.pool import NullPool
from backend.config import settings

logger = logging.getLogger("kai_database")

db_url = settings.DATABASE_URL
# Automatically normalize legacy postgres:// URLs to postgresql://
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)
# Name the installed driver explicitly: newer SQLAlchemy releases default bare postgresql:// to psycopg 3.
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

is_vercel = os.getenv("VERCEL") == "1"
is_serverless = is_vercel or bool(os.getenv("AWS_LAMBDA_FUNCTION_NAME"))

if "sqlite" in db_url:
    # Serverless runtime hygiene: Vercel / Lambda filesystems outside /tmp are read-only
    if is_serverless:
        # /tmp is per-instance and wiped on cold start, so bookings written there silently disappear.
        if settings.ENVIRONMENT == "production":
            raise RuntimeError(
                "DATABASE_URL must point at PostgreSQL in production on serverless hosting; "
                "SQLite would lose every booking on the next cold start."
            )
        db_url = "sqlite:////tmp/kai_sanctuary.db"
        logger.warning(f"Serverless preview without DATABASE_URL (VERCEL={is_vercel}): using ephemeral {db_url}. Data will not persist.")

    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False},
        echo=False
    )

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()
else:
    # Production-ready PostgreSQL connection pooling
    # In serverless/Vercel environments or PgBouncer transaction pooling, use NullPool to prevent connection leaks
    _parsed_db_url = make_url(db_url)
    is_pgbouncer = _parsed_db_url.port == 6543 or "pgbouncer" in _parsed_db_url.query
    if is_serverless or is_pgbouncer:
        engine = create_engine(
            db_url,
            poolclass=NullPool,
            pool_pre_ping=True,
            echo=False
        )
        logger.info("Configured serverless PostgreSQL engine with NullPool and pre-ping.")
    else:
        engine = create_engine(
            db_url,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
            pool_recycle=3600,
            echo=False
        )
        logger.info("Configured production PostgreSQL connection pool with pre-ping and recycle hooks.")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Arbitrary fixed key for pg_advisory_xact_lock; identifies "KAI schema init" across all processes.
_SCHEMA_INIT_LOCK_KEY = 4827163


def init_db():
    """
    Creates and migrates the schema. On Postgres this holds an advisory lock, because several workers or
    serverless instances starting together would otherwise race and crash on duplicate table creation.
    A transaction-scoped lock also works through transaction-mode connection poolers.
    """
    if engine.dialect.name == "postgresql":
        from sqlalchemy import text
        with engine.begin() as lock_conn:
            lock_conn.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": _SCHEMA_INIT_LOCK_KEY})
            _init_db_schema()
    else:
        _init_db_schema()


def _init_db_schema():
    import backend.models as core_models  # noqa: F401
    import backend.sidecar.models as sidecar_models  # noqa: F401
    Base.metadata.create_all(bind=engine)

    # Automatic schema migration check for newly added columns.
    # Column types are compiled for the active dialect (DATETIME on SQLite, TIMESTAMP on PostgreSQL)
    # and each ALTER runs in its own transaction so one failure can't skip the rest.
    from sqlalchemy import inspect, text, Boolean, DateTime, JSON, String, Text

    def _ddl(col_type) -> str:
        return col_type.compile(dialect=engine.dialect)

    pending_columns = {
        "staging_intakes": [
            ("wellness_profile", f"{_ddl(JSON())} DEFAULT '{{}}'"),
            ("clinical_screening_enabled", f"{_ddl(Boolean())} DEFAULT FALSE"),
            ("crm_trip_id", _ddl(String(64))),
            ("crm_contact_id", _ddl(String(64))),
            ("sub_trip_id", _ddl(String(64))),
            ("group_cohort_id", _ddl(String(64))),
            ("synced_at", _ddl(DateTime())),
        ],
        "action_drafts": [
            ("scheduled_for", _ddl(DateTime())),
            ("recipient_email", _ddl(String(128))),
            ("recipient_phone", _ddl(String(32))),
            ("provider_message_id", _ddl(String(128))),
            ("dispatched_at", _ddl(DateTime())),
            ("dispatched_by", _ddl(String(64))),
            ("dispatch_error", _ddl(Text())),
            ("target_entity_type", _ddl(String(64))),
            ("target_entity_id", _ddl(String(64))),
            ("target_entity_version_hash", _ddl(String(64))),
            ("staged_patch_json", _ddl(Text())),
            ("reviewed_by_operator_id", _ddl(String(36))),
            ("reviewed_at", _ddl(DateTime())),
        ],
        "webhook_event_logs": [
            ("provider_event_id", _ddl(String(128))),
        ],
        "ground_transfer_records": [
            ("chauffeur_notes", _ddl(Text())),
        ],
        "crm_trips": [
            ("activity_timeline", f"{_ddl(JSON())} DEFAULT '[]'"),
        ],
    }

    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    for table, columns in pending_columns.items():
        if table not in tables:
            continue
        existing_cols = {c["name"] for c in inspector.get_columns(table)}
        for col_name, col_ddl in columns:
            if col_name in existing_cols:
                continue
            try:
                with engine.begin() as conn:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_ddl}"))
                logger.info(f"Migrated schema: Added {col_name} column to {table}")
            except Exception as e:
                logger.error(f"Schema migration failed for {table}.{col_name}: {e}")

    # Dynamic column reconciler: ensures any model column defined in SQLAlchemy is safely added to existing tables
    for table_name, table_obj in Base.metadata.tables.items():
        if table_name not in tables:
            continue
        existing_cols = {c["name"] for c in inspector.get_columns(table_name)}
        for column in table_obj.columns:
            if column.name in existing_cols:
                continue
            try:
                col_type = column.type.compile(dialect=engine.dialect)
                default_clause = ""
                if column.server_default is not None:
                    default_clause = f" DEFAULT {column.server_default.arg}"
                elif column.default is not None and hasattr(column.default, "arg") and isinstance(column.default.arg, (int, float, str, bool)):
                    val = column.default.arg
                    if isinstance(val, bool):
                        val_str = "TRUE" if val else "FALSE"
                    elif isinstance(val, (int, float)):
                        val_str = str(val)
                    else:
                        val_str = f"'{val}'"
                    default_clause = f" DEFAULT {val_str}"
                
                with engine.begin() as conn:
                    conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column.name} {col_type}{default_clause}"))
                logger.info(f"Auto-migrated missing column: {table_name}.{column.name}")
            except Exception as e:
                logger.warning(f"Auto-migration column notice for {table_name}.{column.name}: {e}")

    # 3b. Ensure critical unique and search indexes exist
    pending_indexes = [
        ("ix_webhook_event_logs_provider_event_id", "webhook_event_logs", "provider_event_id", True),
    ]
    for idx_name, tbl, col, is_unique in pending_indexes:
        if tbl in tables:
            try:
                unique_clause = "UNIQUE " if is_unique else ""
                with engine.begin() as conn:
                    conn.execute(text(f"CREATE {unique_clause}INDEX IF NOT EXISTS {idx_name} ON {tbl} ({col})"))
            except Exception as e:
                logger.warning(f"Index creation notice for {idx_name}: {e}")

    # 4. Auto-seed sanctuary cohorts from retreats catalog if empty
    try:
        from backend.models import SanctuaryCohort
        from backend.services.retreats_service import RETREATS_CATALOG
        with SessionLocal() as db:
            if db.query(SanctuaryCohort).count() == 0:
                for r in RETREATS_CATALOG:
                    cohort = SanctuaryCohort(
                        slug=r.get("slug", r.get("id")),
                        title=r.get("title", ""),
                        destination=r.get("destination", ""),
                        country=r.get("country", ""),
                        dates=r.get("dates", ""),
                        year=r.get("year", 2027),
                        season=r.get("season", "Winter"),
                        duration=r.get("duration", "7 Days / 6 Nights"),
                        capacity_limit=r.get("spotsTotal", 14),
                        spots_remaining=r.get("baseSpotsRemaining", 4),
                        investment_starting=r.get("investmentStarting", "$3,850"),
                        tagline=r.get("tagline"),
                        description=r.get("description"),
                        hero_image=r.get("heroImage"),
                        status="OPEN"
                    )
                    db.add(cohort)
                db.commit()
                logger.info(f"Initialized database-backed sanctuary cohorts ({len(RETREATS_CATALOG)} cohorts seeded).")
    except Exception as e:
        logger.warning(f"SanctuaryCohort auto-seed notice: {e}")

    # 5. First operator account
    try:
        from backend.services.auth_service import ensure_bootstrap_operator
        with SessionLocal() as db:
            ensure_bootstrap_operator(db)
    except Exception as e:
        logger.error(f"Bootstrap operator creation failed: {e}")
