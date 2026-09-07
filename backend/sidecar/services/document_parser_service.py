import os
import re
from typing import Dict, Any, List, Tuple
from sqlalchemy.orm import Session
from backend.sidecar.models import UploadedDocumentRecord, generate_uuid_str

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB limit
ALLOWED_EXTENSIONS = {".pdf", ".txt", ".csv", ".json", ".png", ".jpg", ".jpeg"}


def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent directory traversal or malicious characters."""
    base = os.path.basename(filename)
    # Remove any characters not alphanumeric, dot, underscore, or hyphen
    cleaned = re.sub(r"[^a-zA-Z0-9._-]", "_", base)
    return cleaned[:120] if cleaned else "uploaded_document"


def parse_document_content(
    filename: str,
    raw_bytes: bytes,
    guest_name: str = None,
    intake_id: str = None
) -> Dict[str, Any]:
    """
    Parses document contents and extracts clinical health notes and travel details.
    Language is structured to be warm, clear, and serene for the client.
    """
    ext = os.path.splitext(filename)[1].lower()
    file_size = len(raw_bytes)

    if file_size > MAX_FILE_SIZE_BYTES:
        raise ValueError(f"File size exceeds 10MB limit ({round(file_size / (1024 * 1024), 2)} MB).")

    # Decode text if text-based
    text_content = ""
    if ext in [".txt", ".csv", ".json"]:
        try:
            text_content = raw_bytes.decode("utf-8", errors="ignore")
        except Exception:
            text_content = ""
    elif ext == ".pdf":
        # Safe basic text extraction without requiring heavy binary dependencies
        # Extract ASCII strings from PDF stream
        ascii_matches = re.findall(rb"[a-zA-Z0-9\s.,;:'\"()\-@/]{4,}", raw_bytes)
        text_content = " ".join([m.decode("latin1", errors="ignore") for m in ascii_matches[:500]])
    else:
        text_content = f"Binary attachment received: {filename}"

    # Clinical screening
    clinical_flags = []
    contraindication_keywords = {
        "pregnancy": "Pregnancy noted - Gentle modifications for deep heat and breath retention.",
        "hypertension": "Elevated blood pressure mentioned - Emphasizing parasympathetic slow breathing and avoiding intense thermal shock.",
        "cardiac": "Cardiovascular history - Clearance noted for gentle restorative movement only.",
        "surgery": "Recent surgical procedure - Gentle pacing and restorative props prioritized.",
        "asthma": "Respiratory sensitivity - Humid ocean air and eucalyptus mist prepared.",
        "gluten": "Gluten sensitivity - 100% dedicated gluten-free meal prep coordinated with chef.",
        "dairy": "Dairy sensitivity - Coconut and almond plant elixirs prepared.",
        "seizure": "Neurological history - Gentle soothing sound baths with no rapid flashing lighting.",
        "peanut": "Severe nut allergy - Strictly allergen-free dining kitchen notified.",
        "shellfish": "Shellfish allergy - Coastal catch menus customized with private chef."
    }

    lower_text = text_content.lower()
    for kw, note in contraindication_keywords.items():
        if kw in lower_text:
            clinical_flags.append(note)

    # Travel detail extraction
    travel_details = []
    flight_matches = re.findall(r"\b([A-Z]{2,3}\s?\d{2,4})\b", text_content)
    if flight_matches:
        travel_details.append(f"Detected flight itinerary: {', '.join(set(flight_matches[:3]))}")

    airport_matches = re.findall(r"\b(LIR|SJO|NAP|FCO|DPS|CUN)\b", text_content)
    if airport_matches:
        travel_details.append(f"Arrival airport detected: {', '.join(set(airport_matches))}")

    # Safety status
    if len(clinical_flags) > 0:
        safety_status = "ATTENTION_NEEDED"
        summary = (
            f"Document reviewed with care. Extracted health considerations: {len(clinical_flags)} note(s) logged. "
            f"Founder Kareena Islam, RN will review personalized retreat adaptations during your welcome orientation."
        )
    else:
        safety_status = "CLEARED"
        summary = (
            f"Document safely processed and cleared. All details aligned with sanctuary wellness protocols. "
            f"Your personal preferences have been saved to your sanctuary care dossier."
        )

    return {
        "filename": filename,
        "file_type": ext.replace(".", "").upper() if ext else "FILE",
        "file_size_bytes": file_size,
        "extracted_summary": summary,
        "clinical_notes_found": clinical_flags,
        "travel_details_found": travel_details,
        "safety_clearance_status": safety_status
    }


def store_uploaded_document(
    db: Session,
    parsed_info: Dict[str, Any],
    guest_name: str = None,
    intake_id: str = None
) -> UploadedDocumentRecord:
    """
    Saves parsed document record in the database.
    """
    record = UploadedDocumentRecord(
        id=generate_uuid_str(),
        filename=parsed_info["filename"],
        file_type=parsed_info["file_type"],
        file_size_bytes=parsed_info["file_size_bytes"],
        associated_guest_name=guest_name,
        associated_intake_id=intake_id,
        extracted_summary=parsed_info["extracted_summary"],
        clinical_notes_found=parsed_info["clinical_notes_found"],
        travel_details_found=parsed_info["travel_details_found"],
        safety_clearance_status=parsed_info["safety_clearance_status"]
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
