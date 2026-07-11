# Live integrations

The app runs offline by default. Set the following values in a local `.env`
(which is ignored by Git) to make the Director's Local Scout and durable taste
memory live:

Set `LINKUP_API_KEY` and `MEM0_API_KEY` in that local file. The committed
[`.env.example`](../.env.example) lists the variable names with blank values.

### Mem0 setup (teammate handoff)

1. Get the shared `MEM0_API_KEY` from the team secret store (never commit it).
2. Local: `cp .env.example .env` and set `MEM0_API_KEY=...`.
3. Deploy: add `MEM0_API_KEY` as a platform secret (Render dashboard, Vercel
   env vars, or Railway variables). `render.yaml` already declares the slot.
4. Verify: `npm run build && node --env-file=.env -e "
   import { createMem0Client } from './dist/src/shared/mem0-client.js';
   const m = createMem0Client();
   await m.saveProfile({ userId: 'smoke-test', version: 1, notes: [], evidence: [], categories: {} });
   console.log('Mem0 OK:', (await m.getProfile('smoke-test'))?.userId);
   "`

When the key is set, onboarding, swipe, Google import, planner, and concierge
all read/write durable taste via `createMem0Client()` — no code changes needed.

### Teammate agent — pull saved taste from Telegram

After a traveller finishes the mini app (`/start` → **Build taste profile**),
their data is in Mem0 under:

```
userId = tg:<telegram_numeric_id>
```

**HTTP (quickest check):**
```
GET https://hermes-travel-agent.vercel.app/api/mem0/profile?userId=tg:123456789
```

Returns `{ ok: true, userId, profile }` with `destinationCity`, `food`, `pace`,
`activities`, `location`, `notes`, `evidence`, etc.

**In code (same repo):**
```ts
import { createMem0Client } from "./dist/src/shared/mem0-client.js";
const profile = await createMem0Client().getProfile("tg:123456789");
```

Requirements for the teammate's runtime:
- Same `MEM0_API_KEY` as Vercel (shared team secret)
- Correct `userId` format (`tg:` prefix + numeric Telegram id)

Optional: set `TEAMMATE_API_SECRET` on Vercel and pass `?secret=...` on profile reads.

Verify deployment: `GET /api/health` → `mem0Configured: true`.

Set `HERMES_LIVE_CULTURE=true` alongside an `OPENAI_API_KEY` to use the
OpenAI-backed Culture Concierge. It uses the existing shared OpenAI client and
is deliberately opt-in, so deterministic tests never call a model API.

`LinkupScout` calls Linkup Search with bearer authentication and turns returned
results into date-spread itinerary activities. Each candidate retains its
`sourceUrl`, so the Board can display the source that grounded it.

`HostedMem0Client` stores the structured Hermes traveller profile as a scoped
Mem0 memory and keeps an in-process cache so an onboarded traveller can plan
immediately while Mem0 processes the write.

The local Codex configuration registers Linkup's hosted MCP endpoint with
`LINKUP_API_KEY` as its bearer-token environment variable. Restart Codex after
changing that configuration. Mem0 is consumed as its documented HTTP API—not
as an MCP server—because `https://api.mem0.ai/v1` is a REST endpoint rather
than an MCP tool endpoint.

Never put either key in a URL, source file, or committed configuration.
