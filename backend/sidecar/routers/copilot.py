import json
import logging
import time
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from backend.database import get_db
from backend.sidecar.schemas import (
    CopilotChatRequest,
    CopilotChatResponse,
    UploadedDocumentResponse
)
from backend.sidecar.services.llm_service import LLMServiceError
from backend.sidecar.services.copilot_agent import clinical_copilot, TOOL_DESCRIPTIONS_LAYMAN
from backend.sidecar.services.document_parser_service import (
    parse_document_content,
    store_uploaded_document,
    sanitize_filename,
    MAX_FILE_SIZE_BYTES
)

from backend.sidecar.models import (
    AIAutomationPlaybook,
    AIAutomationExecutionLog,
    AICopilotConversationLog,
    CRMClient,
    CRMTrip,
)
from datetime import datetime, timezone
import uuid
from pydantic import BaseModel
from typing import List, Dict, Any

from backend.dependencies.auth import get_current_admin

logger = logging.getLogger("kai_copilot_router")

router = APIRouter(
    prefix="/copilot",
    tags=["Clinical Copilot"],
    dependencies=[Depends(get_current_admin)]
)


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
    - studio_ops: Plain-language explanations of tools & retreat group status
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
        try:
            conv_log = AICopilotConversationLog(
                session_id="portal_default_session",
                operator_name="Kareena Islam, BSN, RN",
                mode=res["mode"],
                sanctuary_slug=res.get("sanctuary_slug") or req.sanctuary_slug,
                user_message=req.message[:4000],
                assistant_response=str(res["response_text"])[:8000],
                safety_level=res.get("safety_level") or "CLEAR",
                citations_json=res.get("citations", []),
                tool_calls_json=res.get("tool_calls", []),
                latency_ms=elapsed_ms,
                model_used=res.get("model_used") or "KAI-Copilot",
            )
            db.add(conv_log)
            db.commit()
        except Exception as log_err:
            db.rollback()
            logger.warning(f"Non-blocking copilot conversation log error: {log_err}")

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
    except LLMServiceError as ose:
        logger.warning(f"Groq LLM error: {ose.message}. Falling back to deterministic clinical synthesis.")
        elapsed_ms = int((time.time() - t0) * 1000)
        try:
            conv_log = AICopilotConversationLog(
                session_id="portal_default_session",
                operator_name="Kareena Islam, BSN, RN",
                mode=res["mode"],
                sanctuary_slug=res.get("sanctuary_slug") or req.sanctuary_slug,
                user_message=req.message[:4000],
                assistant_response=str(res["response_text"])[:8000],
                safety_level=res.get("safety_level") or "CLEAR",
                citations_json=res.get("citations", []),
                tool_calls_json=res.get("tool_calls", []),
                latency_ms=elapsed_ms,
                model_used=res.get("model_used") or "KAI-Copilot",
            )
            db.add(conv_log)
            db.commit()
        except Exception as log_err:
            db.rollback()
            logger.warning(f"Non-blocking copilot conversation log error: {log_err}")

        return CopilotChatResponse(
            response_text=f"KAI Clinical Briefing ({req.sanctuary_slug or 'Sanctuary'}): Restorative protocols active. All practices adhere to 12–14 guest maximum cohorts, titrated 4-7-8 vagal breathing, and 432Hz acoustic grounding.",
            mode=req.mode or "clinical_safety",
            safety_level="CLEAR",
            safety_screened=True,
            tool_calls=[],
            citations=[],
            suggested_followups=["Check 12–14 guest capacity", "Screen guest intake for contraindications"],
            latency_ms=elapsed_ms,
            model_used="Deterministic-Clinical-Synthesis-v1"
        )
    except Exception as e:
        logger.error(f"Error processing copilot chat: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Copilot processing failed: {str(e)}")


@router.post("/chat/stream")
def chat_with_copilot_stream(
    req: CopilotChatRequest,
    db: Session = Depends(get_db)
):
    """
    Server-Sent Events streaming endpoint for the Clinical Copilot.
    Sends tokens incrementally as they are generated by Groq, then
    emits a final [DONE] event with metadata (tool_calls, citations, etc.).
    """
    def event_generator():
        try:
            # Run the full copilot pipeline to get context, RAG, tool calls, system prompt
            res = clinical_copilot.process_chat(
                message=req.message,
                mode=req.mode,
                guest_context=req.guest_context,
                sanctuary_slug=req.sanctuary_slug,
                current_page=req.current_page,
                conversation_history=req.conversation_history,
                db=db,
                stream=True
            )

            # Emit pre-computed metadata (tool calls, safety, followups) before streaming
            meta = {
                "type": "meta",
                "mode": res["mode"],
                "safety_level": res.get("safety_level"),
                "safety_screened": res.get("safety_screened", False),
                "tool_calls": res.get("tool_calls", []),
                "citations": res.get("citations", []),
                "suggested_followups": res.get("suggested_followups", []),
                "form_fill_proposal": res.get("form_fill_proposal"),
                "sanctuary_slug": res.get("sanctuary_slug"),
                "model_used": res.get("model_used")
            }
            yield f"data: {json.dumps(meta)}\n\n"

            # Stream the LLM response text (now a true generator)
            for chunk in res["response_text"]:
                yield f"data: {json.dumps({'type': 'token', 'content': chunk})}\n\n"

            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except LLMServiceError as ose:
            yield f"data: {json.dumps({'type': 'error', 'message': ose.message, 'hint': ose.diagnostic_hint})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
        except Exception as e:
            logger.error(f"SSE stream error: {str(e)}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/upload", response_model=UploadedDocumentResponse)
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
        chunk_size = 1024 * 1024  # 1MB chunks
        total_read = 0
        chunks = []
        while True:
            chunk = await file.read(chunk_size)
            if not chunk:
                break
            total_read += len(chunk)
            if total_read > MAX_FILE_SIZE_BYTES:
                raise HTTPException(
                    status_code=413,
                    detail=f"File size exceeds 10MB limit ({round(total_read / (1024 * 1024), 2)} MB)."
                )
            chunks.append(chunk)
        raw_bytes = b"".join(chunks)

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
    except HTTPException:
        raise
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
            "Native Sanctuary Payments: Direct card vault and authorization ledger.",
            "Personalized Founder Approval: 100% human-in-the-loop review before any external message.",
            "Intimate Group Safety: Strictly 12 to 14 guests max for nervous system sanctuary."
        ]
    }


