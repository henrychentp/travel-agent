#!/usr/bin/env bash
# Start Hermes Telegram dev stack: server + HTTPS tunnel + bot polling.
# Usage: ./scripts/dev-telegram.sh
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-8787}"

echo "Building…"
npm run build --silent

# Kill stale processes on our port
lsof -ti :"$PORT" | xargs kill -9 2>/dev/null || true

echo "Starting Hermes server on :$PORT…"
node --env-file=.env dist/src/surfaces/telegram/server.js &
SERVER_PID=$!
sleep 1

if command -v ngrok >/dev/null && ngrok config check >/dev/null 2>&1; then
  echo "Starting ngrok (authenticated)…"
  ngrok http "$PORT" --log=stdout &
  TUNNEL_PID=$!
  sleep 3
  URL=$(curl -s http://127.0.0.1:4040/api/tunnels | node -e "
    let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
      const j=JSON.parse(d);console.log(j.tunnels?.find(t=>t.proto==='https')?.public_url||'')
    })")
elif command -v ngrok >/dev/null; then
  echo "ngrok found but not authenticated — using Cloudflare tunnel."
  echo "For ngrok: ngrok config add-authtoken <token>"
  npx --yes cloudflared tunnel --url "http://localhost:$PORT" 2>&1 | tee /tmp/cloudflared.log &
  TUNNEL_PID=$!
  sleep 5
  URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' /tmp/cloudflared.log | head -1)
else
  echo "Starting Cloudflare quick tunnel…"
  npx --yes cloudflared tunnel --url "http://localhost:$PORT" 2>&1 | tee /tmp/cloudflared.log &
  TUNNEL_PID=$!
  sleep 5
  URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' /tmp/cloudflared.log | head -1)
fi

if [ -z "$URL" ]; then
  echo "ERROR: Could not get tunnel URL"
  kill $SERVER_PID $TUNNEL_PID 2>/dev/null || true
  exit 1
fi

# Update .env WEBAPP_URL
if grep -q '^WEBAPP_URL=' .env; then
  sed -i '' "s|^WEBAPP_URL=.*|WEBAPP_URL=$URL|" .env
else
  echo "WEBAPP_URL=$URL" >> .env
fi

echo ""
echo "✓ Mini App URL: $URL"
echo "✓ Update Telegram: send /start to get fresh Web App button"
echo "  (kill server PID $SERVER_PID and re-run this script if URL changes)"
echo ""
wait $SERVER_PID
