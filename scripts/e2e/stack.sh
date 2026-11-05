#!/bin/bash
# Starts or stops a throwaway stack for end-to-end and stress runs:
#   Postgres + FastAPI (2 workers) + Next.js frontend, with no email, SMS, or LLM keys, so nothing is sent.
#   scripts/e2e/stack.sh up [--serverless]   --serverless uses the same NullPool engine as Vercel
#   scripts/e2e/stack.sh down
set -u
NET=kai-e2e
PG=kai-e2e-pg
BE=kai-e2e-be
FE=kai-e2e-fe
PORT=${E2E_PORT:-13999}
ENV_FILE="${TMPDIR:-/tmp}/kai-e2e.env"

down() {
  docker rm -f "$FE" "$BE" "$PG" >/dev/null 2>&1
  docker network rm "$NET" >/dev/null 2>&1
  rm -f "$ENV_FILE"
}

if [ "${1:-}" = "down" ]; then down; exit 0; fi

down
random() { python -c "import secrets;print(secrets.token_urlsafe(48))"; }
ADMIN_PASSWORD=$(random)
AUTH_SECRET_KEY=$(random)
WEBHOOK_HMAC_SECRET=$(random)
{
  echo "ENVIRONMENT=staging"
  echo "ENABLE_DEMO_AUTH=false"
  echo "ADMIN_EMAIL=admin@example.com"
  echo "ADMIN_PASSWORD=$ADMIN_PASSWORD"
  echo "AUTH_SECRET_KEY=$AUTH_SECRET_KEY"
  echo "WEBHOOK_HMAC_SECRET=$WEBHOOK_HMAC_SECRET"
  echo "WHATSAPP_WEBHOOK_VERIFY_TOKEN=$(random)"
  echo "DATABASE_URL=postgresql://postgres:e2e@$PG:5432/kai"
  echo "UVICORN_WORKERS=2"
  [ "${2:-}" = "--serverless" ] && echo "VERCEL=1"
} > "$ENV_FILE"

docker network create "$NET" >/dev/null
docker run -d --name "$PG" --network "$NET" -e POSTGRES_PASSWORD=e2e -e POSTGRES_DB=kai postgres:16-alpine >/dev/null
until docker exec "$PG" pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
sleep 2
docker run -d --name "$BE" --network "$NET" --network-alias backend --env-file "$ENV_FILE" "${E2E_BACKEND_IMAGE:-kai-backend:e2e}" >/dev/null
docker run -d --name "$FE" --network "$NET" -e AUTH_SECRET_KEY="$AUTH_SECRET_KEY" -e FASTAPI_BACKEND_URL=http://backend:8000 -p "$PORT:3000" "${E2E_FRONTEND_IMAGE:-kai-frontend:e2e}" >/dev/null
for _ in $(seq 1 90); do
  [ "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT/api/v1/health")" = "200" ] && break
  sleep 1
done
echo "E2E_BASE_URL=http://localhost:$PORT"
echo "E2E_ADMIN_EMAIL=admin@example.com"
echo "E2E_ADMIN_PASSWORD=$ADMIN_PASSWORD"
echo "E2E_WEBHOOK_SECRET=$WEBHOOK_HMAC_SECRET"
