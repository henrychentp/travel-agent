# Hermes — submission pitch

## The pitch in two sentences

**Hermes turns the travel confirmations already sitting in your inbox into a trip you can actually take.** It finds the booked flight and hotel, asks three questions that matter for *this* destination, builds an itinerary around those fixed reservations, and keeps the plan current—with your approval before it changes a booking.

## The one-line company purpose

**Hermes is the persistent travel agent that turns booked travel into a personalised, reliable trip.**

This language is intentionally plain. It says what the product does, for whom, and what is different without relying on “AI platform”, “multi-agent”, or other terms a customer or judge must decode.

---

## The 2-minute submission demo script

### 0:00–0:10 — Start with the customer, not the technology

> “Planning usually does not start with an empty destination box. It starts after you have already booked a flight, received a hotel confirmation, and realised those details are trapped across your inbox, calendar, and notes.”

Show a small, realistic inbox containing a flight and hotel confirmation. Do not show the Gmail OAuth screen; it is setup, not value.

### 0:10–0:28 — The wedge: remove the blank page

> “Hermes reads only travel confirmations and turns them into one trip card.”

Show: `Lisbon · 1–5 September · flight + hotel found` and a clear **Plan this trip** action. Include booking references/source links so the audience can see that Hermes has grounded the trip in real facts.

### 0:28–0:45 — Personalise without a long form

> “Rather than asking for a fifteen-field profile, Hermes asks only what can change this Lisbon trip: what would make it worthwhile, how full should the days feel, and any non-negotiables.”

Show the three contextual questions. Use one specific answer, for example: “food, neighbourhood walks, relaxed pace, vegetarian.”

### 0:45–1:05 — The promise: booked facts are protected

> “The flight and hotel are now confirmed anchors. Hermes plans around them; it does not silently optimise them away.”

Reveal a day-by-day itinerary. Show a small “Why this fits you” panel and a visible `Booked` label on the flight and hotel. Click **Add all to calendar** and show the resulting calendar events.

### 1:05–1:40 — Prove that it is an agent, not an itinerary generator

Send a real-looking Telegram message:

> “My afternoon flight has been cancelled. I still need to get to Lisbon today.”

Show Hermes delegate the recovery to Logistics, Local Scout, and Culture Concierge. The Board should show the candidate, the reason it fits the stored preferences, and the proposed booking change.

> “Hermes can act quickly, but it cannot change a consequential reservation without approval.”

Click **Approve**. Show itinerary version `v1 → v2`, the calendar update, and the preserved decision trace.

### 1:40–2:00 — Close on the enduring product

> “Travel agents used to know your preferences, your bookings, and what to do when the plan broke. Hermes makes that service available continuously: it understands the trip you already bought, learns your taste over time, and remains accountable for every important change.”

End on the live URL and the Trip Board, not a logo slide.

---

## What the judges should see on screen

Keep the front-stage demo to this one causal story:

```text
Travel emails → selected trip → three questions → itinerary → calendar
                                                       ↓
                                      disruption → approval → version 2
```

The implementation proof sits behind the customer story:

| Customer claim | Proof to show |
| --- | --- |
| Hermes understands what is already booked | Confirmed booking card, source reference, protected reservation label |
| It is personal | Three answers reflected in activities and pace |
| It acts, rather than chats | Specialist handoffs and a concrete recovery proposal |
| It is safe | Explicit approval gate before changing a booking |
| It is accountable | Version history and trace of why a change happened |

Do **not** make the demo a tour of integrations, data models, or agents. The agent architecture is the proof for the promise, not the headline.

## Submission slides (if slides are required)

Use six slides maximum; the demo is the centrepiece.

1. **Purpose** — “Hermes turns booked travel into a personalised, reliable trip.”
2. **Problem** — A traveller’s bookings, preferences, plan, and disruptions are fragmented. Existing tools either organise reservations or recommend places; none owns the trip after booking.
3. **Product demo** — The Gmail → taste → itinerary → calendar sequence.
4. **Why Hermes wins** — Confirmation-derived trip context + durable taste + approval-safe action. This is the product insight, not “we use agents.”
5. **Proof** — Show what works today: persistent profile/trip/version state, approval-gated patches, reproducible tests, and the live trace. State any prototype limitation plainly: Gmail connection is an adapter boundary until OAuth credentials are configured.
6. **Next proof point** — Recruit a narrow first cohort of frequent independent travellers; measure trip-import completion, itinerary acceptance, calendar export, and re-engagement during a disruption.

## Investor version: the story to earn belief

### Customer and wedge

Start with independent, digitally organised travellers who already book their own transport and accommodation, then spend time assembling the rest. The first job is narrow: **make my already-booked trip feel planned, personal, and easy to execute.**

The alternative is not one direct competitor. It is Gmail + Google Calendar + Maps + saved TikToks + travel spreadsheets + asking a generic chatbot. Hermes wins by starting from the facts people already have instead of demanding a new planning workflow.

### Unique insight

The travel inbox is not merely a notification feed; it is the traveller’s pre-built trip database. A useful agent should begin from confirmed facts, then learn taste in the small number of questions that change the decision. It must also distinguish between harmless itinerary additions and changes to reservations that need human approval.

### Why now

Travel data has always been fragmented, but modern agent systems can now hold durable preference memory, reason across bookings and local options, and operate under explicit approval policies. That makes a trustworthy persistent agent possible where a one-off recommendation chatbot is not enough.

### What not to claim yet

- Do not claim live Gmail access, live inventory, calendar sync, or user traction unless the demo has it and can show it.
- Do not lead with total market size before proving the narrow user and job.
- Do not claim that multi-agent architecture itself is a moat.
- Do not imply Hermes can autonomously rebook travel; the current product proposes a patch and asks for approval.

### Metrics that would make the narrative stronger

Instrument and report real numbers, not vanity numbers:

- % of connected users who select a detected trip;
- time from trip selection to calendar export;
- % of itinerary items accepted, edited, or rejected;
- % of disruption proposals approved;
- repeat use on the next trip;
- number of users who would be “very disappointed” without Hermes.

The first credible traction milestone is not downloads. It is 10–20 travellers who repeatedly import a booked trip and use Hermes in a real decision.

---

## Pitch discipline

This document follows three useful principles:

- YC recommends a simple, jargon-free explanation of what the company does, plus a specific insight rather than vague claims of “better AI.” See [How to Pitch Your Company](https://www.ycombinator.com/blog/how-to-pitch-your-company/).
- Sequoia’s deck framework begins with a one-sentence purpose, customer pain, differentiated solution, and a credible “why now,” before market and business-model discussion. See [Writing a Business Plan](https://sequoiacap.com/article/writing-a-business-plan/).
- YC’s operating advice is to solve one problem well, launch, and seek a small group of users who love the product before scaling. See [YC’s Essential Startup Advice](https://www.ycombinator.com/blog/ycs-essential-startup-advice/).

For the final recording: use one traveller, one trip, one disruption, concrete language, and evidence at every handoff. The audience should be able to repeat what Hermes does in one sentence after watching it once.
