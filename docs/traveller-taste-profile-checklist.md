# Traveller Taste Profile Checklist

A durable traveller profile should capture stable preferences, constraints, and decision patterns that persist across trips. The goal is to let an AI travel agent plan well from cold start, personalize recommendations over time, and replan during disruptions without re-asking core taste questions.

## Identity & context

| item | why it matters | how to elicit | data type | priority |
| --- | --- | --- | --- | --- |
| Home base city & primary departure airports | Determines realistic departure points, common routing patterns, and airport convenience defaults. | “What city do you usually travel from, and which airports are convenient for you?” | List (city + airport codes) | Must-have |
| Citizenship & resident status | Affects visa feasibility, entry rules, and destination eligibility. | “What passport(s) do you hold, and where do you currently reside?” | List (country enums) | Must-have |
| Languages spoken & proficiency | Changes destination fit, need for guides, and comfort in lower-English environments. | “Which languages do you speak comfortably when traveling?” | List (language + proficiency scale) | Nice-to-have |
| Typical annual leisure travel frequency | Segments casual vs frequent travellers and calibrates recommendation ambition. | “In a typical year, how many leisure trips do you take?” | Numeric | Must-have |
| Typical trip length | Constrains itinerary scope and number of stops. | “How many days is your ideal leisure trip?” | Numeric (days) | Must-have |
| Life stage & household composition | Shapes trip style, accommodation needs, and likely motivations. | “Which best describes your life stage and household?” | Enum | Must-have |
| Work pattern & date flexibility | Affects lead times, mid-trip extensions, and ability to move dates. | “How flexible are your travel dates usually?” | Enum | Nice-to-have |
| Time zone of home base | Useful for communications, remote work planning, and jet-lag-sensitive routing. | Derived from home city or asked directly. | Enum | Nice-to-have |
| Device ecosystem & digital comfort | Informs communication design and in-trip support experience. | “Which devices and apps do you rely on when traveling?” | List | Nice-to-have |

## Motivations & trip jobs

| item | why it matters | how to elicit | data type | priority |
| --- | --- | --- | --- | --- |
| Primary travel motivations | Drives destination, activity mix, and overall tone of recommendations. | “What are the main reasons you travel for leisure?” | Multi-select enum | Must-have |
| Desired emotional outcome | Anchors planning around feelings, not just logistics. | “After a truly great trip, how do you want to feel?” | Free-text | Must-have |
| Top 3 trip jobs | Encodes the core outcomes a trip must deliver. | “What three outcomes must your ideal trips deliver?” | Free-text (tagged) | Must-have |
| Exploration vs return-to-favorites | Guides whether to prioritize novelty or known wins. | “Do you prefer discovering new places or returning to places you already love?” | Scale 1–5 | Must-have |
| Learning & growth importance | Changes emphasis on classes, guides, deep context, and immersion. | “How important is learning or personal growth in your trips?” | Scale 1–5 | Nice-to-have |
| Relationship/connection focus | Shapes privacy, intimacy, and shared experiences. | “How much are your trips about deepening connection with a partner, friends, or family?” | Scale 1–5 | Nice-to-have |
| Recovery vs productivity orientation | Determines how restorative or output-oriented itineraries should feel. | “Are your leisure trips more about recovery or productivity?” | Scale 1–5 | Must-have |
| Status/signalling importance | Influences property choice, access, and prestige-sensitive options. | “How important is it that a trip feels impressive or high-status?” | Scale 1–5 | Nice-to-have |
| Spiritual/reflective dimension | Adds retreats, sacred spaces, and quiet time. | “Do you look for spiritual or reflective elements in travel?” | Boolean + free-text | Nice-to-have |

## Pace, energy & structure

