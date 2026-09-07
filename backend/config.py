from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    PROJECT_NAME: str = "KAI Wellness Retreats API"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    
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
    KAREENA_ROUTING_EMAIL: str = os.getenv("KAREENA_ROUTING_EMAIL", "kareena@kaiwellnessretreats.com")
    
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

    # Ollama Local LLM Engine Settings (Ultra-Fast Qwen 2.5)
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen2.5:0.5b")
    OLLAMA_TIMEOUT_SECONDS: float = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "60.0"))

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"


settings = Settings()
