# Workstreams — dividing the build in 2

Now that planner + concierge share one **Director**, we don't split by feature
(that means both people editing `director.ts` and constant conflicts). We split
along the **stable interface**: the worker contracts (`Scout`, `Logistics`,
`Culture`), `Intent`, and `TripPatch`. Those are already defined, so the two
tracks can move in parallel and only meet at the seam.

```
        Person A owns ABOVE the line          Person B owns BELOW the line
   ┌─────────────────────────────────────┐
   │ Director · apply-patch · constraints │   orchestration + spine
   │ revision-loop (orchestration)        │
   ├───────── Scout / Logistics / Culture interfaces ─────────┤  ← the seam
   │ scout impl (Linkup)  logistics impl  │   real integrations + surfaces
   │ culture impl (ElevenLabs)  tools     │
   └─────────────────────────────────────┘
```

Both keep `npm test` green at all times.

---

## Person A — Director & Planning Spine

Owns the orchestration: how context becomes a patch and how patches become trip
state. Works entirely against the **stub** workers, so no external APIs needed.

Files: `src/core/director.ts`, `src/core/apply-patch.ts`,
`src/core/constraints.ts`, `src/core/revision-loop.ts`,
`src/skills/{trip-planner,concierge}`, `src/orchestrator`, `tests/`.

- [ ] **Real op generation in the Director.** Turn `ScoutFindings` into a proper
      day-by-day set of `PatchOp`s (spread across dates, not all on `start`).
- [ ] **Flesh out the revision loop.** Beyond the density cap: enforce time/geo
      buffers using `walkingTolerance` + ground transport, and protect
      `dailyDowntime`. Return meaningful `dropped`/`issues`.
- [ ] **Approval policy.** Implement `decideApproval` by parsing
      `profile.communication.approvalThresholds` into rules (magnitude, cost
      delta, category) instead of the `ops.length > 2` stub.
- [ ] **Expand hard constraints.** Add medical/mobility/religious/insurance gates
      to `checkHardConstraints`; make live-need patches re-check when they move
      the traveller to a new location.
- [ ] **Patch semantics.** Support `remove`/`replace` end-to-end in
      `apply-patch.ts` (rebooking a cancelled flight = replace), plus rollback
      using `TripState.history`.
- [ ] **Tests.** Unit-test `runRevisionLoop`, `applyPatch`, and `decideApproval`;
      add a concierge case that actually mutates the itinerary (v1 → v2 with real
      ops).

## Person B — Workers & Live Surfaces

Owns everything below the worker interfaces: the real data + rendering. Ships
each worker behind its existing interface so Person A's spine picks it up for
free.

Files: `src/core/workers/{scout,logistics,culture}.ts`, `src/tools/index.ts`,
`src/shared/mem0-client.ts` (real backend), plus new intake/output surfaces.

- [ ] **Scout (Agent A).** Implement `StubScout` for real: query live web layers
      (Linkup search API) for open venues + raw sentiment; return ranked
      `Booking[]` filtered by taste.
- [ ] **Live tools.** Replace `StubLiveTools` with real providers
      (flights/hotels/maps/weather/events) behind the current `LiveTools`
      interface.
- [ ] **Logistics data.** Feed the revision loop real inputs: opening hours /
      closures and travel-time matrices (so Person A's buffers have data).
- [ ] **Culture (Agent C).** LLM-curated brief + optional ElevenLabs voice script
      in `CultureBrief.audioScript`.
- [x] **Memory backend.** `HostedMem0Client` calls the Mem0 HTTP API when
      `MEM0_API_KEY` is set; `recordEvidence` persists passive signals on the
      traveller profile.
- [ ] **Intake + output surfaces (from the Track 03 diagram).** Voice intake
      (Wispr Flow) → state mutations (Convex); on output, render the live app
      view + broadcast to a Telegram channel; add Langfuse/OTel tracing around
      Director + worker calls.

---

## The seam (don't change without agreeing)

These are the shared contracts. Change them only by mutual agreement — they're
what let both tracks compile independently:

- `Scout.find`, `Logistics.revise`, `Culture.curate` — worker interfaces
- `Intent` — the `full-plan` | `live-need` fork
- `TripPatch` / `PatchOp` — the unit of change
- `TravellerProfile` — the taste contract (from the checklist)
