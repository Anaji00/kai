import sys
from pathlib import Path

# Ensure repository root is in sys.path
_repo_root = Path(__file__).resolve().parent
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))

from backend.main import app

__all__ = ["app"]

if __name__ == "__main__":
    import uvicorn
    print("Starting KAI Wellness Retreats API on http://127.0.0.1:8000 ...")
    print("Documentation available at http://127.0.0.1:8000/docs")
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
