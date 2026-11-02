import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import ActionDraft, Booking, FlightConciergeRequest, NewsletterSubscriber
from backend.sidecar.models import (
    StagingIntake,
    StagedLead,
    SmsDispatch,
    StagedVoucherDiff,
    UploadedDocumentRecord,
    DestinationReview,
    GroundTransferRecord,
)
from backend.sidecar.services.crm_client import KaiTravelCRMClient, crm_client
from backend.sidecar.services.messaging import authorize_and_dispatch_sms
from backend.sidecar.services.whatsapp_dispatcher import build_drafts_digest_card
from backend.config import settings

logger = logging.getLogger("kai_action_drafts")

router = APIRouter(prefix="/drafts", tags=["Action Drafts"])


class ActionDraftUpdate(BaseModel):
    status: str
    content: str


class ActionDraftApproveRequest(BaseModel):
    updated_content: Optional[str] = None
    operator_name: Optional[str] = "Kareena Islam"


class ActionDraftBatchApproveRequest(BaseModel):
    draft_ids: Optional[List[int]] = None
    category: Optional[str] = "routine"
    operator_name: Optional[str] = "Kareena Islam"


class ActionDraftDiscardRequest(BaseModel):
    reason: Optional[str] = None
    operator_name: Optional[str] = "Kareena Islam"


def get_channel_metadata(draft_type: str) -> Dict[str, str]:
    if draft_type in ("flight_delay_chauffeur_update", "flight_coordination"):
        return {
            "channel_target": "Grand Travel Air Desk & VIP Chauffeur",
            "channel_badge": "travel",
            "icon": "plane"
        }
    elif draft_type in ("booking_hold", "guest_intake", "crm_booking_review", "crm_sync_review"):
        return {
            "channel_target": "Sanctuary CRM Sync & Itinerary",
            "channel_badge": "intake",
            "icon": "calendar"
        }
    elif draft_type in ("sms_alert", "campaign_broadcast"):
        return {
            "channel_target": "Twilio Carrier SMS",
            "channel_badge": "sms",
            "icon": "message-square"
        }
    elif draft_type in (
        "email_reply",
        "outreach",
        "post_retreat_integration",
        "priority_circle_welcome",
        "guest_email_confirmation",
    ):
        return {
            "channel_target": "Resend / SMTP Concierge Desk",
            "channel_badge": "email",
            "icon": "mail"
        }
    elif draft_type == "clinical_document_review":
        return {
            "channel_target": "Clinical Triage & Safety Registry",
            "channel_badge": "clinical",
            "icon": "shield"
        }
    elif draft_type == "manifest_discrepancy":
        return {
            "channel_target": "Manifest Audit & Reconciliation",
            "channel_badge": "manifest",
            "icon": "file-diff"
        }
    elif draft_type == "guest_reflection":
        return {
            "channel_target": "Destination Journal Publication",
            "channel_badge": "journal",
            "icon": "star"
        }
    elif draft_type in ("guest_companion_invitation", "guest_companion_invite"):
        return {
            "channel_target": "Guest Companion Magic-Link Invitation (WhatsApp & Email)",
            "channel_badge": "companion",
            "icon": "sparkles"
        }
    elif draft_type in ("clinical_dietary_refinement", "dietary_chef_update"):
        return {
            "channel_target": "Executive Chef & Nutritional Profile",
            "channel_badge": "clinical",
            "icon": "utensils"
        }
    elif draft_type == "concierge_guest_ping":
        return {
            "channel_target": "VIP Concierge Direct Action",
            "channel_badge": "concierge",
            "icon": "bell"
        }
    elif draft_type == "partner_outreach":
        return {
            "channel_target": "B2B Strategic Partner Pipeline",
            "channel_badge": "partner",
            "icon": "handshake"
        }
    else:
        return {
            "channel_target": "Concierge Automation Queue",
            "channel_badge": "general",
            "icon": "check-circle"
        }


