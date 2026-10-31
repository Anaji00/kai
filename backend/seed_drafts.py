import sys
from pathlib import Path
_repo_root = Path(__file__).resolve().parent.parent
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))

from backend.database import SessionLocal, init_db
from backend.sidecar.services.automation_generators import (
    generate_flight_chauffeur_draft,
    generate_whatsapp_concierge_draft,
    generate_packing_dossier_draft,
    generate_post_retreat_integration_draft
)

def seed_drafts():
    init_db()
    db = SessionLocal()
    
    # 1. Flight Tracking
    generate_flight_chauffeur_draft(db, "Marcus Aurelius", "DL 482 delayed. New ETA 4:15 PM.")
    
    # 2. WhatsApp Concierge
    generate_whatsapp_concierge_draft(db, "Elena Gilbert", "improve REM sleep architecture and deep rest")
    
    # 3. Packing Dossier
    generate_packing_dossier_draft(db, "Sophia Sterling", "Nosara, Costa Rica")
    
    # 4. Post-Retreat Integration
    generate_post_retreat_integration_draft(db, "Dr. James Wilson")
    
    print("Seed complete. Added 4 action drafts to the queue.")
    db.close()

if __name__ == "__main__":
    seed_drafts()
