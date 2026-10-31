from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import os


class Settings(BaseSettings):
    PROJECT_NAME: str = "KAI Wellness Retreats API"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # Admin Authentication
    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "kai_admin_2026")
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./kai_sanctuary.db")
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://kaiwellnessretreats.com",
        "https://www.kaiwellnessretreats.com",
    ]
    
    # Email & Notifications
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    RESEND_FROM_EMAIL: str = os.getenv("RESEND_FROM_EMAIL", "KAI Sanctuary Reservations <inquiries@kaiwellnessretreats.com>")
    RESEND_CONCIERGE_FROM_EMAIL: str = os.getenv("RESEND_CONCIERGE_FROM_EMAIL", "KAI Concierge Desk <concierge@kaiwellnessretreats.com>")
    KAREENA_ROUTING_EMAIL: str = os.getenv("KAREENA_ROUTING_EMAIL", "kareena@kaiwellnessretreats.com")
    EMAIL_WEBHOOK_SECRET: str = os.getenv("EMAIL_WEBHOOK_SECRET", "whsec_email_kai_sanctuary_2026")
    RESEND_WEBHOOK_SECRET: str = os.getenv("RESEND_WEBHOOK_SECRET", "")
    
    # Grand Travel & Cruise Partner Metadata
    HOST_AGENCY_NAME: str = "Grand Travel & Cruise"
    HOST_AGENCY_LEGACY_YEARS: int = 25
    HOST_AGENCY_STATUS: str = "Funjet 500 Club Member"
    FOUNDER_TRAVEL_RECOGNITION: str = "Future Leaders in Travel Honoree"
    FLIGHT_CONCIERGE_EMAIL: str = os.getenv("FLIGHT_CONCIERGE_EMAIL", "concierge@kaiwellnessretreats.com")

    # Sidecar & Operator Portal Settings
    TERN_API_KEY: str = os.getenv("TERN_API_KEY", "simulated_tern_key_kai")
    TERN_API_URL: str = os.getenv("TERN_API_URL", "https://api.tern.travel/v1")
    TERN_AGENCY_ID: str = os.getenv("TERN_AGENCY_ID", "grand_travel_cruise_kai")
    TERN_PUBLIC_FORMS_BASE_URL: str = os.getenv("TERN_PUBLIC_FORMS_BASE_URL", "https://app.tern.travel/public/forms")
    TERN_WEBHOOK_SECRET: str = os.getenv("TERN_WEBHOOK_SECRET", "whsec_tern_kai_sanctuary_2026")

    # WhatsApp Cloud API & Mobile Dispatch Settings
    WHATSAPP_PROVIDER: str = os.getenv("WHATSAPP_PROVIDER", "cloud_api")
    WHATSAPP_CLOUD_API_KEY: str = os.getenv("WHATSAPP_CLOUD_API_KEY", "")
    WHATSAPP_PHONE_NUMBER_ID: str = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
    WHATSAPP_BUSINESS_ACCOUNT_ID: str = os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID", "")
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: str = os.getenv("WHATSAPP_WEBHOOK_VERIFY_TOKEN", "kai_whatsapp_verify_token_2026")

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
    ENABLE_LIVE_TERN_API: bool = os.getenv("ENABLE_LIVE_TERN_API", "false").lower() in ("true", "1", "yes")
    ENABLE_LIVE_WHATSAPP_DISPATCH: bool = os.getenv("ENABLE_LIVE_WHATSAPP_DISPATCH", "false").lower() in ("true", "1", "yes")
    ENABLE_LIVE_EMAIL_DISPATCH: bool = os.getenv("ENABLE_LIVE_EMAIL_DISPATCH", "false").lower() in ("true", "1", "yes")
    CIRIUM_WEBHOOK_SECRET: str = os.getenv("CIRIUM_WEBHOOK_SECRET", "whsec_cirium_kai_2026")
    EXPEDIA_WEBHOOK_SECRET: str = os.getenv("EXPEDIA_WEBHOOK_SECRET", "whsec_expedia_kai_2026")

    # Cloud LLM Fallback (Tier 2 AI Resiliency)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

    # Security & JWT Tokens
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "kai_sanctuary_jwt_secret_change_in_prod_2026")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="ignore"
    )

    def insecure_default_secrets(self) -> List[str]:
        """Names of secrets still set to the development defaults committed in this repository."""
        return [
            name for name, default in _DEV_DEFAULT_SECRETS.items()
            if not getattr(self, name) or getattr(self, name) == default
        ]


# Secrets whose committed defaults are only acceptable for local development.
_DEV_DEFAULT_SECRETS = {
    "ADMIN_PASSWORD": "kai_admin_2026",
    "JWT_SECRET_KEY": "kai_sanctuary_jwt_secret_change_in_prod_2026",
    "TERN_WEBHOOK_SECRET": "whsec_tern_kai_sanctuary_2026",
    "EMAIL_WEBHOOK_SECRET": "whsec_email_kai_sanctuary_2026",
    "CIRIUM_WEBHOOK_SECRET": "whsec_cirium_kai_2026",
    "EXPEDIA_WEBHOOK_SECRET": "whsec_expedia_kai_2026",
    "WHATSAPP_WEBHOOK_VERIFY_TOKEN": "kai_whatsapp_verify_token_2026",
}


settings = Settings()

