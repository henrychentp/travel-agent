# travel-agent

**One travel agent. Three specialist workstreams.**
Hermes coordinates a shared traveller memory and live trip state.

A traveller talks to **Hermes** (the manager), which routes intent and coordinates
three specialist skills over two shared data stores.

```
Traveller ─▶ Hermes (manager) ─▶ ┌ 1 · Onboarding & Memory  ─▶ Mem0 (taste)
                                  ├ 2 · Whole-Trip Planner   ─▶ Trip State (facts)
                                  └ 3 · In-Trip Concierge    ─▶ Trip State (+ human approval)
                                             │
                                             └─▶ Live Tools: Flights · Hotels · Maps · Weather · Events
```

- **Mem0** stores *taste* — durable preferences that survive across trips.
- **Trip State** stores *facts* — bookings + itinerary + version history.
- One `userId`, one `tripId`, structured JSON contracts between every part.

## Contracts

| Skill | Function | Returns |
| --- | --- | --- |
| 1 · Onboarding & Memory | `onboardUser(userId, answers)` | `TravellerProfile` |
| 2 · Whole-Trip Planner | `planTrip(userId, request)` | `TripPlan` |
| 3 · In-Trip Concierge | `handleLiveNeed(userId, tripId, request)` | `TripPatch` |

All types live in [`src/shared/schemas.ts`](src/shared/schemas.ts).

## Repository layout

```
travel-agent/
├── src/
│   ├── shared/            # schemas · mem0-client · trip-store  (the JSON contracts + stores)
│   ├── skills/
│   │   ├── onboarding/    # onboardUser  -> TravellerProfile   (Person 1)
│   │   ├── trip-planner/  # planTrip     -> TripPlan           (Person 2)
│   │   └── concierge/     # handleLiveNeed -> TripPatch        (Person 3)
│   ├── orchestrator/      # Hermes — routes intent + coordinates skills
│   └── tools/             # Live Tools: flights · hotels · maps · weather · events
└── tests/
    └── end-to-end/        # onboard -> plan -> disrupt -> concierge replans
```

## Getting started

```bash
npm install
cp .env.example .env          # then add your OpenAI key locally — never commit .env
git config core.hooksPath .githooks   # one-time: blocks secrets on commit
npm test                      # no API keys needed (in-memory stubs)
npm start                     # onboarding dev runner (needs OPENAI_API_KEY in .env)
npm run build                 # emit dist/
```

The repo runs out of the box on **in-memory** Mem0 + Trip Store + stubbed live
tools, so no API keys are required for the tests. For LLM-backed dev work, copy
`.env.example` to `.env`, add your key, and optionally set `OPENAI_MODEL`
(default: `gpt-4o`).

### Secrets policy (shared repo)

| File | Commit? | Purpose |
| --- | --- | --- |
| `.env.example` | Yes | Documents required vars — values stay empty |
| `.env` | **Never** | Your local keys only (gitignored) |
| Source code | Yes | Must not contain `sk-...` keys |

A pre-commit hook (`.githooks/pre-commit`) runs `npm run check-secrets` to
catch accidental key commits. Enable it once per clone:

```bash
git config core.hooksPath .githooks
```

## Workstream ownership

The three skills are independent workstreams that share the same repo and the
same contracts:

- **Person 1 — Onboarding & Memory:** learn taste/constraints, write to Mem0.
  - Entry point: `src/skills/onboarding/index.ts` (`onboardUser`)
  - Dev runner: `npm start` → `src/skills/onboarding/dev.ts`
  - Shared LLM helper: `src/shared/llm.ts` (`chat`, uses `OPENAI_MODEL`)
- **Person 2 — Whole-Trip Planner:** turn a request into a feasible itinerary.
- **Person 3 — In-Trip Concierge:** handle live disruptions, propose safe patches
  (major changes gated on human approval).

Each `index.ts` under `src/skills/` has `TODO(Person N)` markers showing exactly
where the real logic goes.