| item | why it matters | how to elicit | data type | priority |
| --- | --- | --- | --- | --- |
| Preferred daily activity density | Prevents over-packed or under-designed days. | “On a typical day, how many planned activities do you enjoy?” | Enum | Must-have |
| Structure vs spontaneity | Determines how tightly planned the itinerary should be. | “Do you prefer a highly planned itinerary or lots of room for spontaneity?” | Scale 1–5 | Must-have |
| Morning vs evening energy | Helps schedule signature moments at the right time of day. | “Are you more energetic in the mornings or evenings when traveling?” | Enum | Nice-to-have |
| Early departure tolerance | Affects flight and tour timing. | “How do you feel about very early departures?” | Scale 1–5 | Must-have |
| Walking tolerance | Changes hotel placement and daily routing. | “How much walking per day feels good on a trip?” | Enum | Must-have |
| Need for daily downtime | Protects recovery and prevents burnout. | “Do you need guaranteed downtime most days?” | Boolean + duration | Must-have |
| Openness to last-minute changes | Determines how aggressively the agent can replan. | “How comfortable are you with last-minute plan changes if they improve the trip?” | Scale 1–5 | Must-have |
| Preferred trip rhythm | Helps design the arc of the trip, not just each day. | “Do you like trips that ramp up slowly, stay steady, or peak with intensity?” | Enum | Nice-to-have |

## Accommodation taste

| item | why it matters | how to elicit | data type | priority |
| --- | --- | --- | --- | --- |
| Preferred accommodation types | Narrows search space immediately. | “What kinds of places do you like to stay?” | Multi-select enum | Must-have |
| Desired vibe & atmosphere | Captures aesthetic taste and emotional fit. | “How would you describe your ideal hotel vibe in three words?” | Free-text (tagged) | Must-have |
| Room size/layout expectations | Prevents mismatch on space and usability. | “What’s your minimum acceptable room feel: cozy, spacious, suite-level?” | Enum | Must-have |
| Bed preferences | Protects sleep quality and comfort. | “Do you have strong preferences for bed size or firmness?” | Free-text + enum | Must-have |
| View/floor priorities | Helps with room selection and upgrade decisions. | “How important are views and floor level to you?” | Scale + enum | Nice-to-have |
| Bathroom preferences | Changes room category and property selection. | “What matters most to you in a bathroom?” | Multi-select enum | Nice-to-have |
| Hotel amenity must-haves | Constrains property selection. | “Which hotel amenities are must-haves for you?” | Multi-select enum | Must-have |
| Accommodation deal-breakers | Prevents bad recommendations. | “What would make you refuse a hotel even if other things looked good?” | Free-text | Must-have |
| Chains vs independents | Balances consistency vs uniqueness. | “Do you prefer well-known brands, unique independents, or a mix?” | Enum | Nice-to-have |
| Character vs pristine modernity | Distinguishes taste for historic charm vs polished predictability. | “How do you feel about older ‘character’ properties versus modern pristine ones?” | Scale 1–5 | Nice-to-have |

## Transport & flight preferences

| item | why it matters | how to elicit | data type | priority |
| --- | --- | --- | --- | --- |
| Preferred flight cabin by trip type | Sets the comfort envelope for routing. | “Which cabin do you typically book for short-haul and long-haul flights?” | Enum per segment type | Must-have |
| Seat preferences | Improves physical comfort and airline fit. | “Do you prefer aisle or window, and any other seating preferences?” | Enum | Must-have |
| Preferred departure/arrival windows | Prevents red-eyes or awkward arrivals. | “What times of day do you prefer to depart and arrive?” | Multi-select time bands | Must-have |
| Airline/alliance loyalties | Enables point optimization and status benefits. | “Do you have preferred airlines or alliances?” | List | Must-have |
| Ground transport style | Shapes transfers and local movement. | “How do you prefer to get around at destinations?” | Multi-select enum | Must-have |
| Rental car preferences | Matters where self-drive is common. | “If you rent cars, what are your preferences?” | Free-text + enum | Nice-to-have |
| Direct vs connection tolerance | Changes routing and price/comfort trade-offs. | “How much do you mind connections compared with direct flights?” | Scale 1–5 | Must-have |
| Rail vs flight preference | Important in regions where both are viable. | “Where there’s a choice, do you usually prefer trains or planes?” | Enum | Nice-to-have |
| Transit comfort or mobility requirements | Needed for accessible and humane transport planning. | “Do you have any mobility or comfort needs for flights or trains?” | Free-text | Must-have |

## Food & drink

