import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import uvicorn

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8972"))
    print(f"Starting KAI Wellness Retreats FastAPI Server on http://127.0.0.1:{port} ...")
    print(f"Interactive Documentation available at http://127.0.0.1:{port}/docs")
    uvicorn.run("backend.main:app", host="127.0.0.1", port=port, reload=True)