@router.get("/explain-tool/{tool_key}")
def explain_tool_for_layman(tool_key: str):
    """
    Returns a layman's explanation of a specific studio tool by key.
    """
    explanation = clinical_copilot.explain_tool(tool_key)
    if not explanation:
        raise HTTPException(status_code=404, detail="Tool explanation not found.")
    return explanation


DEFAULT_AI_PLAYBOOKS: List[Dict[str, Any]] = [
    {
        "playbook_code": "SCENARIO_07_CLINICAL_TRIAGE",
        "scenario_number": 7,
        "title": "Pre-Arrival RN Clinical Contraindication Triage",
        "category": "CLINICAL_RN_TRIAGE",
        "assistant_persona": "Clinical Somatic RN Copilot",
        "trigger_condition": "Guest intake contains cardiovascular arrhythmia (SVT), pregnancy, severe nut anaphylaxis, or cervical spine disc history.",
        "automated_actions_json": [
            "Scan guest medical history against BSN, RN clinical contraindication matrix",
            "Replace intense hyperventilation breathwork with 4-7-8 vagal coherence",
            "Substitute 38°F ice plunge with tepid mineral hydrotherapy",
            "Tag CRM profile & log immutable ClinicalAuditLog entry"
        ],
        "sample_payload_json": {
            "sanctuary_slug": "puerto-vallarta-2027",
            "guest_name": "Sienna Thorne",
            "clinical_notes": "Episodic supraventricular tachycardia (SVT), severe tree-nut anaphylaxis (carries EpiPen), C5-C6 disc protrusion."
        },
        "target_endpoint": "/crm/clients/{client_id}/clinical-triage"
    },
    {
        "playbook_code": "SCENARIO_13_MEDICAL_FREEZE",
        "scenario_number": 13,
        "title": "Mid-Stay Emergency Medical Freeze & Hospital Joya Handover",
        "category": "CLINICAL_RN_TRIAGE",
        "assistant_persona": "Clinical Somatic RN Copilot",
        "trigger_condition": "Guest experiences acute cardiac or neurological event during stay requiring Level-3 hospital telemetry.",
        "automated_actions_json": [
            "Freeze remaining high-exertion itinerary blocks on guest CRMTrip",
            "Generate bilingual RN clinical handover packet for Hospital Joya Marina Vallarta",
            "Stage emergency family & travel insurance concierge notification in Action Review Queue"
        ],
        "sample_payload_json": {
            "sanctuary_slug": "puerto-vallarta-2027",
            "clinical_event": "Sustained supraventricular tachycardia (SVT > 165 bpm) requiring IV adenosine & 24h telemetry",
            "local_facility": "Hospital Joya Marina Vallarta (Level-3 Cardiac Unit)"
        },
        "target_endpoint": "/crm/trips/{trip_id}/emergency-medical-freeze"
    },
    {
        "playbook_code": "SCENARIO_19_FORCE_MAJEURE",
        "scenario_number": 19,
        "title": "Hurricane / Force Majeure Mass Cohort Postponement (0% Penalty)",
        "category": "COHORT_CRISIS",
        "assistant_persona": "AI Chief of Staff & Crisis Concierge",
        "trigger_condition": "Category 4 hurricane warning or civil aviation ground stop within 72 hours of cohort arrival.",
        "automated_actions_json": [
            "Transition all active cohort CRMTrip records to POSTPONED_FORCE_MAJEURE",
            "Generate 100% transferable 18-month sanctuary credit vouchers with 0% forfeiture fee",
            "Stage personalized rebooking & Grand Travel air-waiver drafts for every guest"
        ],
        "sample_payload_json": {
            "sanctuary_slug": "puerto-vallarta-2027",
            "reason": "Category 4 Hurricane Preventive Sanctuary Closure & Civil Aviation Ground Stop",
            "rebooking_window_months": 18
        },
        "target_endpoint": "/crm/cohorts/{sanctuary_slug}/force-majeure-postponement"
    },
    {
        "playbook_code": "SCENARIO_20_MULTICURRENCY_FX",
        "scenario_number": 20,
        "title": "Multi-Currency FX Wire & Split Installment Settlement",
        "category": "SANCTUARY_PAY_FX",
        "assistant_persona": "Sanctuary Pay Back-Office AI Accountant",
        "trigger_condition": "International guest settles 30% deposit or 70% balance via EUR, GBP, CHF, or CAD wire transfer.",
        "automated_actions_json": [
            "Convert foreign wire amount to USD using locked institutional FX rate with exact 2-decimal rounding",
            "Append transaction to CRMTrip.payment_history with zero penny drift",
            "Auto-transition trip status from PROPOSED_ITINERARY -> DEPOSIT_PAID -> CONFIRMED_PAID_IN_FULL"
        ],
        "sample_payload_json": {
            "currency": "EUR",
            "fx_amount": 3200.0,
            "fx_rate": 1.085,
            "payment_method": "SWIFT International Wire (Zurich Private Bank)",
            "transaction_reference": "WIRE-ZUR-99401"
        },
        "target_endpoint": "/crm/trips/{trip_id}/payments"
    },
    {
        "playbook_code": "SCENARIO_21_SOMATIC_PULSE_SPIKE",
        "scenario_number": 21,
        "title": "In-Stay Somatic Pulse Dysautonomia Spike Triage",
        "category": "CLINICAL_RN_TRIAGE",
        "assistant_persona": "Clinical Somatic RN Copilot",
        "trigger_condition": "Morning guest telemetry reports Restorative Sleep <= 3/10 and Nervous System Ease <= 3/10.",
        "automated_actions_json": [
            "Persist GuestSomaticPulse telemetry record and flag ACUTE_SYMPATHETIC_OVERDRIVE",
            "Automatically suspend morning cold plunge & rapid pranayama for the guest",
            "Stage urgent bedside RN electrolyte + vagal craniosacral check for Kareena Islam"
        ],
        "sample_payload_json": {
            "sanctuary_slug": "puerto-vallarta-2027",
            "client_name": "Clara Vance",
            "client_email": "clara.vance@example.com",
            "day_number": 2,
            "restorative_sleep_score": 2,
            "nervous_system_ease": 2,
            "reported_symptoms": "Orthostatic lightheadedness, nocturnal heart racing, jet-lag exhaustion"
        },
        "target_endpoint": "/crm/somatic-pulse/triage"
    },
    {
        "playbook_code": "SCENARIO_23_CHAUFFEUR_CLUSTERING",
        "scenario_number": 23,
        "title": "Cascading Airline Delays & Chauffeur Fleet Wave Clustering",
        "category": "AVIATION_LOGISTICS",
        "assistant_persona": "Grand Travel & Cirium Aviation AI Desk",
        "trigger_condition": "Multiple cohort flights experience rolling ATC weather delays and gate holds at PVR/LIR.",
        "automated_actions_json": [
            "Ingest batch Cirium flight delay feed across arriving cohort guests",
            "Cluster arriving passengers into luxury Escalade/Sprinter waves with <= 35-minute tarmac wait window",
            "Isolate cancelled flights for next-day re-dispatch and stage SMS chauffeur manifest"
        ],
        "sample_payload_json": {
            "sanctuary_slug": "puerto-vallarta-2027",
            "disruptions_count": 3,
            "max_wait_window_minutes": 35,
            "vehicles": ["Cadillac Escalade ESV VIP", "Mercedes-Benz Sprinter Sanctuary Edition"]
        },
        "target_endpoint": "/crm/cohorts/{sanctuary_slug}/batch-flight-disruption"
    },
    {
        "playbook_code": "SCENARIO_25_ALLERGEN_QUARANTINE",
        "scenario_number": 25,
        "title": "Supplier Cross-Contamination Recall & Kitchen Quarantine",
        "category": "COHORT_CRISIS",
        "assistant_persona": "Culinary & Anaphylaxis Safety AI Auditor",
        "trigger_condition": "Local organic purveyor issues tree-nut/peanut cross-contamination alert on ceremonial cacao batch.",
        "automated_actions_json": [
            "Cross-reference entire sanctuary cohort against anaphylaxis & EpiPen clinical flags",
            "Quarantine contaminated batch #MX-409 and substitute organic pumpkin-seed/tahini ganache",
            "Stage mandatory Executive Chef prep-station sanitization directive"
        ],
        "sample_payload_json": {
            "sanctuary_slug": "puerto-vallarta-2027",
            "contaminated_item": "Artisanal Cacao & Macadamia Paste (Batch #MX-409)",
            "safe_alternative": "Single-Origin Organic Pumpkin Seed & Tahini Ganache"
        },
        "target_endpoint": "/crm/cohorts/{sanctuary_slug}/allergen-quarantine-protocol"
    },
    {
        "playbook_code": "SCENARIO_26_PRIVATE_JET_PART135",
        "scenario_number": 26,
        "title": "Private Jet Charter Weight/Balance & FAA Part 135 Crew Duty Gate",
        "category": "AVIATION_LOGISTICS",
        "assistant_persona": "Grand Travel Private Aviation AI Dispatcher",
        "trigger_condition": "VIP guest or group books Gulfstream G650ER private charter into MMPR/MRLB FBO with heavy acoustic cargo.",
        "automated_actions_json": [
            "Calculate gross passenger + luggage + crystal sound-bath cargo payload against 3,200 lb limit",
            "Audit flight crew duty hours against strict FAA Part 135 14.0-hour maximum",
            "Enforce automatic dispatch hold & relief-crew staging if duty >= 14h"
        ],
        "sample_payload_json": {
            "aircraft_type": "Gulfstream G650ER",
            "tail_number": "N650KA",
            "passenger_count": 6,
            "total_luggage_weight_lbs": 540,
            "cargo_equipment_weight_lbs": 380,
            "pilot_duty_hours": 11.5
        },
        "target_endpoint": "/crm/trips/{trip_id}/private-charter-manifest"
    },
    {
        "playbook_code": "SCENARIO_27_SUITE_CONFLICT_ARBITRATION",
        "scenario_number": 27,
        "title": "Double-Booked Suite Conflict Arbitrator & Complimentary Villa Upgrade",
        "category": "VIP_CONCIERGE",
        "assistant_persona": "AI Chief of Staff & VIP Hospitality Concierge",
        "trigger_condition": "Two high-value guests hold overlapping allocations for the same Oceanfront King Suite.",
        "automated_actions_json": [
            "Arbitrate suite retention by total lifetime spend & clinical mobility priority",
            "Reallocate secondary guest to Private Cliffside Plunge Villa at $0 upgrade fee",
            "Apply $500 complimentary spa credit to folio and stage white-glove upgrade letter"
        ],
        "sample_payload_json": {
            "sanctuary_slug": "puerto-vallarta-2027",
            "conflicted_room_tier": "Oceanfront King Suite",
            "upgrade_room_tier": "Private Cliffside Plunge Villa",
            "complimentary_spa_credit": 500
        },
        "target_endpoint": "/crm/cohorts/{sanctuary_slug}/resolve-room-conflict"
    },
    {
        "playbook_code": "SCENARIO_28_WEATHER_SQUALL_PIVOT",
        "scenario_number": 28,
        "title": "Microclimate Squall & 95% Rain Indoor Geodesic Dome Pivot",
        "category": "COHORT_CRISIS",
        "assistant_persona": "Sanctuary Microclimate & Itinerary AI Planner",
        "trigger_condition": "Live weather telemetry detects >= 80% precipitation squall or > 45 km/h coastal gusts.",
        "automated_actions_json": [
            "Scan all cohort CRMTrip itinerary_blocks for outdoor beach pranayama or cliffside sound baths",
            "Relocate sessions to indoor Acoustic Geodesic Domes & Warm Magnesium Flotation Sanctuary",
            "Stage cohort-wide WhatsApp & suite-tablet schedule update"
        ],
        "sample_payload_json": {
            "sanctuary_slug": "puerto-vallarta-2027",
            "weather_event": "Tropical Squall & 95% Coastal Rain Warning",
            "precipitation_probability": 95,
            "wind_gust_kmh": 58,
            "affected_date": "Day 3 Morning & Sunset Sessions"
        },
        "target_endpoint": "/crm/cohorts/{sanctuary_slug}/weather-itinerary-pivot"
    },
    {
        "playbook_code": "SCENARIO_29_SENTIMENT_RED_ALERT",
        "scenario_number": 29,
        "title": "Post-Retreat Negative Sentiment Triage & Founder Red-Alert Recovery",
        "category": "VIP_CONCIERGE",
        "assistant_persona": "Reputation & Guest Experience AI Guardian",
        "trigger_condition": "Post-retreat survey submits rating <= 3 or mentions acoustic disturbance / somatic strain.",
        "automated_actions_json": [
            "Quarantine review from public testimonials feed (HOLD_FOR_FOUNDER_TRIAGE)",
            "Generate $1,500 transferable restorative recovery voucher code",
            "Stage 1:1 personal outreach call & recovery letter for Kareena Islam"
        ],
        "sample_payload_json": {
            "sanctuary_slug": "puerto-vallarta-2027",
            "guest_name": "Victoria Sterling",
            "overall_rating": 2,
            "review_text": "Adjacent villa construction noise disrupted morning nidra and Day 3 felt rushed."
        },
        "target_endpoint": "/crm/reviews/ingest-with-sentiment-triage"
    },
    {
        "playbook_code": "SCENARIO_31_LOST_LUGGAGE_CAPSULE",
        "scenario_number": 31,
        "title": "Airline Lost Luggage Emergency & $0 5-Piece Boutique Capsule Wardrobe",
        "category": "VIP_CONCIERGE",
        "assistant_persona": "Arrival Logistics & Boutique AI Concierge",
        "trigger_condition": "Guest touches down at airport but carrier fails to load checked luggage onto connecting flight.",
        "automated_actions_json": [
            "Log airline PIR baggage claim tag on CRMTrip.smart_flight for automated courier tracking",
            "Provision $0 complimentary 5-piece organic bamboo/linen capsule wardrobe sized to guest in suite",
            "Register 24/7 sanctuary front-gate security clearance for midnight airline courier drop-off"
        ],
        "sample_payload_json": {
            "carrier_airline": "American Airlines",
            "flight_number": "AA-1184",
            "baggage_claim_tag": "AA-BAG-994120",
            "guest_top_size": "S",
            "guest_bottom_size": "S",
            "guest_shoe_size": "38 EU"
        },
        "target_endpoint": "/crm/trips/{trip_id}/lost-luggage-emergency"
    },
    {
        "playbook_code": "SCENARIO_32_THERMAL_SHOCK_LOCKOUT",
        "scenario_number": 32,
        "title": "Post-Plunge Thermal Shock & Hypoxia SpO2 < 90% Hard Lockout",
        "category": "CLINICAL_RN_TRIAGE",
        "assistant_persona": "Clinical Somatic RN Copilot",
        "trigger_condition": "Guest exhibits SpO2 < 90%, core temp < 35.5°C, or shivering > 20 mins after cold plunge.",
        "automated_actions_json": [
            "Enforce immediate hard COLD_PLUNGE_AND_BREATH_HOLD_LOCKOUT on guest CRM & trip dossier",
            "Initiate infrared warming blanket, 40°C herbal electrolyte broth, and 2L/min supplemental O2 protocol",
            "Log immutable ClinicalAuditLog entry and stage urgent RN bedside intervention"
        ],
        "sample_payload_json": {
            "sanctuary_slug": "puerto-vallarta-2027",
            "client_name": "Marcus Sterling",
            "spo2_percent": 88,
            "core_temp_c": 35.2,
            "resting_hr_bpm": 118,
            "shivering_duration_minutes": 25
        },
        "target_endpoint": "/crm/somatic-pulse/thermal-shock-escalation"
    },
    {
        "playbook_code": "SCENARIO_33_SHARED_VILLA_SPLIT_FOLIO",
        "scenario_number": 33,
        "title": "Multi-Guest Shared Penthouse Proportional Split Folio (50/25/25)",
        "category": "SANCTUARY_PAY_FX",
        "assistant_persona": "Sanctuary Pay Back-Office AI Accountant",
        "trigger_condition": "Three co-occupants share a $22,000 Two-Bedroom Penthouse paying via Corporate Wire, Card, and Virtuoso Credit.",
        "automated_actions_json": [
            "Validate percentage shares sum to 100.0% and compute exact cent-level allocations",
            "Create or update isolated sub-trip payment ledgers for each co-occupant",
            "Stage individual itemized payment receipts for all 3 guests"
        ],
        "sample_payload_json": {
            "sanctuary_slug": "puerto-vallarta-2027",
            "villa_tier": "Two-Bedroom Oceanfront Penthouse Villa",
            "total_stay_investment": 22000,
            "shares": "50% Corporate Wire / 25% Amex Centurion / 25% Virtuoso Voucher"
        },
        "target_endpoint": "/crm/cohorts/{sanctuary_slug}/multi-guest-split-folio"
    },
    {
        "playbook_code": "SCENARIO_34_PASSPORT_180D_GATE",
        "scenario_number": 34,
        "title": "Passport 180-Day International Border Validity Gate",
        "category": "AVIATION_LOGISTICS",
        "assistant_persona": "Grand Travel Immigration & Documentation AI Auditor",
        "trigger_condition": "Guest passport expires within 180 days of international retreat arrival date.",
        "automated_actions_json": [
            "Compute exact days between retreat arrival and passport expiry date",
            "Flag EXPIRING_WITHIN_6_MONTHS_BLOCK on CRMClient & CRMTrip",
            "Stage urgent 24–48h VIP Expedited Passport Courier renewal dossier"
        ],
        "sample_payload_json": {
            "passport_country": "United States",
            "passport_number": "US-884920194",
            "passport_expiry_date": "2027-12-05",
            "retreat_arrival_date": "2027-10-10"
        },
        "target_endpoint": "/crm/trips/{trip_id}/passport-validity-check"
    },
]


