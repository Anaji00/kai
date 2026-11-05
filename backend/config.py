from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import os


class Settings(BaseSettings):
    PROJECT_NAME: str = "KAI Wellness Retreats API"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # Admin Authentication
    # First operator, created at startup when none exists. Add more with backend/create_operator.py.
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "admin@kaiwellnessretreats.com")
    ADMIN_FULL_NAME: str = os.getenv("ADMIN_FULL_NAME", "KAI Administrator")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "kai_admin_2026")
    ENABLE_DEMO_AUTH: bool = os.getenv("ENABLE_DEMO_AUTH", "true").lower() in ("true", "1", "yes")
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./kai_sanctuary.db")
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3536",
        "http://127.0.0.1:3536",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://kaiwellnessretreats.com",
        "https://www.kaiwellnessretreats.com",
    ]
    
    # Email & Notifications (Dual Founder Routing: Kareena Islam & Armaan Islam)
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    RESEND_FROM_EMAIL: str = os.getenv("RESEND_FROM_EMAIL", "KAI Sanctuary Reservations <inquiries@kaiwellnessretreats.com>")
    # Base of links in staff emails. Taken from configuration, never from a request's Host header.
    PUBLIC_SITE_URL: str = os.getenv("PUBLIC_SITE_URL") or os.getenv("NEXT_PUBLIC_SITE_URL") or "https://kaiwellnessretreats.com"
    RESEND_CONCIERGE_FROM_EMAIL: str = os.getenv("RESEND_CONCIERGE_FROM_EMAIL", "KAI Concierge Desk <concierge@kaiwellnessretreats.com>")
    KAREENA_ROUTING_EMAIL: str = os.getenv("KAREENA_ROUTING_EMAIL", "kareena@grandtravelcruise.com")
    ARMAAN_ROUTING_EMAIL: str = os.getenv("ARMAAN_ROUTING_EMAIL", "armaan@grandtravelcruise.com")

    @property
    def FOUNDER_INQUIRY_EMAILS(self) -> List[str]:
        emails = [self.KAREENA_ROUTING_EMAIL]
        if self.ARMAAN_ROUTING_EMAIL and self.ARMAAN_ROUTING_EMAIL not in emails:
            emails.append(self.ARMAAN_ROUTING_EMAIL)
        return emails
    # Optional SMTP Dispatch (e.g. Gmail App Password, Brevo, SendGrid SMTP)
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_USE_TLS: bool = os.getenv("SMTP_USE_TLS", "true").lower() in ("true", "1", "yes")
    RESEND_WEBHOOK_SECRET: str = os.getenv("RESEND_WEBHOOK_SECRET", "")
    
    # Grand Travel & Cruise Partner Metadata
    HOST_AGENCY_NAME: str = "Grand Travel & Cruise"
    HOST_AGENCY_LEGACY_YEARS: int = 25
    HOST_AGENCY_STATUS: str = "Funjet 500 Club Member"
    FOUNDER_TRAVEL_RECOGNITION: str = "Future Leaders in Travel Honoree"
    FLIGHT_CONCIERGE_EMAIL: str = os.getenv("FLIGHT_CONCIERGE_EMAIL", "concierge@kaiwellnessretreats.com")


    # WhatsApp Cloud API & Mobile Dispatch Settings
    WHATSAPP_PROVIDER: str = os.getenv("WHATSAPP_PROVIDER", "cloud_api")
    WHATSAPP_CLOUD_API_KEY: str = os.getenv("WHATSAPP_CLOUD_API_KEY", "")
    WHATSAPP_PHONE_NUMBER_ID: str = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
    WHATSAPP_BUSINESS_ACCOUNT_ID: str = os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID", "")
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: str = os.getenv("WHATSAPP_WEBHOOK_VERIFY_TOKEN", "kai_whatsapp_verify_token_2026")
    WHATSAPP_APP_SECRET: str = os.getenv("WHATSAPP_APP_SECRET", "")

    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_FROM_PHONE: str = os.getenv("TWILIO_FROM_PHONE", "+18005550199")
    OPERATOR_NOTIFICATION_PHONE: str = os.getenv("OPERATOR_NOTIFICATION_PHONE", "+17135550199")

    # Dynamic Mapping & Routing Provider Settings
    MAP_PROVIDER: str = os.getenv("MAP_PROVIDER", "osrm")  # "osrm", "openrouteservice", "mapbox", or "google"
    OPENROUTESERVICE_API_KEY: str = os.getenv("OPENROUTESERVICE_API_KEY", "")
    MAPBOX_ACCESS_TOKEN: str = os.getenv("MAPBOX_ACCESS_TOKEN", "")
    GOOGLE_MAPS_API_KEY: str = os.getenv("GOOGLE_MAPS_API_KEY", "")

    # Groq LLM + Whisper speech-to-text (free tier at https://console.groq.com)
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_BASE_URL: str = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    GROQ_TRANSCRIPTION_MODEL: str = os.getenv("GROQ_TRANSCRIPTION_MODEL", "whisper-large-v3-turbo")
    LLM_TIMEOUT_SECONDS: float = float(os.getenv("LLM_TIMEOUT_SECONDS", "60.0"))

    # Live Integration Toggles (Transitions communications from simulated logs to live delivery)
    ENABLE_LIVE_WHATSAPP_DISPATCH: bool = os.getenv("ENABLE_LIVE_WHATSAPP_DISPATCH", "false").lower() in ("true", "1", "yes")
    ENABLE_LIVE_EMAIL_DISPATCH: bool = os.getenv("ENABLE_LIVE_EMAIL_DISPATCH", "false").lower() in ("true", "1", "yes")

    # Cloud LLM Fallback (Tier 2 AI Resiliency)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

    # Authentication (short-lived signed JWTs backed by revocable server-side sessions)
    AUTH_SECRET_KEY: str = os.getenv("AUTH_SECRET_KEY", "kai_dev_only_auth_secret_do_not_use_in_production")
    AUTH_ALGORITHM: str = "HS256"
    WEBHOOK_HMAC_SECRET: str = os.getenv("WEBHOOK_HMAC_SECRET", "kai_dev_only_webhook_secret_do_not_use_in_production")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_SESSION_EXPIRE_DAYS: int = 7
    GUEST_MAGIC_LINK_EXPIRE_MINUTES: int = 15
    GUEST_SESSION_EXPIRE_HOURS: int = 72

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="ignore"
    )

    def insecure_default_secrets(self) -> List[str]:
        """Names of secrets still set to the development defaults committed in this repository."""
        insecure = [
            name for name, default in _DEV_DEFAULT_SECRETS.items()
            if not getattr(self, name) or getattr(self, name) == default
        ]
        # Signing keys need at least 256 bits; 32 characters is the floor for a random value.
        for name in ("AUTH_SECRET_KEY", "WEBHOOK_HMAC_SECRET"):
            if name not in insecure and len(getattr(self, name)) < 32:
                insecure.append(name)
        return insecure


# Secrets whose committed defaults are only acceptable for local development.
_DEV_DEFAULT_SECRETS = {
    "ADMIN_PASSWORD": "kai_admin_2026",
    "AUTH_SECRET_KEY": "kai_dev_only_auth_secret_do_not_use_in_production",
    "WEBHOOK_HMAC_SECRET": "kai_dev_only_webhook_secret_do_not_use_in_production",
    "WHATSAPP_WEBHOOK_VERIFY_TOKEN": "kai_whatsapp_verify_token_2026",
}


settings = Settings()

