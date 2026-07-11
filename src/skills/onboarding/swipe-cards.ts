import type { ProfileCategory } from "../../shared/schemas.js";

export type SwipeDirection = "left" | "right" | "super";

export interface SwipeCard {
  id: string;
  round: number;
  roundTitle: string;
  title: string;
  subtitle: string;
  emoji: string;
  gradient: string;
  category: ProfileCategory;
}

/** Visual taste probes — tuned for day-trip / "few hours in a city" context. */
export const SWIPE_DECK: SwipeCard[] = [
  // Round 1 — How you spend free hours
  {
    id: "slow-cafe-morning",
    round: 1,
    roundTitle: "Free hours",
    title: "Slow morning at a local café",
    subtitle: "One great coffee, people-watching, no rush",
    emoji: "☕",
    gradient: "linear-gradient(135deg, #3d2c1e 0%, #8b6914 100%)",
    category: "pace",
  },
  {
    id: "packed-sightseeing",
    round: 1,
    roundTitle: "Free hours",
    title: "Pack in the highlights",
    subtitle: "See 4–5 spots before your next meeting",
    emoji: "🏃",
    gradient: "linear-gradient(135deg, #1a3a5c 0%, #2e6b9e 100%)",
    category: "pace",
  },
  {
    id: "neighborhood-wander",
    round: 1,
    roundTitle: "Free hours",
    title: "Wander a neighborhood with no plan",
    subtitle: "Turn left when something looks interesting",
    emoji: "🗺️",
    gradient: "linear-gradient(135deg, #2d4a3e 0%, #5a8f7b 100%)",
    category: "motivations",
  },
  {
    id: "spa-reset",
    round: 1,
    roundTitle: "Free hours",
    title: "Spa or wellness reset",
    subtitle: "Recharge before the next leg of the trip",
    emoji: "🧖",
    gradient: "linear-gradient(135deg, #4a3728 0%, #9b7b5e 100%)",
    category: "activities",
  },

  // Round 2 — Food & drink
  {
    id: "street-food",
    round: 2,
    roundTitle: "Food & drink",
    title: "Street food and market stalls",
    subtitle: "Grab something authentic on the go",
    emoji: "🥙",
    gradient: "linear-gradient(135deg, #5c3d1e 0%, #c47d2a 100%)",
    category: "food",
  },
  {
    id: "chef-table",
    round: 2,
    roundTitle: "Food & drink",
    title: "Sit-down meal at a chef's restaurant",
    subtitle: "One memorable reservation, worth the time",
    emoji: "🍽️",
    gradient: "linear-gradient(135deg, #1e1e2e 0%, #4a4a6a 100%)",
    category: "food",
  },
  {
    id: "wine-bar",
    round: 2,
    roundTitle: "Food & drink",
    title: "Natural wine bar with small plates",
    subtitle: "Relaxed evening, local pours",
    emoji: "🍷",
    gradient: "linear-gradient(135deg, #3d1f2e 0%, #7a3d52 100%)",
    category: "food",
  },
  {
    id: "familiar-chain",
    round: 2,
    roundTitle: "Food & drink",
    title: "Familiar international chain",
    subtitle: "Predictable, fast, zero risk",
    emoji: "🍔",
    gradient: "linear-gradient(135deg, #2a2a2a 0%, #555 100%)",
    category: "food",
  },

  // Round 3 — Places & vibe
  {
    id: "iconic-landmark",
    round: 3,
    roundTitle: "Places",
    title: "The iconic landmark everyone photographs",
    subtitle: "Sagrada Família energy — worth the crowds",
    emoji: "⛪",
    gradient: "linear-gradient(135deg, #4a3728 0%, #8b7355 100%)",
    category: "comfortRisk",
  },
  {
    id: "hidden-courtyard",
    round: 3,
    roundTitle: "Places",
    title: "Hidden courtyard locals actually use",
    subtitle: "Off the main tourist drag",
    emoji: "🏛️",
    gradient: "linear-gradient(135deg, #2d3d4a 0%, #5a7a8f 100%)",
    category: "comfortRisk",
  },
  {
    id: "contemporary-gallery",
    round: 3,
    roundTitle: "Places",
    title: "Contemporary art gallery",
    subtitle: "Quiet, air-conditioned, thought-provoking",
    emoji: "🎨",
    gradient: "linear-gradient(135deg, #1a1a2e 0%, #3d3d6a 100%)",
    category: "activities",
  },
  {
    id: "rooftop-sunset",
    round: 3,
    roundTitle: "Places",
    title: "Rooftop bar at golden hour",
    subtitle: "Views, a drink, dress up a little",
    emoji: "🌇",
    gradient: "linear-gradient(135deg, #4a2040 0%, #c45b8a 100%)",
    category: "accommodation",
  },

  // Round 4 — Stay & comfort signals
  {
    id: "boutique-design",
    round: 4,
    roundTitle: "Comfort",
    title: "Boutique hotel with design details",
    subtitle: "Curated, intimate, not a big chain",
    emoji: "🏨",
    gradient: "linear-gradient(135deg, #2e2e3e 0%, #5a5a7a 100%)",
    category: "accommodation",
  },
  {
    id: "business-efficient",
    round: 4,
    roundTitle: "Comfort",
    title: "Efficient business hotel near transit",
    subtitle: "Clean, reliable, close to meetings",
    emoji: "🏢",
    gradient: "linear-gradient(135deg, #1e2a3a 0%, #3d5a7a 100%)",
    category: "accommodation",
  },
  {
    id: "walk-everywhere",
    round: 4,
    roundTitle: "Comfort",
    title: "Walk 20 minutes to get somewhere great",
    subtitle: "Happy on foot, skip the taxi",
    emoji: "👟",
    gradient: "linear-gradient(135deg, #2d4a2d 0%, #5a8f5a 100%)",
    category: "pace",
  },
  {
    id: "private-transfer",
    round: 4,
    roundTitle: "Comfort",
    title: "Private transfer door to door",
    subtitle: "No figuring out local transit",
    emoji: "🚗",
    gradient: "linear-gradient(135deg, #1e1e1e 0%, #444 100%)",
    category: "transport",
  },

  // Round 5 — Deal-breakers
  {
    id: "tourist-trap-queue",
    round: 5,
    roundTitle: "Hard no",
    title: "45-minute queue at a tourist trap",
    subtitle: "Crowded, overpriced, not worth it",
    emoji: "🚫",
    gradient: "linear-gradient(135deg, #4a1a1a 0%, #8f2e2e 100%)",
    category: "dealBreakers",
  },
  {
    id: "early-alarm",
    round: 5,
    roundTitle: "Hard no",
    title: "5am alarm for an excursion",
    subtitle: "Early starts ruin the day",
    emoji: "⏰",
    gradient: "linear-gradient(135deg, #2a2a4a 0%, #4a4a7a 100%)",
    category: "dealBreakers",
  },
  {
    id: "noisy-hostel",
    round: 5,
    roundTitle: "Hard no",
    title: "Noisy hostel common room",
    subtitle: "Can't relax or take a call",
    emoji: "🔊",
    gradient: "linear-gradient(135deg, #3d2a1a 0%, #7a5a3a 100%)",
    category: "dealBreakers",
  },
  {
    id: "unsafe-feeling-area",
    round: 5,
    roundTitle: "Hard no",
    title: "Neighborhood that feels unsafe at night",
    subtitle: "Would cut the evening short",
    emoji: "⚠️",
    gradient: "linear-gradient(135deg, #1a1a1a 0%, #3d3d3d 100%)",
    category: "comfortRisk",
  },
];

export const SWIPE_ROUNDS = [
  { id: 1, title: "Free hours", subtitle: "You've landed. A few hours to yourself." },
  { id: 2, title: "Food & drink", subtitle: "How do you refuel between meetings?" },
  { id: 3, title: "Places", subtitle: "What pulls you out of the hotel?" },
  { id: 4, title: "Comfort", subtitle: "How you move and where you stay." },
  { id: 5, title: "Hard no", subtitle: "Swipe left on anything that kills the day." },
];
