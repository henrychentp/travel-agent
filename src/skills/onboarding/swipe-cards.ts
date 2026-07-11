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
  imageUrl: string;
  category: ProfileCategory;
}

const UNSPLASH_IMAGES: Record<string, string> = {
  "slow-cafe-morning": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=85",
  "packed-sightseeing": "https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=1200&q=85",
  "neighborhood-wander": "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=85",
  "spa-reset": "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=85",
  "street-food": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=85",
  "chef-table": "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1200&q=85",
  "wine-bar": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=85",
  "familiar-chain": "https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=1200&q=85",
  "iconic-landmark": "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1200&q=85",
  "hidden-courtyard": "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1200&q=85",
  "contemporary-gallery": "https://images.unsplash.com/photo-1564399579883-451a5d44ec08?auto=format&fit=crop&w=1200&q=85",
  "rooftop-sunset": "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=85",
  "boutique-design": "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85",
  "business-efficient": "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1200&q=85",
  "walk-everywhere": "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=1200&q=85",
  "private-transfer": "https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1200&q=85",
  "tourist-trap-queue": "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1200&q=85",
  "early-alarm": "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=85",
  "noisy-hostel": "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=85",
  "unsafe-feeling-area": "https://images.unsplash.com/photo-1519608487953-e999c86e7454?auto=format&fit=crop&w=1200&q=85",
};

/** Visual taste probes — tuned for day-trip / "few hours in a city" context. */
const CARD_DEFINITIONS: Omit<SwipeCard, "imageUrl">[] = [
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

export const SWIPE_DECK: SwipeCard[] = CARD_DEFINITIONS.map((card) => ({
  ...card,
  imageUrl: UNSPLASH_IMAGES[card.id]!,
}));

export const SWIPE_ROUNDS = [
  { id: 1, title: "Free hours", subtitle: "You've landed. A few hours to yourself." },
  { id: 2, title: "Food & drink", subtitle: "How do you refuel between meetings?" },
  { id: 3, title: "Places", subtitle: "What pulls you out of the hotel?" },
  { id: 4, title: "Comfort", subtitle: "How you move and where you stay." },
  { id: 5, title: "Hard no", subtitle: "Swipe left on anything that kills the day." },
];
