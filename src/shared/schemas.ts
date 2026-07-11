/**
 * Shared JSON contracts for the travel agent.
 *
 * One `userId`, one `tripId`. Two stores:
 *   - Mem0        stores TASTE + durable preferences  -> TravellerProfile
 *   - Trip State  stores FACTS: bookings + itinerary  -> TripState / TripPlan
 *
 * The TravellerProfile below is a direct encoding of
 * docs/traveller-taste-profile-checklist.md. It follows the checklist's
 * modeling principles:
 *   - hard constraints are separated from soft preferences,
 *   - deal-breakers are strict exclusion rules,
 *   - per-category confidence + last-confirmed timestamps distinguish
 *     stated vs. inferred data,
 *   - passively-observed behaviour is kept as an evidence log.
 */

export type UserId = string;
export type TripId = string;
export type ISODate = string; // "2026-08-14" or full ISO timestamp
export type Scale1to5 = 1 | 2 | 3 | 4 | 5;

/** Device location captured during onboarding (for city-aware suggestions). */
export interface TravellerLocation {
  lat: number;
  lng: number;
  city?: string;
  country?: string;
  capturedAt: ISODate;
}

export type ConnectorId =
  | "google"
  | "apple"
  | "notion"
  | "obsidian"
  | "location";

export type ConnectorStatus = "available" | "connected" | "skipped" | "pending";

export interface ConnectedSource {
  id: ConnectorId;
  status: ConnectorStatus;
  connectedAt: ISODate;
  scopes?: string[];
}

/** Where a piece of profile data came from. */
export type ProvenanceSource = "stated" | "revealed" | "inferred";

/* ================================================================== *
 * TRAVELLER PROFILE  (durable taste, persisted to Mem0)
 * Categories mirror docs/traveller-taste-profile-checklist.md.
 * Every field is optional; a profile is built up incrementally.
 * ================================================================== */

/** Identity & context. */
export interface IdentityContext {
  homeCity?: string;
  departureAirports?: string[]; // IATA codes, e.g. ["SIN"]
  citizenships?: string[]; // country codes
  residence?: string;
  languages?: { language: string; proficiency: Scale1to5 }[];
  annualTripFrequency?: number;
  typicalTripLengthDays?: number;
  lifeStage?:
    | "single"
    | "couple"
    | "family-young-kids"
    | "family-teens"
    | "empty-nester"
    | "retired"
    | "other";
  dateFlexibility?: "fixed" | "somewhat-flexible" | "very-flexible";
  homeTimeZone?: string; // IANA tz
  devices?: string[];
}

/** Motivations & trip "jobs". */
export interface Motivations {
  primary?: string[]; // e.g. ["food", "culture", "relaxation"]
  desiredEmotion?: string; // free-text
  topJobs?: string[]; // the 3 outcomes a trip must deliver
  explorationVsReturn?: Scale1to5; // 1 = return favourites, 5 = always explore
  learningImportance?: Scale1to5;
  connectionFocus?: Scale1to5;
  recoveryVsProductivity?: Scale1to5; // 1 = recovery, 5 = productivity
  statusImportance?: Scale1to5;
  spiritual?: { enabled: boolean; notes?: string };
}

/** Pace, energy & structure. */
export interface PacePreferences {
  dailyActivityDensity?: "light" | "moderate" | "full";
  structureVsSpontaneity?: Scale1to5; // 1 = spontaneous, 5 = tightly planned
  energyPeak?: "morning" | "evening" | "either";
  earlyDepartureTolerance?: Scale1to5;
  walkingTolerance?: "low" | "medium" | "high";
  dailyDowntime?: { required: boolean; minutes?: number };
  lastMinuteChangeComfort?: Scale1to5;
  tripRhythm?: "slow-build" | "steady" | "peak-intensity";
}

