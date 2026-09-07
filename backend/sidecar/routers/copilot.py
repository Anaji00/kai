import logging
import time
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, Form
from sqlalchemy.orm import Session
from typing import Optional
from backend.database import get_db
from backend.sidecar.schemas import (
    CopilotChatRequest,
    CopilotChatResponse,
    UploadedDocumentResponse
)
from backend.sidecar.services.ollama_service import OllamaServiceError
from backend.sidecar.services.copilot_agent import clinical_copilot, TOOL_DESCRIPTIONS_LAYMAN
from backend.sidecar.services.document_parser_service import (
    parse_document_content,
    store_uploaded_document,
    sanitize_filename
)

logger = logging.getLogger("kai_copilot_router")

router = APIRouter(prefix="/copilot", tags=["Clinical Copilot"])


@router.post("/chat", response_model=CopilotChatResponse)
def chat_with_copilot(
    req: CopilotChatRequest,
    db: Session = Depends(get_db)
):
    """
    All-encompassing AI Chief of Staff & Clinical Copilot for Founder Kareena Islam, BSN, RN.
    Supports 4 operational modes:
    - clinical_safety: Contraindication screening & somatic RAG
    - consult_prep: Pre-call dossiers & personalized email drafting
    - travel_concierge: Hotel & flight queries via Expedia & Grand Travel
    - studio_ops: Layman explanations of tools & cohort status
    """
    try:
        t0 = time.time()
        res = clinical_copilot.process_chat(
            message=req.message,
            mode=req.mode,
            guest_context=req.guest_context,
            sanctuary_slug=req.sanctuary_slug,
            current_page=req.current_page,
            conversation_history=req.conversation_history,
            db=db
        )
        elapsed_ms = int((time.time() - t0) * 1000)
        return CopilotChatResponse(
            response_text=res["response_text"],
            mode=res["mode"],
            safety_level=res.get("safety_level"),
            safety_screened=res.get("safety_screened", False),
            tool_calls=res.get("tool_calls", []),
            citations=res.get("citations", []),
            suggested_followups=res.get("suggested_followups", []),
            form_fill_proposal=res.get("form_fill_proposal"),
            sanctuary_slug=res.get("sanctuary_slug"),
            latency_ms=elapsed_ms,
            model_used=res.get("model_used")
        )
    except OllamaServiceError as ose:
        logger.warning(f"Ollama service error: {ose.message}")
        raise HTTPException(
            status_code=503,
            detail=f"Ollama (Qwen) service error: {ose.message}. {ose.diagnostic_hint}"
        )
    except Exception as e:
        logger.error(f"Error processing copilot chat: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Copilot processing failed: {str(e)}")


@router.post("/upload-document", response_model=UploadedDocumentResponse)
async def upload_document_to_copilot(
    file: UploadFile = File(...),
    guest_name: Optional[str] = Form(None),
    intake_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Accepts guest health intake PDFs, medical notes, vouchers, or CSV manifests.
    Extracts clinical flags and travel details securely.
    """
    try:
        raw_bytes = await file.read()
        cleaned_filename = sanitize_filename(file.filename or "uploaded_document")
        parsed = parse_document_content(
            filename=cleaned_filename,
            raw_bytes=raw_bytes,
            guest_name=guest_name,
            intake_id=intake_id
        )
        record = store_uploaded_document(
            db=db,
            parsed_info=parsed,
            guest_name=guest_name,
            intake_id=intake_id
        )
        return record
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Failed to parse uploaded file: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"File parsing error: {str(e)}")


@router.get("/tool-guide")
def get_layman_tool_guide():
    """
    Returns simplified, plain-English layman explanations of all 10 tools
    in the KAI Sanctuary Studio.
    """
    return {
        "guide": TOOL_DESCRIPTIONS_LAYMAN,
        "total_tools": len(TOOL_DESCRIPTIONS_LAYMAN),
        "founder_principles": [
            "Tern Native Payments: Zero custom payment liability, Tern handles authorizations.",
            "Personalized Founder Approval: 100% human-in-the-loop review before any external message.",
            "Intimate Cohort Safety: Strictly 12 to 14 guests max for nervous system sanctuary."
        ]
    }

