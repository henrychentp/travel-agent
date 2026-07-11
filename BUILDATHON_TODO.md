# Hermes Travel Agency — Buildathon Checklist

Track: **AI as Agency**
Goal: a real, observable travel-concierge agency that turns a traveller's live
request into a safe, personalised itinerary and learns from the outcome.

## Submission narrative — work backwards from the demo

The submission is one customer story, not a feature tour. The exact script is
in [`docs/SUBMISSION_PITCH.md`](docs/SUBMISSION_PITCH.md). Each beat below maps
to the proof that must be genuinely working and visible during the recording.

| Pitch beat | Checklist proof required | Definition of done for the recording |
| --- | --- | --- |
| **1. Inbox → selected trip** | P6 start a trip from the UI; P7 Hermes; three real tester requests | A traveller selects a real or clearly-labelled demo confirmation card and sees a confirmed flight/hotel become protected trip facts. Never imply a live Gmail connection if the demo uses fixture data. |
| **2. Three questions → personal itinerary → calendar** | P6 start a trip from the UI; P1 completed real requests; P5 durable taste | A non-engineer answers three contextual questions, receives a day-by-day plan that reflects them, and exports/opens calendar events. |
| **3. Disruption → specialist recovery → approval** | P2 live Scout/Logistics/Culture; P7 Linkup; Final rehearsal: disruption, dynamic task plan, revision, approval | One concrete cancellation produces a visible proposal, the reason for it, and an explicit approval gate before a booking changes. |
| **4. Approval → version 2 → accountability** | P3 trace/version comparison; P4 eval scores; Final rehearsal: Convex version, earlier trace, rollback | The Board visibly changes from v1 to v2, explains the decision, and can show rollback/evidence. |
| **5. Close on a live, believable product** | P0 Cloudflare + analytics; P7 Cloudflare/Hermes; P8 proof, feedback, and analytics | End on the deployed URL plus real partner/customer proof. No architecture slide is needed before the customer outcome. |

**Priority rule:** do the next unchecked item that unlocks one of these five
beats. Do not spend remaining time on a power-up that cannot be shown in the
two-minute causal story.

## Ownership

- **jerryangzr — Onboarding & Memory:** traveller taste checklist, onboarding
  prompts, profile extraction, and durable preference capture.
- **henrychentp / Person A — Director / Core:** deterministic planning, constraints,
  revision, patching, approval, rollback, evals, and run evidence.
- **Shritesh99 / Person B — Live-data workers:** Scout/Logistics/Culture integrations,
  external APIs, candidate freshness, and provider reliability.

## Henry / Person A — remaining work split into four pieces

These are the only remaining code tasks Henry should touch. They deliberately
exclude Jerry's onboarding/profile work, Shritesh's live-worker/API work, and
real-user/account actions.

1. [x] **Board trip-start handoff:** finish and verify the Board → one-time
       Telegram link → existing Director flow, including a clear invalid-link
       path. Do not alter onboarding questions or profile extraction.
2. [ ] **Run controls:** add safe pause/retry controls and immutable trace
       events, with deterministic tests. Keep run management in the Director
       layer; do not change specialist data fetching.
3. [ ] **Recovery-flow hardening:** make the narrow disruption → feasible
       recovery plan → approval → version/rollback story explicit in core
       tests and Board evidence. No external provider integration.
4. [x] **Release proof:** run full tests, deploy Person A's Convex/Cloudflare
       changes after credentials are available, keep the operator walkthrough
       current, and record reproducible local verification commands.

## P0 — Eligibility and scope

- [ ] Confirm the registered track is **AI as Agency**.
- [x] Install the actual Hermes Agent runtime locally (`hermes --version` verified).
- [x] Configure Hermes with the OpenAI-compatible custom provider, use it for
      a verified project prompt, and retain receipt `20260711_141922_51f92a`.
- [ ] Keep the agency job narrow: research a disruption, create a feasible
      recovery plan, request approval when required, and deliver the result.
- [ ] Recruit three real testers with genuine travel requests.
- [ ] Publish a Cloudflare landing page and install analytics (Trip Board is live; analytics still pending).

## P1 — Working agency output (highest-value criterion)

- [x] Add `src/core/director.ts`.
- [x] Add `src/core/constraints.ts`.
- [x] Add `src/core/revision-loop.ts`.
- [x] Add `src/core/apply-patch.ts`.
- [x] Keep planner and concierge skills as thin adapters over the core.
- [x] Generate day-by-day itinerary items and structured `add`, `remove`, and
      `replace` patch operations from worker candidates.
- [x] Reject hard-constraint violations before making a plan.
- [x] Require approval for booking, hotel, budget, date, or destination changes.
- [x] Deliver completed plans through the live Telegram adapter.
- [ ] Complete at least three distinct real requests end-to-end.
- [x] Show task success rate in the Trip Board (completed runs / finished runs).

