#!/bin/sh
# Smoke test for the self-hosted image.
#
# Starts a throwaway Postgres and the given image on a private network, waits
# for the app to come up (docker-start.sh runs the migrations first), then
# checks that /api/status reports a connected database and that the home page
# is served.
#
# Usage: scripts/smoke-test-image.sh <image> [timeout-seconds]
set -eu

IMAGE="${1:?usage: $0 <image> [timeout-seconds]}"
TIMEOUT="${2:-180}"

SUFFIX="$$"
NETWORK="rallly-smoke-$SUFFIX"
DB="rallly-smoke-db-$SUFFIX"
APP="rallly-smoke-app-$SUFFIX"

cleanup() {
  status=$?
  if [ "$status" -ne 0 ]; then
    echo "--- app logs ---"
    docker logs "$APP" 2>&1 | tail -n 100 || true
  fi
  docker rm -f "$APP" "$DB" >/dev/null 2>&1 || true
  docker network rm "$NETWORK" >/dev/null 2>&1 || true
  exit "$status"
}
trap cleanup EXIT

docker network create "$NETWORK" >/dev/null

docker run -d --name "$DB" --network "$NETWORK" \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=rallly \
  postgres:18-alpine >/dev/null

echo "Waiting for Postgres..."
i=0
until docker exec "$DB" pg_isready -U postgres >/dev/null 2>&1; do
  i=$((i + 1))
  [ "$i" -ge 30 ] && { echo "Postgres did not become ready"; exit 1; }
  sleep 1
done

docker run -d --name "$APP" --network "$NETWORK" \
  -e DATABASE_URL="postgres://postgres:postgres@$DB/rallly" \
  -e SECRET_PASSWORD="smoke-test-secret-smoke-test-secret-0000" \
  -e NEXT_PUBLIC_BASE_URL="http://localhost:3000" \
  -e SUPPORT_EMAIL="support@example.com" \
  "$IMAGE" >/dev/null

# The runner image ships curl and the app listens on 3000, so probe from
# inside the container: no published port, no clash on shared CI hosts.
probe() {
  docker exec "$APP" curl --fail --silent --noproxy '*' "http://localhost:3000$1"
}

echo "Waiting for the app (up to ${TIMEOUT}s)..."
elapsed=0
until body=$(probe /api/status 2>/dev/null); do
  if [ "$(docker inspect -f '{{.State.Running}}' "$APP")" != "true" ]; then
    echo "App container exited before becoming ready"
    exit 1
  fi
  elapsed=$((elapsed + 2))
  [ "$elapsed" -ge "$TIMEOUT" ] && { echo "Timed out waiting for /api/status"; exit 1; }
  sleep 2
done

echo "/api/status: $body"
case "$body" in
  *'"database":"connected"'*) ;;
  *) echo "Database is not connected"; exit 1 ;;
esac

# Any HTTP response below 400 after redirects (the home page redirects to
# /login or /setup depending on the instance state).
probe_status=$(docker exec "$APP" curl --silent --location --noproxy '*' \
  --output /dev/null --write-out '%{http_code}' http://localhost:3000/)
echo "GET / -> $probe_status"
[ "$probe_status" -lt 400 ] || { echo "Home page returned $probe_status"; exit 1; }

echo "Smoke test passed"