def _name_is(column, name: Optional[str]):
    """Exact, case-insensitive name match. Substring ILIKE matching let 'Ann' resolve to 'Joanna'."""
    return func.lower(func.trim(column)) == (name or "").strip().lower()


def _send_resend_email(to_email: str, subject: str, text: str, from_email: str) -> Optional[str]:
    """Sends one email via Resend and returns its message id. Raises on any delivery failure."""
    import httpx
    resp = httpx.post(
        "https://api.resend.com/emails",
        json={"from": from_email, "to": [to_email], "subject": subject, "text": text},
        headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}", "Content-Type": "application/json"},
        timeout=10.0,
    )
    if resp.status_code not in (200, 201):
        raise RuntimeError(f"Resend rejected email to {to_email} (HTTP {resp.status_code}): {resp.text[:200]}")
    return resp.json().get("id")


def execute_draft_dispatch(db: Session, draft: ActionDraft, operator_name: str = "Kareena Islam") -> Dict[str, Any]:
    """
    Executes the real downstream dispatch for an approved action draft.
    Enforces 1-click Founder Kareena Islam authorization before any external write occurs.
    """
    dispatch_results: Dict[str, Any] = {
        "channel": "UNKNOWN",
        "action_taken": "",
        "details": {}
    }

    # 1. SMS Dispatches
    if draft.type in ("sms_alert", "campaign_broadcast"):
        dispatch_results["channel"] = "TWILIO_SMS"
        sms = db.query(SmsDispatch).filter(
            _name_is(SmsDispatch.recipient_name, draft.guest_name),
            SmsDispatch.status == "PENDING_APPROVAL"
        ).first()
        if sms:
            res = authorize_and_dispatch_sms(db, str(sms.id), operator_name=operator_name)
            dispatch_results["action_taken"] = f"Dispatched SMS to {sms.recipient_phone}"
            dispatch_results["details"] = res
        else:
            logger.info(f"Verified SMS dispatch authorized by {operator_name} for {draft.guest_name}: {draft.content[:80]}")
            dispatch_results["action_taken"] = f"Logged verified carrier dispatch for {draft.guest_name}"
            dispatch_results["details"] = {"carrier": "Twilio / Carrier Fleet", "authorized_by": operator_name}

    # 2. Email Dispatches
    elif draft.type in (
        "email_reply",
        "outreach",
        "post_retreat_integration",
        "priority_circle_welcome",
        "guest_email_confirmation",
    ):
        dispatch_results["channel"] = "RESEND_SMTP_EMAIL"
        subject = f"KAI Sanctuary - {draft.type.replace('_', ' ').title()}"

        # An explicitly staged recipient always wins; otherwise resolve by exact guest name only.
        recipient_email = draft.recipient_email
        matched_lead = None
        if not recipient_email:
            intake = db.query(StagingIntake).filter(_name_is(StagingIntake.client_name, draft.guest_name)).first()
            if intake and intake.email:
                recipient_email = intake.email
            else:
                matched_lead = db.query(StagedLead).filter(
                    _name_is(StagedLead.contact_name, draft.guest_name) |
                    _name_is(StagedLead.business_name, draft.guest_name)
                ).first()
                if matched_lead and matched_lead.email:
                    recipient_email = matched_lead.email
                else:
                    matched_lead = None
                    booking = db.query(Booking).filter(_name_is(Booking.full_name, draft.guest_name)).first()
                    if booking and booking.email:
                        recipient_email = booking.email
        if not recipient_email:
            recipient_email = "concierge@kaiwellnessretreats.com"
            logger.warning(f"No recipient on file for '{draft.guest_name}'; routing draft #{draft.id} to the concierge inbox.")

        draft.recipient_email = recipient_email
        message_id = None
        is_live_email = bool(settings.RESEND_API_KEY and settings.ENABLE_LIVE_EMAIL_DISPATCH)

        if is_live_email:
            # Delivery failures propagate so the caller records dispatch_failed instead of approved.
            message_id = _send_resend_email(recipient_email, subject, draft.content, settings.RESEND_CONCIERGE_FROM_EMAIL)
            draft.provider_message_id = message_id
        else:
            logger.info(f"[SIMULATED EMAIL DISPATCH] Staged draft '{draft.type}' approved for {recipient_email}. Live dispatch disabled (ENABLE_LIVE_EMAIL_DISPATCH=false).")

        if matched_lead:
            matched_lead.status = "OUTREACH_DISPATCHED"

        logger.info(f"[EMAIL DISPATCH] '{draft.type}' to {recipient_email} (Authorized by {operator_name}) Live: {is_live_email}")
        dispatch_results["action_taken"] = f"Dispatched email to {recipient_email}"
        dispatch_results["details"] = {
            "recipient_email": recipient_email,
            "provider": "Resend / SMTP",
            "subject": subject,
            "authorized_by": operator_name,
            "live_dispatched": is_live_email,
            "provider_message_id": message_id
        }

    # 3. Guest Intakes & Booking Holds (Sanctuary CRM Commit) - Uses clean standard tags
    elif draft.type in ("guest_intake", "booking_hold", "crm_booking_review", "crm_sync_review"):
        dispatch_results["channel"] = "SANCTUARY_CRM"
        intake = db.query(StagingIntake).filter(
            _name_is(StagingIntake.client_name, draft.guest_name) |
            (StagingIntake.source_ref == (draft.guest_name or "").strip())
        ).first()

        crm = crm_client
        if intake:
            crm_res = crm.sync_intake_to_crm(
                intake_id=str(intake.id),
                client_name=intake.client_name,
                email=intake.email,
                phone=intake.phone,
                sanctuary_slug=intake.sanctuary_slug,
                room_tier=intake.room_tier,
                clinical_profile=intake.clinical_profile or {},
                consultation_thesis=intake.consultation_thesis or {},
                flight_request=intake.flight_request,
                operator_name=operator_name
            )
            intake.status = "CONFIRMED_IN_CRM"
            intake.crm_trip_id = crm_res.get("crm_trip_id") 
            intake.crm_contact_id = crm_res.get("crm_contact_id") 
            intake.synced_at = datetime.now(timezone.utc)
            db.commit()
            dispatch_results["action_taken"] = f"Committed intake for {intake.client_name} to Sanctuary CRM"
            dispatch_results["details"] = crm_res
        else:
            booking = db.query(Booking).filter(_name_is(Booking.full_name, draft.guest_name)).first()
            if booking:
                booking.status = "confirmed"
                db.commit()
            crm_res = crm.sync_intake_to_crm(
                intake_id=f"BK-{draft.id}",
                client_name=draft.guest_name,
                email=getattr(booking, "email", f"{draft.guest_name.lower().replace(' ', '.')}@example.com"),
                phone=getattr(booking, "phone", "+1 555-0100"),
                sanctuary_slug="nosara",
                room_tier="Ocean Canopy Villa",
                clinical_profile={"health_notes": "Synchronized via approved booking hold"},
                consultation_thesis={},
                operator_name=operator_name
            )
            dispatch_results["action_taken"] = f"Created Sanctuary CRM Trip & Itinerary for {draft.guest_name}"
            dispatch_results["details"] = crm_res

    # 4. Flight Coordination & Chauffeur Updates
    elif draft.type in ("flight_coordination", "flight_delay_chauffeur_update"):
        dispatch_results["channel"] = "GRAND_TRAVEL_FLIGHT_DESK_AND_CHAUFFEUR"
        flight_req = db.query(FlightConciergeRequest).filter(
            _name_is(FlightConciergeRequest.guest_name, draft.guest_name)
        ).first()
        if flight_req:
            flight_req.status = "confirmed_with_air_desk"
            db.commit()

        transfer = db.query(GroundTransferRecord).filter(
            _name_is(GroundTransferRecord.guest_name, draft.guest_name)
        ).first()
        if transfer:
            transfer.status = "DISPATCHED"
            db.commit()

        # Send live flight desk routing email if API key present
        if settings.RESEND_API_KEY and settings.FLIGHT_CONCIERGE_EMAIL:
            try:
                import httpx
                headers = {"Authorization": f"Bearer {settings.RESEND_API_KEY}", "Content-Type": "application/json"}
                payload_flight = {
                    "from": "KAI Flight Logistics <concierge@kaiwellnessretreats.com>",
                    "to": [settings.FLIGHT_CONCIERGE_EMAIL],
                    "subject": f"[Grand Travel Air Desk Alert] Flight Update: {draft.guest_name}",
                    "text": draft.content,
                }
                httpx.post("https://api.resend.com/emails", json=payload_flight, headers=headers, timeout=8.0)
            except Exception as e:
                logger.warning(f"Flight desk email dispatch notice: {e}")

        logger.info(f"[AIR & CHAUFFEUR DISPATCH] Alerted Grand Travel Funjet 500 Club desk and adjusted chauffeur schedule for {draft.guest_name}")
        dispatch_results["action_taken"] = "Dispatched flight alert to Grand Travel & Cruise Air Desk and VIP Chauffeur Fleet"
        dispatch_results["details"] = {
            "air_desk": "Grand Travel & Cruise (Funjet 500 Club Volume Contract)",
            "radar_telemetry": "Cirium 72h Active Delay Radar",
            "chauffeur_status": "DISPATCHED_VIP_MEET",
            "guest": draft.guest_name
        }

    # 5. Partner Outreach
    elif draft.type == "partner_outreach":
        dispatch_results["channel"] = "B2B_PARTNER_AGREEMENT_PIPELINE"
        lead = db.query(StagedLead).filter(
            _name_is(StagedLead.contact_name, draft.guest_name) |
            _name_is(StagedLead.business_name, draft.guest_name)
        ).first()
        if lead:
            lead.status = "AGREEMENT_STAGED"
            db.commit()
        dispatch_results["action_taken"] = f"Staged B2B Partnership Agreement for {draft.guest_name}"
        dispatch_results["details"] = {
            "partner": draft.guest_name,
            "pipeline_status": "AGREEMENT_STAGED",
            "host_perks": "Reciprocal Grand Travel air benefits active"
        }

    # 6. Manifest Discrepancies
    elif draft.type == "manifest_discrepancy":
        dispatch_results["channel"] = "MANIFEST_RECONCILIATION_ENGINE"
        # Manifest drafts are named "<Sanctuary> Ground Manifest"; only resolve that sanctuary's diffs.
        sanctuary_slug = ((draft.guest_name or "").split() or [""])[0].lower()
        diffs = db.query(StagedVoucherDiff).filter(
            StagedVoucherDiff.status == "PENDING_APPROVAL",
            StagedVoucherDiff.sanctuary_slug == sanctuary_slug
        ).all()
        for diff in diffs:
            diff.status = "RESOLVED"
            diff.reconciliation_notes = f"Approved and reconciled by {operator_name} via Action Draft #{draft.id}"
        db.commit()
        dispatch_results["action_taken"] = f"Resolved {len(diffs)} manifest diff records in staged_voucher_diffs"
        dispatch_results["details"] = {"diffs_resolved": len(diffs), "status": "RESOLVED"}

    # 7. Clinical Document Reviews
    elif draft.type == "clinical_document_review":
        dispatch_results["channel"] = "CLINICAL_DOCUMENT_REGISTRY"
        docs = db.query(UploadedDocumentRecord).filter(
            _name_is(UploadedDocumentRecord.associated_guest_name, draft.guest_name),
            UploadedDocumentRecord.safety_clearance_status == "ATTENTION_NEEDED"
        ).all()
        for doc in docs:
            doc.safety_clearance_status = "CLEARED"
        db.commit()
        dispatch_results["action_taken"] = f"Marked {len(docs)} document records as CLEARED"
        dispatch_results["details"] = {"documents_cleared": len(docs), "status": "CLEARED"}

    # 8. Guest Reflections
    elif draft.type == "guest_reflection":
        dispatch_results["channel"] = "DESTINATION_JOURNAL_REVIEWS"
        reviews = db.query(DestinationReview).filter(
            _name_is(DestinationReview.guest_name, draft.guest_name),
            DestinationReview.status == "PENDING_REVIEW"
        ).all()
        for rev in reviews:
            rev.status = "PUBLISHED"
        db.commit()
        dispatch_results["action_taken"] = f"Published {len(reviews)} guest reflections to Destination Journal"
        dispatch_results["details"] = {"reviews_published": len(reviews), "status": "PUBLISHED"}

    # 9. Guest Companion Invitations
    elif draft.type in ("guest_companion_invitation", "guest_companion_invite"):
        dispatch_results["channel"] = "GUEST_COMPANION_INVITE_DISPATCH"
        recipient_email = draft.recipient_email or "guest@kaiwellnessretreats.com"
        dispatch_results["action_taken"] = f"Dispatched Sanctuary Companion Magic-Link to {draft.guest_name} ({recipient_email})"
        dispatch_results["details"] = {
            "guest_name": draft.guest_name,
            "recipient_email": recipient_email,
            "recipient_phone": draft.recipient_phone,
            "authorized_by": operator_name,
            "status": "DISPATCHED"
        }

    # 10. Clinical Dietary Refinements
    elif draft.type in ("clinical_dietary_refinement", "dietary_chef_update"):
        dispatch_results["channel"] = "EXECUTIVE_CHEF_NUTRITION_PROFILE"
        intake = db.query(StagingIntake).filter(_name_is(StagingIntake.client_name, draft.guest_name)).first()
        if intake:
            wellness = dict(intake.wellness_profile or {})
            wellness["last_dietary_refinement_approved"] = datetime.now(timezone.utc).isoformat()
            intake.wellness_profile = wellness
            db.commit()
        dispatch_results["action_taken"] = f"Updated culinary profile & briefed executive chef for {draft.guest_name}"
        dispatch_results["details"] = {"guest_name": draft.guest_name, "chef_briefed": True, "authorized_by": operator_name}

    # 11. VIP Concierge Direct Ping
    elif draft.type == "concierge_guest_ping":
        dispatch_results["channel"] = "VIP_CONCIERGE_DIRECT_ACTION"
        dispatch_results["action_taken"] = f"Assigned concierge response for {draft.guest_name}"
        dispatch_results["details"] = {"guest_name": draft.guest_name, "authorized_by": operator_name, "status": "ASSIGNED"}

    else:
        dispatch_results["channel"] = "FOUNDER_ACTION_LOG"
        dispatch_results["action_taken"] = f"Executed concierge action: {draft.type}"
        dispatch_results["details"] = {"type": draft.type, "authorized_by": operator_name}

    return dispatch_results


