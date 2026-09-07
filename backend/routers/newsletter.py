from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from backend.database import get_db
from backend.models import NewsletterSubscriber
from backend.schemas import NewsletterSubscribe, NewsletterResponse

router = APIRouter(prefix="/newsletter", tags=["Private Priority Circle"])


@router.post("/subscribe", response_model=NewsletterResponse, status_code=201)
def subscribe_to_circle(data: NewsletterSubscribe, db: Session = Depends(get_db)):
    """Add email to the private priority circle for confidential retreat cohort releases."""
    email_clean = str(data.email).strip().lower()
    existing = db.query(NewsletterSubscriber).filter(NewsletterSubscriber.email == email_clean).first()
    
    if not existing:
        new_sub = NewsletterSubscriber(
            email=email_clean,
            source=data.source or "footer",
            is_active=True
        )
        db.add(new_sub)
        db.commit()

    return NewsletterResponse(
        success=True,
        message="Thank you. You have been added to our private priority circle.",
        email=email_clean
    )


@router.get("/subscribers")
def list_subscribers(db: Session = Depends(get_db)):
    """Admin endpoint to view all active private circle subscribers."""
    return db.query(NewsletterSubscriber).filter(NewsletterSubscriber.is_active.is_(True)).all()