| item | why it matters | how to elicit | data type | priority |
| --- | --- | --- | --- | --- |
| Dietary rules & restrictions | Non-negotiable for safety and fit. | “Do you follow any dietary rules or have any allergies?” | Multi-select enum + free-text | Must-have |
| Cuisine loves & avoidances | Improves restaurant and destination fit. | “Which cuisines do you love, and are there any you avoid?” | Multi-select enum | Must-have |
| Food adventurousness | Determines whether to suggest street food, tasting menus, or familiar choices. | “How adventurous are you with food when traveling?” | Scale 1–5 | Must-have |
| Dining style | Shapes booking mix across fine dining, casual spots, markets, and hotel dining. | “What’s your ideal mix of fine dining, casual restaurants, and informal spots?” | Percent split or scale | Nice-to-have |
| Alcohol preferences | Changes nightlife, pairings, and wellness fit. | “Do you drink alcohol, and if so, what do you usually enjoy?” | Free-text + enum | Nice-to-have |
| Meal timing importance | Helps pace days and avoid poor energy management. | “How important is keeping regular meal times?” | Scale 1–5 | Must-have |
| Interest in food-led experiences | Adds classes, tastings, markets, and tours. | “Are you interested in food-focused experiences?” | Boolean + list | Nice-to-have |
| Food deal-breakers | Avoids contexts that reliably disappoint. | “What kind of food situation would ruin a day for you?” | Free-text | Must-have |

## Activities & interests

| item | why it matters | how to elicit | data type | priority |
| --- | --- | --- | --- | --- |
| Interest in major activity categories | Provides the base content palette for itinerary generation. | “Which kinds of activities do you usually enjoy on trips?” | Multi-select enum | Must-have |
| Depth vs breadth preference | Determines whether to specialize or sample widely. | “Do you prefer going deep into one or two themes or trying a bit of everything?” | Enum | Nice-to-have |
| Desired physical activity level | Aligns activity load to preference and capability. | “How physically active do you want your trips to be?” | Scale 1–5 | Must-have |
| Specific niche interests | Enables high-precision recommendations. | “Any specific interests we should always consider?” | Free-text (tagged) | Must-have |
| Shopping style | Shapes neighborhood, free-time, and budget decisions. | “How important is shopping, and what kind do you enjoy?” | Free-text + scale | Nice-to-have |
| Nightlife preference | Avoids misaligned destinations and lodging zones. | “What level of nightlife do you enjoy?” | Enum | Must-have |
| Wellness/spa interest | Adds recovery and wellness programming. | “Do you enjoy wellness activities such as spa, yoga, or retreats?” | Boolean + list | Nice-to-have |
| Bucket-list themes | Captures long-term aspirations across many trips. | “Are there any lifelong travel experiences or themes on your bucket list?” | Free-text | Nice-to-have |

## Social context

| item | why it matters | how to elicit | data type | priority |
| --- | --- | --- | --- | --- |
| Typical travel companions | Changes rooms, activities, tone, and logistics. | “Who do you usually travel with?” | Multi-select enum | Must-have |
| Children’s ages and needs | Essential for family-fit planning. | “If you travel with children, what are their ages and any key needs?” | List | Must-have if applicable |
| Meeting others vs staying private | Shapes shared vs private experiences. | “Do you enjoy meeting new people on trips or prefer keeping to your own group?” | Scale 1–5 | Nice-to-have |
| Privacy vs sociability in accommodation | Distinguishes social hotels from secluded properties. | “At your hotel, do you prefer a social scene or privacy and seclusion?” | Scale 1–5 | Must-have |
| Pet travel | Adds specific transport and accommodation constraints. | “Do you ever travel with pets?” | Boolean + free-text | Nice-to-have |
| Accessibility needs for companions | Important for inclusive planning. | “Does anyone you travel with have mobility or accessibility needs?” | Free-text | Must-have |
| Group decision dynamics | Affects approval flows and recommendation presentation. | “Are you usually the final decision-maker, or do others need to agree?” | Enum | Must-have |

## Budget & value

