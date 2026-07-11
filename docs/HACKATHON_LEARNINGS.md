# Hermes Travel Hackathon — Learnings and Playbook

Date: 11 July 2026

## What we built

- A Telegram-first Hermes Travel demo.
- A Vercel Mini App that saves taste and trip context to Mem0 under
  `tg:<telegram_chat_id>`.
- An LLM-led Director with three specialists:
  - Local Scout finds source-grounded options through Linkup.
  - Logistics Guru enforces time windows, buffers, pace, and hard constraints.
  - Culture Concierge curates the customer-facing explanation.
- Hermes sends the final itinerary, PDF, and ElevenLabs voice memo directly in
  Telegram.

## Architecture rule: one owner per responsibility

| Responsibility | Owner | Must not also do it |
| --- | --- | --- |
| Telegram updates and final delivery | Hermes gateway | Vercel webhook/serverless bot |
| Onboarding UI and profile save | Vercel Mini App | Hermes swipe UI |
| Durable traveller taste | Mem0 (`tg:<chat_id>`) | temporary demo fixtures |
| Itinerary facts, versions, approvals | Trip Store / Convex | Mem0 |
| Fresh venue discovery | Linkup Scout | Director/LLM guesses |
| Feasibility | Logistics + deterministic rules | LLM alone |
| Taste-aware explanation | Culture Concierge | Scout/Logistics |

The core failure mode was allowing Vercel and Hermes to both run the demo.
There must be one Telegram execution path.

## Mistakes, causes, and fixes

### 1. Two Telegram execution paths

**Symptom:** The Mini App completion endpoint sent a text-only Vercel itinerary
instead of the Hermes PDF/voice experience.

**Cause:** The product flow changed between auto-demo and explicit `demo`, but
both paths remained active.

**Fix:** Vercel saves onboarding only. Hermes alone handles `demo`, research,
planning, and final asset delivery.

### 2. A Git push was mistaken for a deploy

**Symptom:** Correct code was in GitHub while the public URL still showed an old
Mini App.

**Cause:** The live Vercel project/alias was not verified after pushing.

**Fix:** A deployment is complete only after the real public URL is checked
against a versioned health endpoint or a visible build marker.

### 3. Telegram polling and webhook conflicts

**Symptom:** Hermes logged polling conflicts and missed messages.

**Cause:** More than one update consumer used the same bot token.

**Fix:** Pick one delivery mode. Hermes uses polling, so Vercel must not set a
Telegram webhook. Verify with Telegram `getWebhookInfo` before demos.

### 4. `/start` was silently ignored

**Symptom:** The onboarding welcome never appeared.

**Cause:** Hermes treats `/start` as a generic platform ping by default.

**Fix:** Add a profile quick command that returns a minimal welcome: first
`onboarding`, then `demo`.

### 5. Agent tools did not receive the active chat ID

**Symptom:** The profile bridge and delivery scripts could not choose among
multiple Telegram test chats.

**Cause:** Quick commands received `HERMES_TELEGRAM_CHAT_ID`; regular agent
terminal calls did not.

**Fix:** Inject the source chat ID into every agent-tool execution. A
most-recent-session fallback is useful for demos but is not safe at scale.

### 6. Asset delivery was gated before provider verification

**Symptom:** The demo failed at PDF or voice delivery.

**Cause:** Vercel credential state and final Telegram uploads were not
preflighted before making delivery mandatory.

**Fix:** Preflight the provider, generate/send assets from Hermes, and do not
mark a demo complete until Telegram confirms both uploads.

### 7. Secrets were pasted into chat

**Symptom:** Provider credentials entered conversation history.

**Cause:** Setup speed overrode secret discipline.

**Fix:** Rotate all keys used during the event. Keep future secrets only in
local `.env` files or deployment environment variables—never chat, commits,
screenshots, source, or logs.

### 8. Multiple repos/runtimes caused edits in the wrong place

**Cause:** The local core repo, Vercel app, and Hermes profile were all active
without a source-of-truth map.

**Fix:** Write this at project start:

```text
Repo + GitHub remote:
Production Vercel project + URL:
Hermes profile + path:
Telegram bot username:
Mem0 user-id format:
Telegram update mode (polling or webhook):
```

### 9. Dirty collaborator worktrees made pushes risky

**Fix:** Before every commit run:

```bash
git status -sb
git diff --cached --name-status
git diff --check
```

Stage explicit files only. Use separate worktrees or branches for each person.

## Correct customer flow

1. User sends `start` or says hello.
2. Bot says: `1. onboarding  2. demo`.
3. User sends `onboarding`.
4. Hermes sends the native Mini App button.
5. Vercel saves taste and trip context to Mem0; it does not plan.
6. Mini App says: `Saved. Return to Hermes and send demo.`
7. User sends `demo`.
8. Hermes loads the exact `tg:<chat_id>` profile.
9. Director creates an LLM planning brief.
10. Scout → Logistics → Culture produce one grounded, feasible plan.
11. Hermes delivers text itinerary, calendar links, PDF, and voice memo.
12. The run completes only after both uploads succeed.

## Required preflight before a live demo

- [ ] One production URL is known and verified.
- [ ] `/api/health` reports the required provider configuration.
- [ ] Telegram `getWebhookInfo` matches the chosen update mode.
- [ ] Hermes gateway is running, with one polling consumer.
- [ ] Mem0 profile lookup works for the exact test chat ID.
- [ ] Linkup returns one real result.
- [ ] ElevenLabs generates a short audio test.
- [ ] Telegram receives a test PDF and audio upload.
- [ ] `start`, `onboarding`, and `demo` work from a fresh chat.
- [ ] The public page displays the intended UX copy.

## Engineering principles to retain

- LLMs interpret intent and explain trade-offs; deterministic code owns
  constraints, schedules, approvals, and versions.
- Never invent venue availability, reservations, prices, or source facts.
- Flights, hotels, and restaurant reservations are protected anchors.
- Durable taste belongs in Mem0; mutable itinerary facts and history belong in
  the trip store.
- Every external dependency needs a health endpoint and a small preflight test.
- Keep customer output simple; hide agents, tools, fixtures, and traces unless
  the user asks to inspect them.
- Deploy is not complete until the actual public URL is verified.

## Strategic lesson: minimise runtime integration during a hackathon

Vercel, Telegram, and Hermes each added meaningful setup and debugging time.
Do not make all three dependencies part of the critical path unless their
integration is itself a judging criterion.

### Better build order

```text
Director + deterministic fixtures
  → live Linkup research
  → polished web or local demo
  → optional Telegram presentation layer
  → optional Vercel deployment
```

- Start with one runtime and one surface: a simple web app or local CLI calling
  the Director directly is the best default.
- Treat Hermes as the orchestration runtime, not a second UI/backend to wire
  during the build.
- Add Telegram only after the core customer flow works; keep it a thin
  presentation layer.
- Deploy to Vercel only after the tested flow is complete, ideally near the end
  of the event.
- Use fixtures or stubs first, then add live providers one at a time after the
  end-to-end journey passes.

This would have removed most of the integration/debugging time while retaining
the core agency story: personalised context, live research, feasibility, and a
safe final plan.

## Cleanup after the event

- Rotate Telegram, OpenAI, Linkup, Mem0, and ElevenLabs credentials.
- Remove local `.env` secrets if the machine may be shared.
- Disconnect/delete the Vercel deployment if it is not needed.
- Stop Hermes and remove Telegram configuration if the bot should be offline.
- Revoke unneeded GitHub and Vercel access tokens.