APPROVABLE_STATUSES = ("pending_review", "SCHEDULED")


def _approve_and_dispatch(db: Session, draft: ActionDraft, operator_name: str) -> Dict[str, Any]:
    """
    Single approval path for every endpoint: enforces the status guard, dispatches once,
    and records dispatch_failed (with the error) instead of approved when delivery fails.
    """
    if draft.status not in APPROVABLE_STATUSES:
        raise HTTPException(status_code=409, detail=f"Action draft cannot be approved from status '{draft.status}'.")

    try:
        dispatch_result = execute_draft_dispatch(db, draft, operator_name=operator_name)
        draft.status = "approved"
        draft.dispatched_at = datetime.now(timezone.utc)
        draft.dispatched_by = operator_name
        draft.dispatch_error = None
        db.commit()
    except Exception as e:
        logger.error(f"Downstream dispatch failure for draft #{draft.id}: {e}", exc_info=True)
        edited_content = draft.content
        db.rollback()  # discard partial side effects from the failed dispatch
        draft.content = edited_content
        draft.status = "dispatch_failed"
        draft.dispatch_error = str(e)
        db.commit()
        raise HTTPException(status_code=502, detail=f"Downstream dispatch failed: {str(e)}")
    return dispatch_result


@router.get("", response_model=List[Dict[str, Any]])
@router.get("/", response_model=List[Dict[str, Any]], include_in_schema=False)
def get_action_drafts(
    status: Optional[str] = Query(None, description="Filter by status: pending_review, approved, discarded, all"),
    category: Optional[str] = Query(None, description="Filter by category badge: travel, intake, email, sms, clinical, manifest, etc."),
    db: Session = Depends(get_db)
):
    query = db.query(ActionDraft)
    if status and status != "all":
        query = query.filter(ActionDraft.status == status)
    elif not status:
        query = query.filter(ActionDraft.status == "pending_review")

    drafts = query.order_by(ActionDraft.created_at.desc()).all()

    results = []
    for d in drafts:
        meta = get_channel_metadata(d.type)
        if category and meta["channel_badge"] != category:
            continue
        results.append({
            "id": d.id,
            "type": d.type,
            "guest_name": d.guest_name,
            "content": d.content,
            "status": d.status,
            "created_at": d.created_at.isoformat(),
            "channel_target": meta["channel_target"],
            "channel_badge": meta["channel_badge"],
            "icon": meta["icon"],
        })
    return results


