"""
Keeps the test suite hermetic: values here override the developer's .env (pydantic-settings
prefers real environment variables over the .env file), so tests always run in development
mode with the known test admin credentials and never call Groq or Resend for real.
DATABASE_URL is left alone so the suite can be pointed at Postgres.
"""
import os

os.environ["ENVIRONMENT"] = "development"
os.environ["ADMIN_USERNAME"] = "admin"
os.environ["ADMIN_PASSWORD"] = "kai_admin_2026"
os.environ["GROQ_API_KEY"] = ""
os.environ["RESEND_API_KEY"] = ""
os.environ["ENABLE_LIVE_EMAIL_DISPATCH"] = "false"
os.environ["ENABLE_LIVE_WHATSAPP_DISPATCH"] = "false"
os.environ["ENABLE_LIVE_TERN_API"] = "false"
# Development defaults from backend/config.py, which several tests send as headers.
os.environ["TERN_WEBHOOK_SECRET"] = "whsec_tern_kai_sanctuary_2026"
os.environ["EMAIL_WEBHOOK_SECRET"] = "whsec_email_kai_sanctuary_2026"
os.environ["CIRIUM_WEBHOOK_SECRET"] = "whsec_cirium_kai_2026"
os.environ["EXPEDIA_WEBHOOK_SECRET"] = "whsec_expedia_kai_2026"
os.environ["WHATSAPP_WEBHOOK_VERIFY_TOKEN"] = "kai_whatsapp_verify_token_2026"
os.environ["JWT_SECRET_KEY"] = "kai_sanctuary_jwt_secret_change_in_prod_2026"