| item | why it matters | how to elicit | data type | priority |
| --- | --- | --- | --- | --- |
| Comfortable total trip budget | Defines the planning envelope. | “For a typical leisure trip, what total budget feels comfortable?” | Numeric range | Must-have |
| Budget flexibility | Shows how much the agent can stretch for exceptional options. | “How flexible is that budget if there’s an exceptional opportunity?” | Scale 1–5 | Nice-to-have |
| Splurge categories | Helps allocate budget where it creates the most delight. | “What parts of a trip do you prefer to splurge on?” | Multi-select enum | Must-have |
| Save categories | Helps economize without harming experience quality. | “Where are you happy to save?” | Multi-select enum | Must-have |
| Price sensitivity | Influences how options should be ranked and framed. | “How sensitive are you to price changes for nicer options?” | Scale 1–5 | Must-have |
| Deals vs simplicity preference | Distinguishes bargain hunters from convenience seekers. | “Do you enjoy finding great deals or prefer straightforward booking?” | Enum | Nice-to-have |
| Off-season value openness | Expands recommendation space when value matters. | “Would you consider shoulder or off-season travel for better value?” | Boolean | Nice-to-have |

## Comfort, risk & novelty tolerance

| item | why it matters | how to elicit | data type | priority |
| --- | --- | --- | --- | --- |
| Safety priority | Strongly shapes destination and neighborhood choices. | “How strongly do you prioritize perceived safety when choosing destinations?” | Scale 1–5 | Must-have |
| Comfort vs novelty orientation | Core signal for recommendation diversity and challenge level. | “On trips, do you lean more toward comfort or novelty?” | Scale 1–5 | Must-have |
| Tolerance for travel friction | Determines fit for remote, complex, or infrastructure-light journeys. | “How much travel friction are you willing to tolerate for special experiences?” | Scale 1–5 | Must-have |
| Off-the-beaten-path appetite | Guides whether to favor classic highlights or less-touristed places. | “How interested are you in off-the-beaten-path places?” | Scale 1–5 | Must-have |
| Risk tolerance for activities | Keeps adventure suggestions within acceptable bounds. | “How do you feel about higher-risk or adrenaline activities?” | Scale 1–5 | Must-have |
| Comfort with language/cultural barriers | Affects fit for deeper immersion destinations. | “How comfortable are you in places where you don’t speak the language?” | Scale 1–5 | Nice-to-have |
| Resilience to disruptions | Helps decide how conservative a plan should be. | “How well do you cope when things go wrong on a trip?” | Scale 1–5 | Nice-to-have |

## Sensory & environmental

| item | why it matters | how to elicit | data type | priority |
| --- | --- | --- | --- | --- |
| Climate preferences | Drives destination and season selection. | “What climates do you enjoy most when traveling?” | Multi-select enum | Must-have |
| Heat/humidity tolerance | Helps avoid environments that feel draining or oppressive. | “How do you handle heat and humidity?” | Scale 1–5 | Must-have |
| Crowd tolerance | Affects neighborhood choice, seasonality, and activity timing. | “How comfortable are you in crowded tourist areas?” | Scale 1–5 | Must-have |
| Noise sensitivity | Crucial for hotel placement and sleep quality. | “How sensitive are you to noise when sleeping?” | Scale 1–5 | Must-have |
| Cleanliness threshold | Distinguishes rustic tolerance from high-comfort needs. | “How much do cleanliness and general upkeep affect your enjoyment?” | Scale 1–5 | Must-have |
| Need for darkness/light control | Matters for room selection and sleep support. | “Do you need very dark rooms to sleep well?” | Boolean | Nice-to-have |
| Air quality sensitivity | Important for destination and season screening. | “Are you sensitive to air quality, smoke, or pollution?” | Boolean + free-text | Nice-to-have |

## Brand, loyalty & ethics

| item | why it matters | how to elicit | data type | priority |
| --- | --- | --- | --- | --- |
| Hotel brand loyalties | Enables perks and narrows accommodation recommendations. | “Do you have preferred hotel brands or chains?” | List | Nice-to-have |
| Membership programs & status tiers | Lets the agent preserve benefits and optimize upgrades. | “Which travel loyalty programs do you belong to, and what status do you have?” | List | Nice-to-have |
| Local vs global brand preference | Changes the style of recommendations. | “Do you prefer local independent brands or global names?” | Enum | Nice-to-have |
| Sustainability importance | Shapes transport, hotel, and activity choices. | “How important are sustainability and environmental impact in your travel decisions?” | Scale 1–5 | Must-have |
| Willingness to pay more for greener options | Converts ethical intent into practical recommendation logic. | “Would you pay more for more sustainable options?” | Scale 1–5 | Nice-to-have |
| Ethical boundaries | Prevents unacceptable experiences. | “Are there any ethical boundaries we should never cross?” | Free-text | Must-have |

