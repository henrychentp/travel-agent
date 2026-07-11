/** Curated destination cities for the onboarding dropdown. */
export const DESTINATION_CITIES = [
  "Amsterdam",
  "Athens",
  "Auckland",
  "Bangkok",
  "Barcelona",
  "Berlin",
  "Bogotá",
  "Budapest",
  "Buenos Aires",
  "Cairo",
  "Cape Town",
  "Chicago",
  "Copenhagen",
  "Dubai",
  "Dublin",
  "Edinburgh",
  "Florence",
  "Hong Kong",
  "Istanbul",
  "Kyoto",
  "Lisbon",
  "London",
  "Los Angeles",
  "Madrid",
  "Marrakech",
  "Melbourne",
  "Mexico City",
  "Milan",
  "Montreal",
  "Munich",
  "New York",
  "Osaka",
  "Paris",
  "Prague",
  "Rome",
  "San Francisco",
  "Seoul",
  "Singapore",
  "Stockholm",
  "Sydney",
  "Taipei",
  "Tokyo",
  "Toronto",
  "Vancouver",
  "Vienna",
  "Zurich",
] as const;

export function normalizeCityName(city: string): string {
  return city.trim().replace(/\s+/g, " ");
}

export function isValidCityName(city: string): boolean {
  const normalized = normalizeCityName(city);
  return normalized.length >= 2 && normalized.length <= 80;
}
