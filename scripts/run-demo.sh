#!/usr/bin/env bash
# Start Hermes server + Cloudflare tunnel (persistent). Usage: npm run demo
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${PORT:-8787}"
LOG_TUNNEL="/tmp/cloudflared-hermes.log"
PID_TUNNEL="/tmp/cloudflared-hermes.pid"
PID_SERVER="/tmp/hermes-server.pid"

echo "Building…"
npm run build --silent

stop_server() {
  if [ -f "$PID_SERVER" ]; then
    kill "$(cat "$PID_SERVER")" 2>/dev/null || true
    wait "$(cat "$PID_SERVER")" 2>/dev/null || true
  fi
  lsof -ti :"$PORT" | xargs kill -9 2>/dev/null || true
}

stop_tunnel() {
  if [ -f "$PID_TUNNEL" ]; then
    kill "$(cat "$PID_TUNNEL")" 2>/dev/null || true
  fi
  pkill -f "cloudflared tunnel --url" 2>/dev/null || true
}

stop_server
stop_tunnel
sleep 1

echo "Starting server on :$PORT…"
setsid node --env-file=.env dist/src/surfaces/telegram/server.js >> /tmp/hermes-server.log 2>&1 < /dev/null &
echo $! > "$PID_SERVER"
sleep 2

if ! curl -sf "http://127.0.0.1:${PORT}/api/health" >/dev/null; then
  echo "ERROR: Server failed to start. See /tmp/hermes-server.log"
  tail -5 /tmp/hermes-server.log
  exit 1
fi

echo "Starting Cloudflare tunnel…"
rm -f "$LOG_TUNNEL"
setsid npx --yes cloudflared tunnel --url "http://127.0.0.1:${PORT}" >> "$LOG_TUNNEL" 2>&1 < /dev/null &
echo $! > "$PID_TUNNEL"

URL=""
for i in $(seq 1 30); do
  URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG_TUNNEL" 2>/dev/null | head -1 || true)
  [ -n "$URL" ] && break
  sleep 1
done

if [ -z "$URL" ]; then
  echo "ERROR: No tunnel URL within 30s. See $LOG_TUNNEL"
  exit 1
fi

echo "Tunnel URL: $URL"
echo "Waiting for tunnel to register…"
REGISTERED=0
for i in $(seq 1 30); do
  if grep -q "Registered tunnel connection" "$LOG_TUNNEL" 2>/dev/null; then
    REGISTERED=1
    break
  fi
  sleep 1
done

if [ "$REGISTERED" != "1" ]; then
  echo "ERROR: Tunnel did not register. See $LOG_TUNNEL"
  tail -10 "$LOG_TUNNEL"
  exit 1
fi

CODE="000"
for i in $(seq 1 15); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "${URL}/api/health" 2>/dev/null || true)
  CODE=${CODE:-000}
  [ "$CODE" = "200" ] && break
  sleep 2
done

if [ "$CODE" != "200" ]; then
  echo "WARN: External health check HTTP $CODE (tunnel registered — may need a few more seconds)"
fi

if grep -q '^WEBAPP_URL=' .env; then
  sed -i '' "s|^WEBAPP_URL=.*|WEBAPP_URL=$URL|" .env
else
  echo "WEBAPP_URL=$URL" >> .env
fi

# Restart server only — keep tunnel running (avoids Cloudflare 1033)
echo "Syncing Telegram menu button…"
stop_server
sleep 1
setsid node --env-file=.env dist/src/surfaces/telegram/server.js >> /tmp/hermes-server.log 2>&1 < /dev/null &
echo $! > "$PID_SERVER"
sleep 2

# Re-check tunnel after server restart
CODE=$(curl -s -o /dev/null -w "%{http_code}" "${URL}/api/health" 2>/dev/null || true)
CODE=${CODE:-000}
if [ "$CODE" != "200" ]; then
  echo "WARN: Tunnel returned HTTP $CODE after server restart. Wait 10s and retry."
  sleep 10
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "${URL}/api/health" 2>/dev/null || true)
fi

echo ""
echo "✓ Demo stack running"
echo "  Tunnel:  $URL"
echo "  Health:  $URL/api/health (HTTP ${CODE:-?})"
echo "  Server:  PID $(cat "$PID_SERVER")"
echo "  Tunnel:  PID $(cat "$PID_TUNNEL")"
echo ""
echo "Google Console — add these:"
echo "  Origin:   $URL"
echo "  Redirect: ${URL}/api/connect/google/callback"
echo ""
echo "Telegram: /start → 🎯 Build taste profile"
echo "Stop: kill \$(cat $PID_SERVER) \$(cat $PID_TUNNEL)"
