import type {
  ConnectorId,
  ConnectorStatus,
  TravellerLocation,
} from "./schemas.js";

export type { ConnectorId, ConnectorStatus, TravellerLocation };

export interface ConnectorInfo {
  id: ConnectorId;
  name: string;
  description: string;
  ready: boolean;
}

export const CONNECTORS: ConnectorInfo[] = [
  {
    id: "google",
    name: "Google",
    description: "Gmail + Calendar — past trips, bookings, meeting gaps",
    ready: true,
  },
  {
    id: "location",
    name: "Location",
    description: "Where you are right now — city-aware suggestions",
    ready: true,
  },
  {
    id: "notion",
    name: "Notion",
    description: "Paste a travel notes export",
    ready: true,
  },
  {
    id: "obsidian",
    name: "Obsidian",
    description: "Paste markdown from your travel vault",
    ready: true,
  },
  {
    id: "apple",
    name: "Apple Calendar",
    description: "Requires iOS app — coming soon",
    ready: false,
  },
];

/** Raw payload from a connector before normalization into TravellerProfile. */
export interface ImportPayload {
  source: ConnectorId;
  data: {
    emails?: { subject: string; snippet?: string }[];
    calendar?: { title: string; start?: string; location?: string }[];
    location?: TravellerLocation;
    text?: string;
  };
}
