from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any

from backend.database import get_db
from backend.sidecar.models import StagedVoucherDiff
from backend.sidecar.schemas import (
    VoucherParseRequest,
    ManifestDiffRequest,
    ManifestDiffResponse
)
from backend.sidecar.services.reconciliation import (
    parse_voucher_text,
    audit_manifest_diff
)

router = APIRouter(prefix="/reconciliation", tags=["Tern Sidecar: Reconciliation & Diff Engine"])


@router.post("/parse-voucher")
def parse_voucher(payload: VoucherParseRequest):
    """
    Parses unstructured villa contracts or supplier vouchers
    for check-in dates, confirmation numbers, room tiers, and rates.
    """
    parsed = parse_voucher_text(
        document_text=payload.document_text,
        sanctuary_slug=payload.sanctuary_slug
    )
    return {
        "success": True,
        "document_name": payload.document_name,
        "parsed_data": parsed
    }


@router.post("/manifest-diff", response_model=ManifestDiffResponse)
def run_manifest_diff(
    payload: ManifestDiffRequest,
    db: Session = Depends(get_db)
):
    """
    Audits external ground operator manifests against Tern CRM staging records.
    Uses RapidFuzz similarity matching & Polars validation.
    Strictly flags capacity violations beyond 12–14 guest limits and transfer mismatches.
    """
    diff_record = audit_manifest_diff(
        db=db,
        sanctuary_slug=payload.sanctuary_slug,
        external_guest_records=payload.external_guest_records,
        document_name=payload.diff_document_name
    )
    return diff_record


@router.get("/diffs", response_model=List[ManifestDiffResponse])
def list_manifest_diffs(
    sanctuary_slug: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """List staged manifest diffs and reconciliation audit logs."""
    query = db.query(StagedVoucherDiff)
    if sanctuary_slug:
        query = query.filter(StagedVoucherDiff.sanctuary_slug == sanctuary_slug)
    if status:
        query = query.filter(StagedVoucherDiff.status == status)
    
    return query.order_by(StagedVoucherDiff.created_at.desc()).all()


@router.post("/diffs/{diff_id}/resolve")
def resolve_manifest_diff(
    diff_id: str,
    operator_name: str = "Kareena Islam",
    db: Session = Depends(get_db)
):
    """1-Click Operator resolution of an audited manifest diff."""
    diff = db.query(StagedVoucherDiff).filter(StagedVoucherDiff.id == diff_id).first()
    if not diff:
        raise HTTPException(status_code=404, detail="Manifest diff not found")

    diff.status = "RESOLVED"
    diff.reviewed_by = operator_name
    db.commit()
    db.refresh(diff)

    return {
        "success": True,
        "message": f"Manifest diff for {diff.sanctuary_slug} marked as RESOLVED by {operator_name}.",
        "diff_id": diff.id,
        "status": diff.status
    }