## P2 — Dynamic agent organisation

- [x] Director creates a request-specific subtask plan rather than a fixed chain.
- [ ] Local Scout now runs up to three Linkup fast searches in parallel, merges source-grounded candidates, and tolerates partial search failures; live weather/event proof remains pending.
- [ ] Logistics Guru now rejects out-of-window and duplicate candidates, protects requested downtime, and limits low-walking days to one activity area; live routing, availability, and budget-provider proof remain pending.
- [ ] Culture Concierge has an opt-in OpenAI-backed rationale path using stored interests; live preference/pace/food/accessibility proof remains pending.
- [x] Director reviews specialist outputs and requests a retry when a worker
      returns no usable candidates; the trace records that revision.
- [x] Add `needs-human-decision` escalations with a clear blocker and options.
- [x] Allow the Director to add an extra specialist only when needed, such as
      an accessibility or budget reviewer.

## P3 — Observability

- [x] Persist run ID, traveller/trip IDs, Director plan, handoffs, final output,
      and immutable version history in Convex. Add tool-result, latency, token,
      cost, and approval-event fields with the Trip Board work.
- [x] Deploy the Cloudflare Trip Board with a trace tree and authenticated API.
- [x] Filter the trace by traveller and run; each event visibly identifies its agent.
- [x] Make an earlier failed run inspectable with its recorded escalation.
- [x] Add a current-versus-prior version comparison.
- [x] Add a visible failed-run alert (cost telemetry remains a future worker metric).

## P4 — Evals and learning loop

- [x] Build at least 15 named eval cases.
- [x] Cover a 15+ case core eval suite: hard constraints, availability,
      accessibility, dietary safety, pace/downtime, geo buffers, approvals,
      stale patches, idempotency, and rollback.
- [x] Store expected outcomes as assertions for every current eval case.
- [x] Run evals automatically in CI and fail a release when quality drops.
- [x] Turn real escalations and traveller rejections into stored future eval cases.
- [x] Show bounded deterministic quality scores for every persisted trip version in the Trip Board.

## P5 — Durable memory and safe application

- [x] Persist traveller taste, current trip, evidence, and full immutable trip
      version history in Convex. Add policy and accepted/rejected option views
      with the Trip Board work.
- [x] Pass the durable profile, trip request, and policy constraints through every
      Director-to-specialist handoff.
- [x] Demonstrate stored timing and interest preferences in deterministic core tests.
- [x] Implement `add`, `remove`, and `replace` patch operations.
- [x] Implement rollback to a prior trip version.

## P6 — Management UI

- [x] A non-engineer can start a trip from the UI and hand it once to the Telegram trip-start receiver, which enters the existing Director flow.
- [x] Taste-profile swipe cards use curated Unsplash imagery with a readable text overlay.
- [x] A non-engineer can approve or reject a patch from Telegram.
- [ ] A non-engineer can pause/retry a run.
- [x] A non-engineer can inspect recent Director traces and roll back the latest trip from Telegram.
- [x] A non-engineer can change an enforced approval rule from Telegram.
- [ ] A teammate can operate the system after one short walkthrough.

## P7 — Partner power-ups (+25 each)

- [x] **Hermes:** configured live model and retained coding-session receipt
      `20260711_141922_51f92a`.
- [x] **Convex:** main persistent backend for state and run logs.
- [x] **Cloudflare:** deployed Trip Board and authenticated Worker API.
- [ ] **Linkup:** live Scout search materially changes the plan.
- [ ] **ElevenLabs:** final-delivery pipeline now gates Tour Guide narration, PDF, and voice until itinerary finalisation; live voice credential and Telegram proof remain pending.
- [ ] **Dodo Payments:** live checkout for a genuine premium concierge offer.
- [ ] **Wispr Flow:** dictate 500+ genuine words and retain the stats screenshot.

## P8 — Cross-track bonus and proof

- [ ] Publish a build-in-public demo post early.
- [ ] Collect real waitlist signups or product users.
- [ ] Give judges read-only access to analytics.
- [ ] Collect genuine user feedback, shares, or comments.
- [ ] Keep proof open: Hermes receipts, Cloudflare URL, Convex dashboard,
      Linkup query, ElevenLabs interaction, Wispr stats, and Dodo checkout.

## Final demo rehearsal

- [ ] Begin with a real Telegram text or voice disruption.
- [ ] Show the Director's dynamic task plan.
- [ ] Show live Linkup research and specialist handoffs.
- [ ] Show a revision and the approval gate.
- [ ] Approve the patch and show the Convex version increment.
- [ ] Play the ElevenLabs personalised briefing.
- [ ] Show an earlier trace, rollback, and eval score.
- [ ] End on the live Cloudflare URL and partner proof screens.