/** Accommodation taste. */
export interface AccommodationTaste {
  types?: string[]; // ["boutique-hotel", "resort", "apartment", ...]
  vibe?: string[]; // tagged descriptors
  roomSize?: "cozy" | "comfortable" | "spacious" | "suite";
  bed?: string;
  viewImportance?: Scale1to5;
  bathroom?: string[];
  amenityMustHaves?: string[];
  dealBreakers?: string[]; // strict exclusions for lodging
  chainsVsIndependent?: "chains" | "independents" | "mix";
  characterVsModern?: Scale1to5; // 1 = character/historic, 5 = modern/pristine
}

export type Cabin = "economy" | "premium-economy" | "business" | "first";

/** Transport & flight preferences. */
export interface TransportPreferences {
  cabinShortHaul?: Cabin;
  cabinLongHaul?: Cabin;
  seat?: "window" | "aisle" | "no-preference";
  departureWindows?: string[]; // ["early-morning","midday","evening",...]
  airlineLoyalties?: string[];
  groundTransport?: string[]; // ["private-transfer","rental","rail","rideshare"]
  rentalCar?: string;
  connectionTolerance?: Scale1to5; // 1 = direct only, 5 = happy to connect
  railVsFlight?: "rail" | "flight" | "either";
  transitNeeds?: string; // mobility/comfort requirements
}

/** Food & drink (preferences; safety restrictions live in HardConstraints). */
export interface FoodPreferences {
  cuisineLoves?: string[];
  cuisineAvoids?: string[];
  adventurousness?: Scale1to5;
  diningStyle?: { fine?: number; casual?: number; informal?: number }; // % split
  alcohol?: string;
  mealTimingImportance?: Scale1to5;
  foodExperiences?: boolean; // classes, tastings, markets
  dealBreakers?: string[];
}

/** Activities & interests. */
export interface ActivityPreferences {
  categories?: string[]; // base content palette
  depthVsBreadth?: "depth" | "breadth" | "mix";
  physicalLevel?: Scale1to5;
  nicheInterests?: string[];
  shopping?: { importance: Scale1to5; style?: string };
  nightlife?: "none" | "low" | "moderate" | "high";
  wellness?: string[]; // spa, yoga, retreats
  bucketList?: string[];
}

/** Social context. */
export interface SocialContext {
  companions?: string[]; // ["solo","partner","kids","friends","extended-family"]
  children?: { age: number; needs?: string }[];
  meetOthers?: Scale1to5;
  privacyVsSociability?: Scale1to5; // 1 = private/secluded, 5 = social scene
  pets?: string;
  companionAccessibility?: string;
  decisionRole?: "sole" | "shared" | "delegated";
}

/** Budget & value. */
export interface BudgetValue {
  typicalRange?: { min: number; max: number; currency: string };
  flexibility?: Scale1to5;
  splurgeCategories?: string[];
  saveCategories?: string[];
  priceSensitivity?: Scale1to5;
  dealsVsSimplicity?: "deals" | "simplicity" | "mix";
  offSeasonOpen?: boolean;
}

/** Comfort, risk & novelty tolerance. */
export interface ComfortRiskTolerance {
  safetyPriority?: Scale1to5;
  comfortVsNovelty?: Scale1to5; // 1 = comfort, 5 = novelty
  frictionTolerance?: Scale1to5;
  offBeatenPath?: Scale1to5;
  activityRiskTolerance?: Scale1to5;
  languageBarrierComfort?: Scale1to5;
  disruptionResilience?: Scale1to5;
}

/** Sensory & environmental. */
export interface SensoryEnvironment {
  climates?: string[];
  heatTolerance?: Scale1to5;
  crowdTolerance?: Scale1to5;
  noiseSensitivity?: Scale1to5;
  cleanlinessThreshold?: Scale1to5;
  darknessNeed?: boolean;
  airQualitySensitivity?: { sensitive: boolean; notes?: string };
}

/** Brand, loyalty & ethics. */
export interface BrandLoyaltyEthics {
  hotelBrands?: string[];
  programs?: { program: string; status?: string }[];
  localVsGlobal?: "local" | "global" | "mix";
  sustainabilityImportance?: Scale1to5;
  payMoreForGreen?: Scale1to5;
  ethicalBoundaries?: string[];
}