## Hard constraints

| item | why it matters | how to elicit | data type | priority |
| --- | --- | --- | --- | --- |
| Medical conditions relevant to travel | Needed to avoid unsafe climates, altitudes, and activities. | “Are there medical conditions we should consider when planning?” | Free-text | Must-have |
| Medication/storage needs | Affects hotel and transport requirements. | “Do you have any medication storage or access needs while traveling?” | Free-text | Nice-to-have |
| Mobility limitations | Affects accessibility screening across the trip. | “Do you have any mobility limitations such as stairs, long walks, or uneven ground?” | Free-text | Must-have |
| Religious observances | Shapes food, timing, worship access, and local fit. | “Do you observe religious practices that affect travel?” | Free-text | Must-have |
| Legal/visa exclusions | Prevents infeasible destination suggestions. | “Are there countries you cannot or prefer not to visit for legal or visa reasons?” | List | Must-have |
| Insurance-related constraints | Can restrict risk levels or destination classes. | “Do you have insurance requirements that affect where you can go or what you can do?” | Free-text | Nice-to-have |
| Impossible date windows | Avoids impossible or low-probability planning windows. | “Are there times of year you absolutely cannot travel?” | List (date ranges) | Must-have |

## Communication & decision style

| item | why it matters | how to elicit | data type | priority |
| --- | --- | --- | --- | --- |
| Preferred communication channels | Ensures updates reach the traveller in the right medium. | “How should travel updates reach you?” | Multi-select enum | Must-have |
| Detail vs summary preference | Changes how plans and disruptions are presented. | “Do you prefer detailed itineraries or high-level summaries?” | Scale 1–5 | Must-have |
| Ideal number of options | Prevents overload or under-choice. | “How many options do you like to see when making decisions?” | Enum | Must-have |
| Strict fit vs exploratory recommendations | Controls how much the system can surprise the traveller. | “Should we strictly follow your known preferences or occasionally suggest something outside them?” | Enum | Must-have |
| Approval thresholds for changes | Central for autonomous replanning during disruptions. | “Which changes can be made automatically, and which always need your approval?” | Free-text mapped to rules | Must-have |
| Decision speed/style | Helps time nudges, holds, and reminders. | “Do you decide quickly or prefer time to think and compare?” | Scale 1–5 | Nice-to-have |
| Openness to experimentation for taste learning | Supports exploration without damaging trust. | “Are you open to occasional experimental suggestions so the system can learn your taste better?” | Boolean | Nice-to-have |

## Deal-breakers & past regrets

| item | why it matters | how to elicit | data type | priority |
| --- | --- | --- | --- | --- |
| Never-again destinations or experiences | Avoids repeating strongly negative patterns. | “Are there any destinations or types of experiences you’d never want to repeat?” | Free-text | Must-have |
| Top past travel regrets | Reveals failure modes to design around. | “What are the biggest regrets from past trips?” | Free-text | Must-have |
| Favorite trips and why | Best compact source of revealed positive taste. | “Tell us about your three favorite trips and why they were great.” | Free-text | Must-have |
| Single biggest trip ruiner | Captures the strongest negative preference. | “What is the single biggest thing that would ruin a trip for you?” | Free-text | Must-have |
| Expected service level | Helps calibrate response style, speed, and concierge intensity. | “What level of service and responsiveness do you expect from travel support?” | Enum | Nice-to-have |

## Minimum viable profile

This is the smallest set of fields that still lets an agent plan a good trip and replan intelligently without a long onboarding flow.