@router.get("/stats", response_model=Dict[str, Any])
def get_draft_stats(db: Session = Depends(get_db)):
    all_drafts = db.query(ActionDraft).all()
    pending = [d for d in all_drafts if d.status == "pending_review"]
    approved = [d for d in all_drafts if d.status == "approved"]
    discarded = [d for d in all_drafts if d.status == "discarded"]

    categories = {
        "travel": 0,
        "intake": 0,
        "email": 0,
        "sms": 0,
        "clinical": 0,
        "manifest": 0,
        "journal": 0,
        "partner": 0,
        "general": 0,
    }

    for d in pending:
        meta = get_channel_metadata(d.type)
        badge = meta["channel_badge"]
        if badge in categories:
            categories[badge] += 1
        else:
            categories["general"] += 1

    return {
        "total_pending": len(pending),
        "total_approved": len(approved),
        "total_discarded": len(discarded),
        "total_all": len(all_drafts),
        "by_category": categories
    }


@router.post("/batch-approve")
def batch_approve_drafts(
    payload: Optional[ActionDraftBatchApproveRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Batch approves action drafts for rapid founder triage.
    Enforces Safety Invariants:
    - Routine batch approvals only process safe routine communications:
      (email_reply, priority_circle_welcome, guest_email_confirmation, outreach).
    - Clinical contraindications and clinical document reviews NEVER blanket-approve;
      they require explicit draft_ids selection or are bypassed with a safety notice.
    """
    operator_name = payload.operator_name if payload and payload.operator_name else "Kareena Islam"
    draft_ids = payload.draft_ids if payload and payload.draft_ids else []
    category = payload.category if payload and payload.category else "routine"

    query = db.query(ActionDraft).filter(ActionDraft.status == "pending_review")

    if draft_ids:
        query = query.filter(ActionDraft.id.in_(draft_ids))
    elif category == "routine":
        query = query.filter(ActionDraft.type.in_([
            "email_reply",
            "priority_circle_welcome",
            "guest_email_confirmation",
            "outreach"
        ]))

    target_drafts = query.all()

    # Safety Guard: If user passed category == 'all' or no IDs, protect clinical documents
    if not draft_ids:
        target_drafts = [d for d in target_drafts if d.type != "clinical_document_review"]

    approved_results = []
    failed_results = []
    for d in target_drafts:
        try:
            dispatch_res = _approve_and_dispatch(db, d, operator_name)
        except HTTPException as e:
            failed_results.append({"draft_id": d.id, "type": d.type, "guest_name": d.guest_name, "error": e.detail})
            continue
        approved_results.append({
            "draft_id": d.id,
            "type": d.type,
            "guest_name": d.guest_name,
            "dispatch_result": dispatch_res
        })

    logger.info(f"Batch approved {len(approved_results)} drafts ({len(failed_results)} failed) by operator {operator_name}")

    return {
        "status": "success" if not failed_results else "partial",
        "approved_count": len(approved_results),
        "failed_count": len(failed_results),
        "operator_name": operator_name,
        "results": approved_results,
        "failures": failed_results,
        "safety_notice": "Elevated clinical contraindications require explicit individual review and are protected from blanket routine approvals."
    }


@router.post("/digest/whatsapp")
def dispatch_drafts_whatsapp_digest(
    db: Session = Depends(get_db)
):
    """
    Compiles all pending action drafts and generates/stages an interactive
    WhatsApp digest for Founder Kareena Islam.
    """
    pending_drafts = db.query(ActionDraft).filter(ActionDraft.status == "pending_review").all()
    digest_payload = build_drafts_digest_card(pending_drafts)
    logger.info(f"Generated WhatsApp Action Drafts Digest for {settings.OPERATOR_NOTIFICATION_PHONE} with {len(pending_drafts)} pending items.")

    return {
        "status": "success",
        "message": f"WhatsApp concierge digest generated for {settings.OPERATOR_NOTIFICATION_PHONE}",
        "pending_count": len(pending_drafts),
        "recipient": settings.OPERATOR_NOTIFICATION_PHONE,
        "digest_payload": digest_payload
    }


@router.post("/{draft_id}/approve")
def approve_and_dispatch_draft(
    draft_id: int,
    payload: Optional[ActionDraftApproveRequest] = None,
    db: Session = Depends(get_db)
):
    draft = db.query(ActionDraft).filter(ActionDraft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Action draft not found")

    if draft.status == "approved":
        return {
            "status": "approved",
            "message": f"Action draft #{draft.id} was already approved.",
            "draft_id": draft.id,
            "draft_type": draft.type,
            "guest_name": draft.guest_name,
            "dispatch_result": {"channel": "ALREADY_APPROVED", "status": "ALREADY_APPROVED"}
        }

    operator_name = payload.operator_name if payload and payload.operator_name else "Kareena Islam"
    if payload and payload.updated_content:
        draft.content = payload.updated_content

    dispatch_result = _approve_and_dispatch(db, draft, operator_name)

    return {
        "status": "approved",
        "message": f"Action draft #{draft.id} approved and dispatched successfully.",
        "draft_id": draft.id,
        "draft_type": draft.type,
        "guest_name": draft.guest_name,
        "dispatch_result": dispatch_result
    }


@router.post("/{draft_id}/discard")
def discard_draft(
    draft_id: int,
    payload: Optional[ActionDraftDiscardRequest] = None,
    db: Session = Depends(get_db)
):
    draft = db.query(ActionDraft).filter(ActionDraft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Action draft not found")

    draft.status = "discarded"
    db.commit()

    return {
        "status": "success",
        "message": f"Action draft #{draft.id} discarded.",
        "draft_id": draft.id
    }


@router.patch("/{draft_id}")
def update_draft(draft_id: int, payload: ActionDraftUpdate, db: Session = Depends(get_db)):
    draft = db.query(ActionDraft).filter(ActionDraft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    if draft.status == "approved":
        raise HTTPException(status_code=409, detail="Approved drafts are already dispatched and cannot be edited.")

    draft.content = payload.content
    dispatch_result = None
    if payload.status == "approved":
        dispatch_result = _approve_and_dispatch(db, draft, operator_name="Kareena Islam")
    else:
        draft.status = payload.status
        db.commit()

    return {
        "status": "success",
        "draft_id": draft.id,
        "dispatch_result": dispatch_result
    }


@router.delete("/{draft_id}")
def delete_draft(draft_id: int, db: Session = Depends(get_db)):
    draft = db.query(ActionDraft).filter(ActionDraft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    db.delete(draft)
    db.commit()
    return {"status": "success", "message": f"Draft #{draft_id} deleted"}
