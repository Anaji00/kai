import logging
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.sidecar.schemas import (
    VendorSupplierCreateRequest,
    VendorSupplierUpdateRequest,
    VendorSupplierResponse
)
from backend.sidecar.services.vendor_service import (
    list_vendors,
    get_vendor,
    create_vendor,
    update_vendor,
    delete_vendor,
    invalidate_vendor_cache
)
from backend.sidecar.services.tern_client import tern_client

logger = logging.getLogger("kai_vendors_router")

router = APIRouter(prefix="/vendors", tags=["Tern Preferred Suppliers"])


@router.get("", response_model=List[VendorSupplierResponse])
def get_vendors(
    sanctuary_slug: Optional[str] = Query(None, description="Sanctuary slug filter (nosara, amalfi, bali, riviera-maya, all)"),
    category: Optional[str] = Query(None, description="Category filter (e.g. TRANSPORTATION_CHAUFFEUR, ORGANIC_CATERING)"),
    db: Session = Depends(get_db)
):
    """
    Retrieves preferred retreat suppliers aligned with Tern Back Office.
    Uses tiered caching (in-memory TTL cache + SQLite dual-storage persistence).
    """
    return list_vendors(db=db, sanctuary_slug=sanctuary_slug, category=category)


@router.get("/{vendor_id}", response_model=VendorSupplierResponse)
def get_single_vendor(
    vendor_id: str,
    db: Session = Depends(get_db)
):
    """
    Retrieves a single vendor supplier record.
    """
    vendor = get_vendor(db, vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor supplier record not found.")
    return vendor


@router.post("", response_model=VendorSupplierResponse)
def add_vendor(
    req: VendorSupplierCreateRequest,
    db: Session = Depends(get_db)
):
    """
    Registers a new vendor/supplier in SQLite local storage AND syncs to Tern CRM Back Office.
    """
    try:
        new_vendor = create_vendor(db=db, data=req.model_dump())
        return new_vendor
    except Exception as e:
        logger.error(f"Error creating vendor: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to register supplier: {str(e)}")


@router.put("/{vendor_id}", response_model=VendorSupplierResponse)
def modify_vendor(
    vendor_id: str,
    req: VendorSupplierUpdateRequest,
    db: Session = Depends(get_db)
):
    """
    Updates vendor details, contract terms, or commission rates.
    """
    updated = update_vendor(db=db, vendor_id=vendor_id, data=req.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Vendor supplier record not found.")
    return updated


@router.delete("/{vendor_id}")
def remove_vendor(
    vendor_id: str,
    db: Session = Depends(get_db)
):
    """
    Archives a vendor supplier record.
    """
    success = delete_vendor(db=db, vendor_id=vendor_id)
    if not success:
        raise HTTPException(status_code=404, detail="Vendor supplier record not found.")
    return {"success": True, "vendor_id": vendor_id, "status": "INACTIVE"}


@router.post("/{vendor_id}/sync-tern", response_model=VendorSupplierResponse)
def force_sync_vendor_to_tern(
    vendor_id: str,
    db: Session = Depends(get_db)
):
    """
    Forces an explicit re-sync of a supplier with Tern CRM Back Office,
    re-generating deep links and updating last_synced_at.
    """
    vendor = get_vendor(db, vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor supplier record not found.")

    sync_res = tern_client.sync_supplier_to_tern(
        name=vendor.name,
        category=vendor.category,
        sanctuary_slug=vendor.sanctuary_slug,
        contact_name=vendor.contact_name,
        email=vendor.email,
        phone=vendor.phone,
        website=vendor.website,
        commission_rate=vendor.commission_rate,
        commission_type=vendor.commission_type,
        payment_terms=vendor.payment_terms,
        lead_time_days=vendor.lead_time_days,
        preferred_tier=vendor.preferred_tier,
        service_description=vendor.service_description,
        clinical_relevance=vendor.clinical_relevance,
        operator_name="Kareena Islam"
    )

    vendor.tern_supplier_id = sync_res["tern_supplier_id"]
    vendor.tern_deep_link = sync_res["tern_deep_link"]
    vendor.tern_sync_status = "SYNCED"
    vendor.last_synced_at = datetime.now(timezone.utc)
    vendor.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(vendor)
    invalidate_vendor_cache()

    return vendor
