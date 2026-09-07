from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from datetime import datetime
from backend.database import Base


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    reference_code = Column(String(32), unique=True, index=True, nullable=False)
    retreat_id = Column(String(64), index=True, nullable=False)
    retreat_title = Column(String(255), nullable=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), index=True, nullable=False)
    phone = Column(String(64), nullable=False)
    room_preference = Column(String(64), nullable=False)
    movement_experience = Column(String(64), nullable=False)
    passport_valid = Column(String(64), nullable=False, default="yes-valid-6mo")
    health_notes = Column(Text, nullable=True)
    intentions = Column(Text, nullable=True)
    status = Column(String(32), default="pending_review", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class NewsletterSubscriber(Base):
    __tablename__ = "newsletter_subscribers"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    source = Column(String(64), default="footer", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class FlightConciergeRequest(Base):
    __tablename__ = "flight_concierge_requests"

    id = Column(Integer, primary_key=True, index=True)
    booking_reference = Column(String(32), index=True, nullable=True)
    guest_name = Column(String(255), nullable=False)
    email = Column(String(255), index=True, nullable=False)
    phone = Column(String(64), nullable=False)
    retreat_id = Column(String(64), nullable=True)
    departure_airport = Column(String(64), nullable=False)
    cabin_class = Column(String(64), default="economy", nullable=False)
    preferred_airline = Column(String(128), nullable=True)
    travel_dates_flexible = Column(Boolean, default=True, nullable=False)
    special_requests = Column(Text, nullable=True)
    status = Column(String(32), default="inquiry_received", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class CustomGroupInquiry(Base):
    __tablename__ = "custom_group_inquiries"

    id = Column(Integer, primary_key=True, index=True)
    organizer_name = Column(String(255), nullable=False)
    email = Column(String(255), index=True, nullable=False)
    phone = Column(String(64), nullable=False)
    group_size = Column(Integer, nullable=False)
    target_destination = Column(String(128), nullable=False)
    target_dates = Column(String(128), nullable=True)
    somatic_goals = Column(Text, nullable=True)
    status = Column(String(32), default="inquiry_received", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
