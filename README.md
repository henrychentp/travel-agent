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

## Traveller taste profile (the planner's foundation)

The whole planner is driven by a durable `TravellerProfile` — a direct encoding
of [`docs/traveller-taste-profile-checklist.md`](docs/traveller-taste-profile-checklist.md).
It spans 15 categories (identity, motivations, pace, accommodation, transport,
food, activities, social, budget, comfort/risk, sensory, brand/loyalty, hard
constraints, communication, deal-breakers) and follows the checklist's modeling
principles:

- **Hard constraints gate feasibility, soft preferences rank.** The planner
  *rejects* a trip that violates `constraints` (visa exclusions, blackout dates,
  medical/mobility/religious) via `checkHardConstraints`; everything else only
  down-ranks options.
- **Stated vs. inferred.** Each category carries a `confidence` score and a
  `lastConfirmed` timestamp, so the agent knows what the traveller actually said
  vs. what was guessed.
- **Revealed behaviour.** An `evidence[]` log captures passive signals over time
  (accepted/rejected cabins, skipped activities, actual spend, post-trip
  ratings) via `mem0.recordEvidence`.

Onboarding fills the profile incrementally; `MINIMUM_VIABLE_CATEGORIES` marks the
smallest set needed to plan a good first trip.

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
npm test        # type-checks, then runs the end-to-end happy path
npm run build   # emit dist/
```

The repo runs out of the box on **in-memory** Mem0 + Trip Store + stubbed live
tools, so no API keys are required for the tests. To go live, copy `.env.example`
to `.env` and fill in the keys, then replace the `create*` factories in
`src/shared` and `src/tools` with real-backed implementations.

## Workstream ownership

The three skills are independent workstreams that share the same repo and the
same contracts:

- **Person 1 — Onboarding & Memory:** learn taste/constraints, write to Mem0.
- **Person 2 — Whole-Trip Planner:** turn a request into a feasible itinerary.
- **Person 3 — In-Trip Concierge:** handle live disruptions, propose safe patches
  (major changes gated on human approval).

Each `index.ts` under `src/skills/` has `TODO(Person N)` markers showing exactly
where the real logic goes.
