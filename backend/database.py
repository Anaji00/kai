import logging
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.config import settings

logger = logging.getLogger("kai_database")

db_url = settings.DATABASE_URL
# Automatically normalize legacy postgres:// URLs to postgresql://
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

if "sqlite" in db_url:
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


def init_db():
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
        ],
        "action_drafts": [
            ("scheduled_for", _ddl(DateTime())),
            ("recipient_email", _ddl(String(128))),
            ("recipient_phone", _ddl(String(32))),
            ("provider_message_id", _ddl(String(128))),
            ("dispatched_at", _ddl(DateTime())),
            ("dispatched_by", _ddl(String(64))),
            ("dispatch_error", _ddl(Text())),
        ],
        "webhook_event_logs": [
            ("provider_event_id", _ddl(String(128))),
        ],
        "ground_transfer_records": [
            ("chauffeur_notes", _ddl(Text())),
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