- Home base city and primary airports.
- Citizenship/passport(s).
- Typical trip length.
- Primary travel motivations.
- Desired emotional outcome of a great trip.
- Exploration vs return-to-favorites.
- Preferred daily activity density.
- Structure vs spontaneity.
- Walking tolerance.
- Preferred accommodation types.
- Desired hotel vibe.
- Accommodation must-haves and deal-breakers.
- Preferred flight cabin, seat, and time windows.
- Airline loyalties.
- Ground transport style.
- Dietary restrictions and top cuisine preferences.
- Major activity interests.
- Desired physical activity level.
- Comfortable budget range.
- Splurge vs save categories.
- Safety priority.
- Comfort vs novelty orientation.
- Tolerance for travel friction.
- Climate preference.
- Crowd and noise tolerance.
- Medical, mobility, religious, and legal constraints.
- Preferred communication channel.
- Detail vs summary preference.
- Number of options to show.
- Approval thresholds for changes.
- Biggest deal-breakers.
- One favorite trip and one regretted trip with reasons.

## Signals to capture passively over time

Some parts of taste are better learned from behavior than from direct questioning. These signals should update the profile continuously.

- Destinations viewed, saved, inquired about, and booked.
- Seasons and climates actually chosen.
- Airlines, cabins, hotels, and neighborhoods repeatedly accepted or rejected.
- Actual spend versus stated budget.
- Where overspend happens willingly.
- Activities skipped, extended, or added in trip.
- Time-of-day behavior patterns.
- Dining bookings accepted versus declined.
- Reactions to experimental or slightly off-profile recommendations.
- Post-trip ratings, compliments, complaints, and free-text feedback.
- Language used in messages, especially recurring praise or frustration terms.
- Group composition changes across trips.
- Frequency of private versus shared experiences.
- Disruption behavior, including tolerance for reroutes, delays, or hotel swaps.
- Actual approval patterns, such as what the traveller approves immediately versus wants to review carefully.

## Implementation notes

To keep the profile durable and useful, each field should be stored separately from any single trip. A good structure is to keep stable attributes, soft preferences, hard constraints, confidence scores, and evidence history distinct from one another.

Recommended modeling principles:

- Separate hard constraints from soft preferences.
- Store both stated preference and revealed behavior.
- Use confidence scores so the system knows what is inferred versus explicit.
- Keep timestamps and last-confirmed dates on important fields.
- Allow multiple companion-context variants where needed, such as solo, couple, and family travel modes.
- Preserve free-text memories, but normalize recurring themes into structured tags.
- Track deal-breakers as strict exclusion rules, not just low-ranked dislikes.

## Onboarding surfaces (Person 1)

Taste is collected through two complementary channels:

| Channel | What it captures | Confidence |
| --- | --- | --- |
| **Telegram swipe mini app** | Visual preference probes (pace, food, accommodation vibe, deal-breakers) | 0.85 inferred |
| **Telegram chat with Hermes** | Hard facts (home city, passport, budget, dietary restrictions, communication) | 1.0 stated |

Swipe cards map to `TravellerProfile` categories via `src/skills/onboarding/swipe.ts`.
Each swipe also appends an `evidence[]` entry (`swipe-accept` / `swipe-reject`).

**Minimum viable via swipe alone:** motivations, pace, accommodation, food, activities,
comfort/risk, sensory, deal-breakers (soft signals). Chat gap-fill still required for
identity, budget, constraints, and communication before `planTrip()` can run safely.

**Future context layers (not yet implemented):** Gmail / Google Calendar import for
situational context (meeting times, flight confirmations) on top of durable taste.

### Connect-first flow (mini app Act 0)

Before taste swipes, the traveller may link:

| Connector | Status | What we extract |
| --- | --- | --- |
| **Google** (Gmail + Calendar) | OAuth when `GOOGLE_CLIENT_ID` set | Booking emails, flight/hotel subjects, upcoming calendar gaps |
| **Location** | Device GPS in mini app | Current city → `profile.location` + `identity.homeCity` hint |
| **Notion / Obsidian** | Paste export | Free-text travel notes → `notes[]` + dietary/tags |
| **Apple Calendar** | Planned (native iOS) | Not available in Telegram Web App |

Imported signals flow through `applyImport()` → `onboardUser()` → Mem0, with
`connectedSources[]` tracking what was linked. Swipe onboarding runs after connect.
