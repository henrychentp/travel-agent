/**
 * Shared JSON contracts for the travel agent.
 *
 * These are the structured types passed between Hermes (orchestrator), the three
 * specialist skills, and the two data stores. One `userId`, one `tripId`.
 *
 *   - Mem0        stores TASTE + durable preferences  -> TravellerProfile
 *   - Trip State  stores FACTS: bookings + itinerary  -> TripState / TripPlan
 */

export type UserId = string;
export type TripId = string;
export type ISODate = string; // e.g. "2026-08-14" or full ISO timestamp

/* ------------------------------------------------------------------ *
 * 1 · Onboarding & Memory  ->  TravellerProfile
 * ------------------------------------------------------------------ */

/** Raw answers collected during onboarding, before they become durable taste. */
export interface OnboardingAnswers {
  homeCity?: string;
  budgetTier?: "shoestring" | "comfort" | "premium" | "luxury";
  pace?: "relaxed" | "balanced" | "packed";
  interests?: string[]; // e.g. ["food", "hiking", "museums"]
  dietary?: string[]; // e.g. ["vegetarian", "no-pork"]
  mobility?: string[]; // accessibility constraints
  seatPreference?: "window" | "aisle" | "no-preference";
  freeText?: string; // anything the traveller volunteers
}

/** Durable taste + constraints. Persisted to Mem0. The memory that survives trips. */
export interface TravellerProfile {
  userId: UserId;
  homeCity?: string;
  budgetTier: NonNullable<OnboardingAnswers["budgetTier"]>;
  pace: NonNullable<OnboardingAnswers["pace"]>;
  interests: string[];
  dietary: string[];
  mobility: string[];
  seatPreference: NonNullable<OnboardingAnswers["seatPreference"]>;
  /** Free-form durable notes learned over time ("hates early flights"). */
  notes: string[];
  updatedAt: ISODate;
}

/* ------------------------------------------------------------------ *
 * 2 · Whole-Trip Planner  ->  TripPlan
 * ------------------------------------------------------------------ */

/** A request to plan a complete trip. */
export interface TripRequest {
  destination: string;
  startDate: ISODate;
  endDate: ISODate;
  travellers: number;
  budget?: number; // total, in the traveller's home currency
  mustHaves?: string[]; // hard requirements for this specific trip
}

export interface FlightBooking {
  kind: "flight";
  from: string;
  to: string;
  depart: ISODate;
  arrive: ISODate;
  carrier?: string;
  price?: number;
  ref?: string;
}

export interface HotelBooking {
  kind: "hotel";
  name: string;
  checkIn: ISODate;
  checkOut: ISODate;
  location?: string;
  price?: number;
  ref?: string;
}

export interface Activity {
  kind: "activity";
  title: string;
  date: ISODate;
  location?: string;
  durationMins?: number;
  price?: number;
}

export type Booking = FlightBooking | HotelBooking | Activity;

/** One day of the itinerary. */
export interface ItineraryDay {
  date: ISODate;
  items: Booking[];
}

/** The feasible itinerary produced by the planner. */
export interface TripPlan {
  tripId: TripId;
  userId: UserId;
  request: TripRequest;
  itinerary: ItineraryDay[];
  version: number;
  createdAt: ISODate;
}

/* ------------------------------------------------------------------ *
 * 3 · In-Trip Concierge  ->  TripPatch
 * ------------------------------------------------------------------ */

/** A spontaneous, in-trip need ("flight cancelled", "want a dinner tonight"). */
export interface LiveNeedRequest {
  text: string;
  at?: ISODate; // when the need arose
  location?: string; // where the traveller currently is
}

/** A single proposed change to the live trip. */
export interface PatchOp {
  op: "add" | "remove" | "replace";
  /** Which day of the itinerary this touches. */
  date: ISODate;
  before?: Booking;
  after?: Booking;
  reason: string;
}

/**
 * A proposed, safe change to an in-progress trip. Major changes require
 * human approval before they are committed to Trip State (see diagram).
 */
export interface TripPatch {
  tripId: TripId;
  userId: UserId;
  ops: PatchOp[];
  /** True when the change is large enough to need explicit human sign-off. */
  requiresApproval: boolean;
  rationale: string;
  proposedAt: ISODate;
}

/* ------------------------------------------------------------------ *
 * Trip State (persisted facts + version history)
 * ------------------------------------------------------------------ */

export interface TripState {
  tripId: TripId;
  userId: UserId;
  current: TripPlan;
  /** Prior versions, newest last. Enables rollback and audit. */
  history: TripPlan[];
}