/**
 * Hard constraints — treated as STRICT feasibility gates by the planner,
 * never as soft preferences. A destination/plan violating any of these is
 * rejected, not down-ranked.
 */
export interface HardConstraints {
  medicalConditions?: string[];
  medicationNeeds?: string;
  mobilityLimitations?: string[];
  religiousObservances?: string[];
  dietaryRestrictions?: string[]; // allergies / non-negotiable rules
  legalVisaExclusions?: string[]; // countries that cannot be visited
  insuranceConstraints?: string;
  blackoutDates?: { start: ISODate; end: ISODate }[];
}

/** Communication & decision style. */
export interface CommunicationStyle {
  channels?: string[]; // ["push","email","sms","whatsapp"]
  detailVsSummary?: Scale1to5; // 1 = summary, 5 = detailed
  optionCount?: "one" | "few" | "many";
  strictVsExploratory?: "strict" | "exploratory";
  /** Which changes may be auto-applied vs. always need human approval. */
  approvalThresholds?: string;
  decisionSpeed?: Scale1to5;
  openToExperiments?: boolean;
}

/** Deal-breakers & past regrets — strong negative preferences. */
export interface DealBreakersRegrets {
  neverAgain?: string[];
  regrets?: string[];
  favoriteTrips?: string[];
  biggestRuiner?: string;
  expectedServiceLevel?: "self-serve" | "responsive" | "concierge" | "white-glove";
}

/** A passively-observed signal (revealed behaviour), per the checklist. */
export interface EvidenceEntry {
  at: ISODate;
  signal: string; // e.g. "cabin-accepted", "activity-skipped", "post-trip-rating"
  detail: string;
  tripId?: TripId;
}

/** Category keys used for confidence + last-confirmed metadata. */
export type ProfileCategory =
  | "identity"
  | "motivations"
  | "pace"
  | "accommodation"
  | "transport"
  | "food"
  | "activities"
  | "social"
  | "budget"
  | "comfortRisk"
  | "sensory"
  | "brandLoyalty"
  | "constraints"
  | "communication"
  | "dealBreakers";

/**
 * The durable traveller profile. Persisted to Mem0, updated over time,
 * and independent of any single trip.
 */
export interface TravellerProfile {
  userId: UserId;

  identity: IdentityContext;
  motivations: Motivations;
  pace: PacePreferences;
  accommodation: AccommodationTaste;
  transport: TransportPreferences;
  food: FoodPreferences;
  activities: ActivityPreferences;
  social: SocialContext;
  budget: BudgetValue;
  comfortRisk: ComfortRiskTolerance;
  sensory: SensoryEnvironment;
  brandLoyalty: BrandLoyaltyEthics;
  constraints: HardConstraints;
  communication: CommunicationStyle;
  dealBreakers: DealBreakersRegrets;

  /** Free-text durable memories, before they are normalized into tags. */
  notes: string[];
  /** Passively-observed behaviour (see checklist "signals over time"). */
  evidence: EvidenceEntry[];

  /** Live device location (GPS coordinates, updated on each detect). */
  location?: TravellerLocation;
  /** Traveller-selected destination city (dropdown or free text). */
  destinationCity?: string;
  /** Third-party connectors the traveller has linked. */
  connectedSources?: ConnectedSource[];

  /** 0..1 confidence per category — how sure we are of this data. */
  confidence: Partial<Record<ProfileCategory, number>>;
  /** When each category was last explicitly confirmed by the traveller. */
  lastConfirmed: Partial<Record<ProfileCategory, ISODate>>;
  updatedAt: ISODate;
}

/** Ordered list of profile categories (for iteration/merge). */
export const PROFILE_CATEGORIES: ProfileCategory[] = [
  "identity",
  "motivations",
  "pace",
  "accommodation",
  "transport",
  "food",
  "activities",
  "social",
  "budget",
  "comfortRisk",
  "sensory",
  "brandLoyalty",
  "constraints",
  "communication",
  "dealBreakers",
];

