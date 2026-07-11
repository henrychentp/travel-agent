# Hermes Travel — operator walkthrough

Use this short release checklist before a tester or judge demo.

```bash
npm test
npm run board:check
npx convex dev --once
```

The traveller flow is Telegram: onboard, plan, report a disruption, approve
the proposed patch, inspect the run, and roll back a version. The Cloudflare
Trip Board shows the read-only evidence. Keep its board access token in the
local macOS Keychain, never in source or chat:

```bash
TOKEN=$(security find-generic-password -a "$USER" -s hermes-travel-board-token -w)
curl -I https://hermes-travel-trip-board.henrychentp.workers.dev/
curl -H "authorization: Bearer $TOKEN" \
  "https://hermes-travel-trip-board.henrychentp.workers.dev/api/board?userId=YOUR_TELEGRAM_ID"
```

Before pushing, enable the local safety gate once:

```bash
git config core.hooksPath .githooks
```

The `pre-push` hook and GitHub Actions both require a `BUILDATHON_TODO.md`
update whenever implementation files change, and run the full test suite.
