import type { Mem0Client } from "../../shared/mem0-client.js";
import type {
  ConnectedSource,
  OnboardingAnswers,
  TravellerProfile,
  UserId,
} from "../../shared/schemas.js";
import type { ImportPayload, TravellerLocation } from "../../shared/import-schemas.js";
import { onboardUser, type OnboardingDeps } from "./index.js";

/** Map imported context into TravellerProfile fields + notes. */
export function importToAnswers(payload: ImportPayload): OnboardingAnswers {
  const answers: OnboardingAnswers = {};
  const notes: string[] = [];

  if (payload.data.location) {
    const loc = payload.data.location;
    answers.identity ??= {};
    if (loc.city) answers.identity.homeCity = loc.city;
    notes.push(`current location: ${loc.city ?? "unknown"}, ${loc.country ?? ""}`.trim());
  }

  for (const ev of payload.data.calendar ?? []) {
    const t = ev.title.toLowerCase();
    if (/flight|airport|✈/.test(t)) {
      notes.push(`calendar: flight — ${ev.title}`);
      answers.transport ??= {};
    }
    if (/hotel|check-in|airbnb|stay/.test(t)) {
      notes.push(`calendar: stay — ${ev.title}`);
      answers.accommodation ??= {};
      answers.accommodation.types = uniquePush(
        answers.accommodation.types,
        "business-hotel",
      );
    }
    if (/lunch|dinner|restaurant|coffee|food/.test(t)) {
      notes.push(`calendar: food — ${ev.title}`);
      answers.food ??= {};
      answers.food.cuisineLoves = uniquePush(answers.food.cuisineLoves, "local");
    }
    if (/meeting|call|sync/.test(t)) {
      notes.push(`calendar: work block — ${ev.title}`);
      answers.pace ??= {};
      answers.pace.dailyActivityDensity = "light";
    }
  }

  for (const email of payload.data.emails ?? []) {
    const s = `${email.subject} ${email.snippet ?? ""}`.toLowerCase();
    notes.push(`email signal: ${email.subject}`);
    if (/business|premium economy|club/.test(s)) {
      answers.transport ??= {};
      answers.transport.cabinLongHaul = "business";
    }
    if (/boutique|design hotel/.test(s)) {
      answers.accommodation ??= {};
      answers.accommodation.types = uniquePush(
        answers.accommodation.types,
        "boutique-hotel",
      );
    }
  }

  if (payload.data.text) {
    notes.push(`imported notes (${payload.source}): ${payload.data.text.slice(0, 200)}`);
    if (/vegetarian|vegan|halal|kosher|allergy/i.test(payload.data.text)) {
      answers.constraints ??= {};
      answers.constraints.dietaryRestrictions = uniquePush(
        answers.constraints.dietaryRestrictions,
        "see-imported-notes",
      );
    }
  }

  if (notes.length) answers.notes = notes;
  return answers;
}

export async function applyImport(
  userId: UserId,
  payload: ImportPayload,
  deps: OnboardingDeps,
): Promise<TravellerProfile> {
  const now = deps.now ?? (() => new Date().toISOString());
  const stampedAt = now();
  const answers = importToAnswers(payload);

  const profile = await onboardUser(userId, answers, deps);

  profile.connectedSources = upsertSource(profile.connectedSources, {
    id: payload.source,
    status: "connected",
    connectedAt: stampedAt,
  });

  if (payload.data.location) {
    profile.location = payload.data.location;
    profile.confidence.identity = 0.9;
  } else {
    profile.confidence.motivations = Math.min(
      profile.confidence.motivations ?? 0.75,
      0.75,
    );
  }

  await deps.mem0.recordEvidence(userId, {
    at: stampedAt,
    signal: `import-${payload.source}`,
    detail: JSON.stringify(payload.data).slice(0, 500),
  });

  profile.updatedAt = stampedAt;
  await deps.mem0.saveProfile(profile);
  return profile;
}

export function upsertSource(
  existing: ConnectedSource[] | undefined,
  source: ConnectedSource,
): ConnectedSource[] {
  const list = existing ?? [];
  const idx = list.findIndex((s) => s.id === source.id);
  if (idx >= 0) list[idx] = source;
  else list.push(source);
  return list;
}

function uniquePush(list: string[] | undefined, value: string): string[] {
  const arr = list ?? [];
  return arr.includes(value) ? arr : [...arr, value];
}

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<{ city?: string; country?: string }> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
  const res = await fetch(url, {
    headers: { "User-Agent": "HermesTravelAgent/0.1" },
  });
  if (!res.ok) return {};
  const data = (await res.json()) as {
    address?: { city?: string; town?: string; country?: string };
  };
  const city = data.address?.city ?? data.address?.town;
  return { city, country: data.address?.country };
}

export function buildLocation(
  lat: number,
  lng: number,
  city?: string,
  country?: string,
  at?: string,
): TravellerLocation {
  return { lat, lng, city, country, capturedAt: at ?? new Date().toISOString() };
}