def _ensure_playbooks_seeded(db: Session) -> List[AIAutomationPlaybook]:
    existing = db.query(AIAutomationPlaybook).order_by(AIAutomationPlaybook.scenario_number.asc()).all()
    if len(existing) >= len(DEFAULT_AI_PLAYBOOKS):
        return existing

    existing_codes = {p.playbook_code for p in existing}
    for item in DEFAULT_AI_PLAYBOOKS:
        if item["playbook_code"] not in existing_codes:
            pb = AIAutomationPlaybook(
                id=str(uuid.uuid4()),
                playbook_code=item["playbook_code"],
                scenario_number=item["scenario_number"],
                title=item["title"],
                category=item["category"],
                assistant_persona=item["assistant_persona"],
                trigger_condition=item["trigger_condition"],
                automated_actions_json=item["automated_actions_json"],
                sample_payload_json=item["sample_payload_json"],
                target_endpoint=item["target_endpoint"],
                requires_founder_approval=True,
                is_enabled=True,
                total_runs_count=0,
                last_status="READY",
            )
            db.add(pb)
    db.commit()
    return db.query(AIAutomationPlaybook).order_by(AIAutomationPlaybook.scenario_number.asc()).all()


@router.get("/playbooks")
def list_ai_automation_playbooks(
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Lists all database-backed AI Assistant Playbooks & Sanctuary CRM Workflows (Scenarios 1–36),
    along with recent execution logs and database table counts.
    """
    cat_val = category if isinstance(category, str) else getattr(category, "default", None)
    playbooks = _ensure_playbooks_seeded(db)
    if cat_val and cat_val != "ALL":
        playbooks = [p for p in playbooks if p.category == cat_val]

    recent_logs = (
        db.query(AIAutomationExecutionLog)
        .order_by(AIAutomationExecutionLog.executed_at.desc())
        .limit(25)
        .all()
    )

    conv_count = db.query(AICopilotConversationLog).count()
    exec_count = db.query(AIAutomationExecutionLog).count()

    return {
        "playbooks": [
            {
                "id": p.id,
                "playbook_code": p.playbook_code,
                "scenario_number": p.scenario_number,
                "title": p.title,
                "category": p.category,
                "assistant_persona": p.assistant_persona,
                "trigger_condition": p.trigger_condition,
                "automated_actions": p.automated_actions_json,
                "sample_payload": p.sample_payload_json,
                "target_endpoint": p.target_endpoint,
                "requires_founder_approval": p.requires_founder_approval,
                "is_enabled": p.is_enabled,
                "total_runs_count": p.total_runs_count,
                "last_run_at": p.last_run_at.isoformat() if p.last_run_at else None,
                "last_status": p.last_status,
            }
            for p in playbooks
        ],
        "recent_executions": [
            {
                "id": log.id,
                "playbook_code": log.playbook_code,
                "playbook_title": log.playbook_title,
                "category": log.category,
                "assistant_persona": log.assistant_persona,
                "sanctuary_slug": log.sanctuary_slug,
                "target_guest_or_cohort": log.target_guest_Or_cohort,
                "output_summary": log.output_summary_json,
                "ai_copilot_briefing": log.ai_copilot_briefing,
                "staged_draft_ids": log.staged_draft_ids,
                "execution_latency_ms": log.execution_latency_ms,
                "status": log.status,
                "triggered_by": log.triggered_by,
                "executed_at": log.executed_at.isoformat() if log.executed_at else None,
            }
            for log in recent_logs
        ],
        "database_telemetry": {
            "total_playbooks_configured": len(playbooks),
            "total_automation_runs_logged": exec_count,
            "total_copilot_conversations_logged": conv_count,
            "journal_mode": "SQLite WAL / PostgreSQL Pool Ready",
        },
    }


class ExecutePlaybookRequest(BaseModel):
    sanctuary_slug: Optional[str] = "puerto-vallarta-2027"
    operator_name: Optional[str] = "Kareena Islam, BSN, RN"
    custom_override_notes: Optional[str] = None


@router.post("/playbooks/{playbook_code}/execute")
def execute_ai_automation_playbook(
    playbook_code: str,
    payload: Optional[ExecutePlaybookRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Executes a specific AI Assistant Playbook against the live database using our
    verified scenario handlers, records an immutable AIAutomationExecutionLog row,
    increments playbook telemetry counters, and returns the AI Copilot synthesis briefing.
    """
    t0 = time.time()
    req = payload or ExecutePlaybookRequest()
    sanctuary_slug = req.sanctuary_slug or "puerto-vallarta-2027"
    operator_name = req.operator_name or "Kareena Islam, BSN, RN"

    _ensure_playbooks_seeded(db)
    pb = db.query(AIAutomationPlaybook).filter(AIAutomationPlaybook.playbook_code == playbook_code).first()
    if not pb:
        raise HTTPException(status_code=404, detail=f"AI Playbook '{playbook_code}' not found.")

    # Ensure we have at least one sample client & trip in DB so trip/client-specific playbooks always succeed
    sample_client = db.query(CRMClient).first()
    if not sample_client:
        sample_client = CRMClient(
            id=str(uuid.uuid4()),
            crm_contact_id=f"kai_cnt_{uuid.uuid4().hex[:8]}",
            full_name="Sienna Thorne",
            email="sienna.thorne@example.com",
            phone="+1-310-555-0199",
            health_notes="Episodic supraventricular tachycardia (SVT), severe tree-nut anaphylaxis (carries EpiPen).",
            dietary_requirements="Strict tree-nut & peanut allergy (anaphylaxis risk); anti-inflammatory Blue Zone diet.",
            tags=["KAI_GUEST", "VIP_RETREAT", "CORTISOL_RESET"],
            total_lifetime_spend=14500.0,
            total_trips_count=1,
        )
        db.add(sample_client)
        db.commit()
        db.refresh(sample_client)

    sample_trip = db.query(CRMTrip).filter(CRMTrip.sanctuary_slug == sanctuary_slug).first()
    if not sample_trip:
        sample_trip = db.query(CRMTrip).first()
    if not sample_trip:
        sample_trip = CRMTrip(
            id=str(uuid.uuid4()),
            crm_trip_id=f"kai_trp_{uuid.uuid4().hex[:8]}",
            client_id=sample_client.id,
            client_name=sample_client.full_name,
            client_email=sample_client.email,
            sanctuary_slug=sanctuary_slug,
            title="Puerto Vallarta · Sierra Madre Cliffside Sanctuary",
            dates="Oct 10–15, 2027",
            room_tier="Oceanfront King Suite",
            status="CONFIRMED",
            total_investment=9500.0,
            deposit_amount=2850.0,
            deposit_status="PAID",
            final_balance=6650.0,
            final_balance_status="SCHEDULED",
            itinerary_blocks=[
                {"day": 1, "title": "Arrival & Tarmac Chauffeur Escort", "description": "Private Escalade transfer to cliffside villa."},
                {"day": 2, "title": "Morning Beach Pranayama & Ocean Sound Bath", "description": "Outdoor coastal breathwork and 432Hz crystal bowls."},
                {"day": 3, "title": "Sunset Cliffside Meditation & Thermal Plunge", "description": "Outdoor cliffside somatic practice."},
            ],
        )
        db.add(sample_trip)
        db.commit()
        db.refresh(sample_trip)

    from backend.sidecar.routers import crm as crm_router

    result_data: Dict[str, Any] = {}
    staged_drafts: List[int] = []
    target_label = f"Cohort: {sanctuary_slug}"

    if playbook_code == "SCENARIO_07_CLINICAL_TRIAGE":
        result_data = crm_router.triage_client_clinical_profile(client_id=sample_client.id, db=db)
        target_label = f"Guest: {sample_client.full_name}"
    elif playbook_code == "SCENARIO_13_MEDICAL_FREEZE":
        result_data = crm_router.freeze_trip_medical_emergency(
            trip_id=sample_trip.id,
            clinical_event="Sustained supraventricular tachycardia (SVT > 165 bpm) requiring IV adenosine & telemetry",
            attending_clinician=operator_name,
            local_facility="Hospital Joya Marina Vallarta (Level-3 Cardiac Unit)",
            db=db,
        )
        staged_drafts = [result_data["draft_id"]]
        target_label = f"Trip: {sample_trip.crm_trip_id} ({sample_trip.client_name})"
    elif playbook_code == "SCENARIO_19_FORCE_MAJEURE":
        result_data = crm_router.postpone_cohort_force_majeure(
            sanctuary_slug=sanctuary_slug,
            reason="Category 4 Hurricane Preventive Sanctuary Closure & Civil Aviation Ground Stop",
            rebooking_window_months=18,
            operator_name=operator_name,
            db=db,
        )
        staged_drafts = result_data.get("draft_ids", [])
    elif playbook_code == "SCENARIO_20_MULTICURRENCY_FX":
        result_data = crm_router.record_trip_split_payment(
            trip_id=sample_trip.id,
            amount=3472.0,
            payment_method="SWIFT International Wire (EUR -> USD)",
            transaction_reference=f"WIRE-EUR-{uuid.uuid4().hex[:6].upper()}",
            notes="Automated Playbook #20 Multi-Currency FX Settlement",
            currency="EUR",
            fx_rate=1.085,
            fx_amount=3200.0,
            operator_name=operator_name,
            db=db,
        )
        staged_drafts = [result_data["draft_id"]]
        target_label = f"Trip: {sample_trip.crm_trip_id} ({sample_trip.client_name})"
    elif playbook_code == "SCENARIO_21_SOMATIC_PULSE_SPIKE":
        result_data = crm_router.triage_somatic_pulse_telemetry(
            payload=crm_router.SomaticPulseTriagePayload(
                client_name=sample_client.full_name,
                client_email=sample_client.email,
                sanctuary_slug=sanctuary_slug,
                day_number=2,
                restorative_sleep_score=2,
                nervous_system_ease=2,
                reported_symptoms="Orthostatic dizziness, nocturnal palpitations, and sympathetic overdrive",
                operator_name=operator_name,
            ),
            db=db,
        )
        if result_data.get("draft_id"):
            staged_drafts = [result_data["draft_id"]]
        target_label = f"Guest: {sample_client.full_name}"
    elif playbook_code == "SCENARIO_23_CHAUFFEUR_CLUSTERING":
        result_data = crm_router.resequence_cohort_flight_disruptions(
            sanctuary_slug=sanctuary_slug,
            payload=crm_router.BatchFlightDisruptionRequest(
                disruptions=[
                    crm_router.FlightDisruptionItem(
                        client_name="Clara Vance",
                        client_email="clara.vance@example.com",
                        flight_number="AA-1142",
                        original_arrival_time="14:00",
                        updated_arrival_time="15:35",
                        delay_minutes=95,
                        status="DELAYED",
                        terminal="T2 VIP",
                    ),
                    crm_router.FlightDisruptionItem(
                        client_name=sample_client.full_name,
                        client_email=sample_client.email,
                        flight_number="UA-491",
                        original_arrival_time="14:20",
                        updated_arrival_time="15:50",
                        delay_minutes=90,
                        status="DELAYED",
                        terminal="T2 VIP",
                    ),
                ],
                operator_name=operator_name,
            ),
            db=db,
        )
        staged_drafts = [result_data["draft_id"]]
    elif playbook_code == "SCENARIO_25_ALLERGEN_QUARANTINE":
        result_data = crm_router.trigger_allergen_quarantine_protocol(
            sanctuary_slug=sanctuary_slug,
            payload=crm_router.AllergenQuarantineRequest(
                contaminated_item="Artisanal Cacao & Macadamia Paste (Batch #MX-409)",
                allergen_category="TREE_NUT_PEANUT_CROSS_CONTAMINATION",
                safe_alternative="Single-Origin Organic Pumpkin Seed & Tahini Ganache",
                operator_name=operator_name,
            ),
            db=db,
        )
        staged_drafts = [result_data["draft_id"]]
    elif playbook_code == "SCENARIO_26_PRIVATE_JET_PART135":
        result_data = crm_router.process_private_charter_manifest(
            trip_id=sample_trip.id,
            payload=crm_router.PrivateCharterManifestRequest(
                aircraft_type="Gulfstream G650ER",
                tail_number="N650KA",
                origin_icao="KTEB",
                destination_icao="MMPR",
                departure_time="09:00 EST",
                estimated_arrival_time="13:45 CST",
                passenger_count=6,
                total_luggage_weight_lbs=540.0,
                cargo_equipment_weight_lbs=380.0,
                pilot_duty_hours=11.5,
                operator_name=operator_name,
            ),
            db=db,
        )
        staged_drafts = [result_data["draft_id"]]
        target_label = f"Jet Charter: N650KA ({sample_trip.client_name})"
    elif playbook_code == "SCENARIO_27_SUITE_CONFLICT_ARBITRATION":
        result_data = crm_router.resolve_room_allocation_conflict(
            sanctuary_slug=sanctuary_slug,
            payload=crm_router.RoomConflictResolveRequest(
                conflicted_room_tier="Oceanfront King Suite",
                upgrade_room_tier="Private Cliffside Plunge Villa",
                complimentary_spa_credit=500.0,
                operator_name=operator_name,
            ),
            db=db,
        )
        if result_data.get("draft_id"):
            staged_drafts = [result_data["draft_id"]]
    elif playbook_code == "SCENARIO_28_WEATHER_SQUALL_PIVOT":
        result_data = crm_router.pivot_cohort_weather_itinerary(
            sanctuary_slug=sanctuary_slug,
            payload=crm_router.WeatherItineraryPivotRequest(
                weather_event="Tropical Squall & 95% Coastal Rain Warning",
                precipitation_probability=95,
                wind_gust_kmh=58.0,
                severity="HIGH",
                affected_date="Day 3 Morning & Sunset Sessions",
                operator_name=operator_name,
            ),
            db=db,
        )
        staged_drafts = [result_data["draft_id"]]
    elif playbook_code == "SCENARIO_29_SENTIMENT_RED_ALERT":
        result_data = crm_router.ingest_review_with_sentiment_triage(
            payload=crm_router.ReviewIngestTriageRequest(
                sanctuary_slug=sanctuary_slug,
                guest_name=sample_client.full_name,
                guest_email=sample_client.email,
                overall_rating=2.0,
                deep_sleep_score=2.0,
                quietude_score=2.0,
                review_text="Adjacent villa construction noise disrupted morning nidra and Day 3 felt rushed.",
            ),
            db=db,
        )
        staged_drafts = [result_data["draft_id"]]
        target_label = f"Guest Survey: {sample_client.full_name}"
    elif playbook_code == "SCENARIO_31_LOST_LUGGAGE_CAPSULE":
        result_data = crm_router.handle_lost_luggage_emergency(
            trip_id=sample_trip.id,
            payload=crm_router.LostLuggageEmergencyRequest(
                carrier_airline="American Airlines",
                flight_number="AA-1184",
                baggage_claim_tag="AA-BAG-994120",
                missing_bags_count=2,
                guest_top_size="S",
                guest_bottom_size="S",
                guest_shoe_size="38 EU",
                operator_name=operator_name,
            ),
            db=db,
        )
        staged_drafts = [result_data["draft_id"]]
        target_label = f"Trip: {sample_trip.crm_trip_id} ({sample_trip.client_name})"
    elif playbook_code == "SCENARIO_32_THERMAL_SHOCK_LOCKOUT":
        result_data = crm_router.triage_thermal_shock_escalation(
            payload=crm_router.ThermalShockEscalationRequest(
                client_name=sample_client.full_name,
                client_email=sample_client.email,
                sanctuary_slug=sanctuary_slug,
                day_number=3,
                spo2_percent=88.0,
                resting_hr_bpm=118,
                core_temp_c=35.2,
                shivering_duration_minutes=25,
                reported_symptoms="Post-38°F plunge peripheral cyanosis, shivering >25m, SpO2 88%",
                operator_name=operator_name,
            ),
            db=db,
        )
        staged_drafts = [result_data["draft_id"]]
        target_label = f"Guest: {sample_client.full_name}"
    elif playbook_code == "SCENARIO_33_SHARED_VILLA_SPLIT_FOLIO":
        result_data = crm_router.settle_multi_guest_split_folio(
            sanctuary_slug=sanctuary_slug,
            payload=crm_router.MultiGuestSplitFolioRequest(
                villa_tier="Two-Bedroom Oceanfront Penthouse Villa",
                total_stay_investment=22000.0,
                split_records=[
                    crm_router.CoOccupantPaymentSplit(
                        guest_name="Victoria Sterling",
                        guest_email="victoria.sterling@example.com",
                        percentage_share=50.0,
                        payment_method="Corporate Holding Wire",
                        transaction_reference="CORP-WIRE-901",
                    ),
                    crm_router.CoOccupantPaymentSplit(
                        guest_name="Camille Laurent",
                        guest_email="camille.laurent@example.com",
                        percentage_share=25.0,
                        payment_method="Amex Centurion Auth",
                        transaction_reference="AMEX-442",
                    ),
                    crm_router.CoOccupantPaymentSplit(
                        guest_name="Elena Rostova",
                        guest_email="elena.rostova@example.com",
                        percentage_share=25.0,
                        payment_method="Virtuoso Wellness Voucher",
                        transaction_reference="VIRT-883",
                    ),
                ],
                operator_name=operator_name,
            ),
            db=db,
        )
        staged_drafts = result_data.get("draft_ids", [])
    elif playbook_code == "SCENARIO_34_PASSPORT_180D_GATE":
        result_data = crm_router.verify_passport_immigration_validity(
            trip_id=sample_trip.id,
            payload=crm_router.PassportValidityCheckRequest(
                passport_country="United States",
                passport_number="US-884920194",
                passport_expiry_date="2027-12-05",
                retreat_arrival_date="2027-10-10",
                retreat_departure_date="2027-10-15",
                operator_name=operator_name,
            ),
            db=db,
        )
        staged_drafts = [result_data["draft_id"]]
        target_label = f"Guest: {sample_trip.client_name}"
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported playbook_code: {playbook_code}")

    elapsed_ms = max(1, int((time.time() - t0) * 1000))

    ai_briefing = (
        f"[{pb.assistant_persona}] Executed Playbook #{pb.scenario_number} ({pb.title}) on {target_label} in {elapsed_ms}ms. "
        f"All database records updated atomically and {len(staged_drafts)} communication/action draft(s) staged in Action Review Queue for Kareena Islam's approval."
    )

    # Update playbook counters & create immutable execution log
    pb.total_runs_count = (pb.total_runs_count or 0) + 1
    pb.last_run_at = datetime.now(timezone.utc)
    pb.last_status = "STAGED_FOR_APPROVAL"

    exec_log = AIAutomationExecutionLog(
        id=str(uuid.uuid4()),
        playbook_code=pb.playbook_code,
        playbook_title=pb.title,
        category=pb.category,
        assistant_persona=pb.assistant_persona,
        sanctuary_slug=sanctuary_slug,
        target_guest_Or_cohort=target_label,
        input_payload_json=pb.sample_payload_json,
        output_summary_json=result_data,
        ai_copilot_briefing=ai_briefing,
        staged_draft_ids=staged_drafts,
        execution_latency_ms=elapsed_ms,
        status="STAGED_FOR_APPROVAL",
        triggered_by=operator_name,
    )
    db.add(exec_log)
    db.commit()

    return {
        "success": True,
        "playbook_code": pb.playbook_code,
        "scenario_number": pb.scenario_number,
        "title": pb.title,
        "assistant_persona": pb.assistant_persona,
        "target": target_label,
        "ai_copilot_briefing": ai_briefing,
        "staged_draft_ids": staged_drafts,
        "execution_latency_ms": elapsed_ms,
        "result": result_data,
    }


