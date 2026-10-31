"""
Vercel Python function entrypoint for the FastAPI backend.
vercel.json rewrites /api/v1/* here; FastAPI still sees the original /api/v1/... path, so the
existing routers match unchanged. Startup runs at import because serverless runtimes may not
send ASGI lifespan events.
"""
import sys
from pathlib import Path

_repo_root = Path(__file__).resolve().parent.parent
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))

from backend.main import app, run_startup  # noqa: E402

run_startup()

__all__ = ["app"]