/** An empty, fully-initialised profile ready to be populated. */
export function emptyProfile(userId: UserId, at: ISODate): TravellerProfile {
  return {
    userId,
    identity: {},
    motivations: {},
    pace: {},
    accommodation: {},
    transport: {},
    food: {},
    activities: {},
    social: {},
    budget: {},
    comfortRisk: {},
    sensory: {},
    brandLoyalty: {},
    constraints: {},
    communication: {},
    dealBreakers: {},
    notes: [],
    evidence: [],
    confidence: {},
    lastConfirmed: {},
    updatedAt: at,
  };
}

/**
 * Minimum-viable-profile categories (from the checklist): the smallest set
 * that still lets the planner produce a good trip without long onboarding.
 */
export const MINIMUM_VIABLE_CATEGORIES: ProfileCategory[] = [
  "identity",
  "motivations",
  "pace",
  "accommodation",
  "transport",
  "food",
  "activities",
  "budget",
  "comfortRisk",
  "sensory",
  "constraints",
  "communication",
];

/* ================================================================== *
 * Onboarding input
 * ================================================================== */

/**
 * Raw onboarding answers. Every category is optional and partial; onboarding
 * merges what is provided into the durable profile.
 */
export interface OnboardingAnswers {
  identity?: IdentityContext;
  motivations?: Motivations;
  pace?: PacePreferences;
  accommodation?: AccommodationTaste;
  transport?: TransportPreferences;
  food?: FoodPreferences;
  activities?: ActivityPreferences;
  social?: SocialContext;
  budget?: BudgetValue;
  comfortRisk?: ComfortRiskTolerance;
  sensory?: SensoryEnvironment;
  brandLoyalty?: BrandLoyaltyEthics;
  constraints?: HardConstraints;
  communication?: CommunicationStyle;
  dealBreakers?: DealBreakersRegrets;
  /** Anything the traveller volunteers as free text. */
  notes?: string[];
}

/* ================================================================== *
 * WHOLE-TRIP PLANNER  ->  TripPlan
 * ================================================================== */

export interface TripRequest {
  destination: string;
  startDate: ISODate;
  endDate: ISODate;
  travellers: number;
  budget?: number;
  mustHaves?: string[];
  /** Reviewed facts that the Director must preserve while planning. */
  confirmedBookings?: Booking[];
  /** Local, in-the-moment planning window; the Director never schedules past it. */
  dayWindow?: { startAt: ISODate; endAt: ISODate };
}

export interface FlightBooking {
  kind: "flight";
  from: string;
  to: string;
  depart: ISODate;
  arrive: ISODate;
  carrier?: string;
  cabin?: Cabin;
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
  startAt?: ISODate;
  endAt?: ISODate;
  /** Source used to ground a live Scout recommendation. */
  sourceUrl?: string;
}

export type Booking = FlightBooking | HotelBooking | Activity;

export interface ItineraryDay {
  date: ISODate;
  items: Booking[];
}

export interface TripPlan {
  tripId: TripId;
  userId: UserId;
  request: TripRequest;
  itinerary: ItineraryDay[];
  version: number;
  createdAt: ISODate;
}

/* ================================================================== *
 * IN-TRIP CONCIERGE  ->  TripPatch
 * ================================================================== */

export interface LiveNeedRequest {
  text: string;
  at?: ISODate;
  location?: string;
}

export interface PatchOp {
  op: "add" | "remove" | "replace";
  date: ISODate;
  before?: Booking;
  after?: Booking;
  reason: string;
}

export interface TripPatch {
  tripId: TripId;
  userId: UserId;
  ops: PatchOp[];
  requiresApproval: boolean;
  rationale: string;
  proposedAt: ISODate;
}

/* ================================================================== *
 * Trip State (persisted facts + version history)
 * ================================================================== */

export interface TripState {
  tripId: TripId;
  userId: UserId;
  current: TripPlan;
  history: TripPlan[];
}
