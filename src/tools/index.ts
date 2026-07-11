/**
 * Live Tools — external data the skills call on.
 *
 * Flights · Hotels · Maps · Weather · Events
 *
 * All stubbed. Each method is where a real API integration (Amadeus, Booking,
 * Google Maps, OpenWeather, Ticketmaster, ...) plugs in behind a stable
 * interface so skills stay decoupled from providers.
 */

import type { FlightBooking, HotelBooking, Activity } from "../shared/schemas.js";

export interface FlightQuery {
  from: string;
  to: string;
  depart: string;
  travellers: number;
}

export interface HotelQuery {
  location: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}

export interface LiveTools {
  searchFlights(q: FlightQuery): Promise<FlightBooking[]>;
  searchHotels(q: HotelQuery): Promise<HotelBooking[]>;
  searchActivities(location: string, date: string): Promise<Activity[]>;
  weather(location: string, date: string): Promise<{ summary: string; tempC?: number }>;
  events(location: string, date: string): Promise<Activity[]>;
}

/** Stub implementation returning empty results. TODO: wire real providers. */
export class StubLiveTools implements LiveTools {
  async searchFlights(_q: FlightQuery): Promise<FlightBooking[]> {
    return [];
  }
  async searchHotels(_q: HotelQuery): Promise<HotelBooking[]> {
    return [];
  }
  async searchActivities(_location: string, _date: string): Promise<Activity[]> {
    return [];
  }
  async weather(_location: string, _date: string) {
    return { summary: "unknown" };
  }
  async events(_location: string, _date: string): Promise<Activity[]> {
    return [];
  }
}

export function createLiveTools(): LiveTools {
  return new StubLiveTools();
}
