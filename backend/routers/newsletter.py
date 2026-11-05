from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import NewsletterSubscriber, ActionDraft
from backend.schemas import NewsletterSubscribe, NewsletterResponse
from backend.dependencies.auth import get_current_admin

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

        # Stage ActionDraft for personalized priority circle welcome
        draft = ActionDraft(
            type="priority_circle_welcome",
            guest_name=email_clean,
            content=(
                f"Private Priority Circle Welcome: {email_clean}\n"
                f"Source: {data.source or 'website_footer'}\n\n"
                f"Draft Message:\n"
                f"Dear Friend,\n\n"
                f"Thank you for entering the KAI Private Priority Circle. As our intimate cohorts are strictly "
                f"limited to 12–14 guests, circle members receive first access to new retreat dates, confidential "
                f"villa buyout releases, and exclusive flight consultation blocks with Grand Travel & Cruise.\n\n"
                f"With warmth,\n"
                f"Kareena Islam, BSN, RN | Founder, KAI Wellness Retreats"
            ),
            status="pending_review"
        )
        db.add(draft)
        db.commit()

    return NewsletterResponse(
        success=True,
        message="Thank you. You have been added to our private priority circle.",
        email=email_clean
    )


@router.get("/subscribers", dependencies=[Depends(get_current_admin)])
def list_subscribers(db: Session = Depends(get_db)):
    """Admin endpoint to view all active private circle subscribers."""
    return db.query(NewsletterSubscriber).filter(NewsletterSubscriber.is_active.is_(True)).all()
