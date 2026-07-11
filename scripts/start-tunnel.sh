#!/usr/bin/env bash
# Stable Cloudflare quick tunnel for Hermes dev. Run alongside: npm run telegram
set -euo pipefail
PORT="${PORT:-8787}"

# Ensure server is up before tunneling
if ! curl -sf "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1; then
  echo "ERROR: Hermes server not running on 127.0.0.1:${PORT}"
  echo "Start it first: npm run telegram"
  exit 1
fi

pkill -f "cloudflared tunnel --url" 2>/dev/null || true
sleep 1

LOG="/tmp/cloudflared-hermes.log"
rm -f "$LOG"

echo "Starting Cloudflare tunnel → http://127.0.0.1:${PORT}…"
nohup npx --yes cloudflared tunnel --url "http://127.0.0.1:${PORT}" >> "$LOG" 2>&1 &
TUNNEL_PID=$!
echo "$TUNNEL_PID" > /tmp/cloudflared-hermes.pid

for i in $(seq 1 20); do
  URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" 2>/dev/null | head -1 || true)
  if [ -n "$URL" ]; then break; fi
  sleep 1
done

if [ -z "$URL" ]; then
  echo "ERROR: Could not get tunnel URL within 20s"
  kill "$TUNNEL_PID" 2>/dev/null || true
  exit 1
fi

# Verify tunnel reaches origin (avoids Cloudflare 1033 from dead tunnels)
CODE="000"
for i in $(seq 1 30); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "${URL}/api/health" 2>/dev/null || echo "000")
  if [ "$CODE" = "200" ]; then break; fi
  echo "  waiting for tunnel… ($i/30, HTTP $CODE)"
  sleep 2
done

if [ "$CODE" != "200" ]; then
  echo "ERROR: Tunnel URL not healthy (HTTP $CODE). Cloudflare 1033 likely."
  kill "$TUNNEL_PID" 2>/dev/null || true
  exit 1
fi

cd "$(dirname "$0")/.."
if grep -q '^WEBAPP_URL=' .env; then
  sed -i '' "s|^WEBAPP_URL=.*|WEBAPP_URL=$URL|" .env
else
  echo "WEBAPP_URL=$URL" >> .env
fi

echo ""
echo "✓ Tunnel healthy: $URL"
echo "✓ .env WEBAPP_URL updated"
echo "✓ Restart server to sync Telegram menu: npm run telegram"
echo "✓ In Telegram: send /start for fresh Web App button"
echo "  Tunnel PID: $TUNNEL_PID (logs: $LOG)"
echo ""
