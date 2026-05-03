# Agent Context & Rules (`AGENTS.md`)

This file defines project context, architecture rules, and data-flow decisions for AI agents working on Trip Mate.

## 1. Project Context & Tech Stack

**Project:** Trip Mate

**Goal:** A small travel preparation app for users who keep a list of trips and need basic destination, weather, and packing guidance.

This is a pet project. Keep implementation practical and finishable in several hours. If a requested feature starts to require complex auth, permissions, syncing, historical weather, collaboration, or heavy data modeling, call that out and propose a smaller MVP alternative.

**Core Stack:**
- **Framework:** Next.js with App Router
- **Frontend:** React + TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui where it helps, especially dropdown/select/popover flows
- **Backend:** Next.js route handlers for app API and server-side integration logic
- **Database:** Supabase Postgres
- **Auth:** No Supabase Auth for MVP
- **User Identity:** Anonymous `owner_key` generated in the browser and stored in `localStorage`
- **Deployment:** Vercel

## 2. Product Scope

**MVP pages:**
- `/`: empty main page with a side panel that lists the current browser user's trips
- `/[trip_id]`: trip detail page plus the same side panel
- New trip creation is a modal, not a route

**MVP user flow:**
1. Browser gets or creates an anonymous user id in `localStorage`.
2. Sidebar fetches trips for that `owner_key`.
3. User opens the new trip modal.
4. Destination input calls a debounced geocoding endpoint.
5. User chooses destination, dates, and trip type.
6. App creates a trip in Supabase.
7. App navigates to `/[trip_id]` or updates the current view.
8. Trip detail fetches the saved trip first.
9. Country facts and fresh weather are fetched from the saved trip fields.
10. Packing suggestions are calculated from trip data plus weather.

**Avoid for MVP unless explicitly requested:**
- Supabase Auth
- User profiles table
- Shared/collaborative editing
- Saved packing list interactions
- Multi-city trips
- Calendar export implementation
- Historical climate averages for far-future trips
- Complex caching/invalidation layers

## 3. Core Data Rules

**Single source of truth:** The `trips` table is the source of truth for trip data.

Do not treat local storage, weather responses, or packing suggestions as canonical trip state.

**Local storage stores identity only:**
```ts
localStorage["tripMate.anonymousUserId"] = "<uuid>"
```

Optional local UI caches are allowed later, but the app must be able to recover from only the anonymous id and database data.

**Derived data:**
- Country facts are fetched by `trip.country_code`.
- Weather is fetched fresh by `trip.latitude`, `trip.longitude`, `trip.date_start`, and `trip.date_end`.
- Packing suggestions are recalculated each time from `trip`, `weather`, and `trip.trip_type`.

**Dependency direction:**
```text
trip -> country facts
trip -> weather
trip + weather -> packing suggestions
```

Avoid flows where weather or packing controls trip persistence.

## 4. Database Design

Use only two tables for MVP: `countries` and `trips`.

Do not add a `users` or `profiles` table until there is real user-level data, such as email, display name, preferences, units, onboarding state, subscription data, or migration to real auth.

### `countries`

Seed once from REST Countries and read during app usage.

Use ISO alpha-2 country code as the primary key because Open-Meteo geocoding returns `country_code` as alpha-2.

Recommended columns:
```sql
countries
- code text primary key -- alpha-2, e.g. "BE"
- cca2 text
- name_common text not null
- currencies jsonb
- languages jsonb
- timezones text[]
- region text
- subregion text
- borders text[]
- flag text
- landlocked boolean
- gini jsonb
```

REST Countries populated from endpoint:
```text
https://restcountries.com/v3.1/all?fields=name,cc2,currencies,languages,timezones,region,subregion,borders,flag,landlocked,gini
```


### `trips`

Trips are created and removed by users. Each trip belongs to an anonymous browser owner.

Recommended columns:
```sql
trips
- id uuid primary key
- owner_key text not null
- destination_name text not null
- country_code text not null references countries(code)
- country_name text
- latitude numeric not null
- longitude numeric not null
- timezone text
- date_start date not null
- date_end date not null
- trip_type text not null
```

Use `owner_key`, not `user_id`, while there is no real authentication.

For trip lists:
```sql
select *
from trips
where owner_key = :anonymousOwnerKey
order by date_start asc;
```

## 5. API Design

Keep third-party calls behind Next.js route handlers. UI components should call app APIs, not external services directly.

Recommended MVP endpoints:
```text
GET    /api/destinations/search?name=...&count=...&language=en&format=json
GET    /api/countries/[country_code]
GET    /api/trips?ownerKey=...
POST   /api/trips
GET    /api/trips/[trip_id]?ownerKey=...
DELETE /api/trips/[trip_id]?ownerKey=...
GET    /api/weather?latitude=...&longitude=...&startDate=...&endDate=...
```

Endpoint responsibilities:
- `/api/destinations/search`: proxy Open-Meteo geocoding for debounced destination selection
- `/api/countries/[country_code]`: read country facts from Supabase
- `/api/trips`: list or create trips for an `owner_key`
- `/api/trips/[trip_id]`: fetch or delete one saved trip
- `/api/weather`: proxy Open-Meteo weather forecast

For trip detail pages, fetch the saved trip first:
```text
1. GET /api/trips/[trip_id]?ownerKey=...
2. GET /api/countries/[trip.country_code]
3. GET /api/weather?... from trip coordinates and dates
4. calculatePackingSuggestions(trip, weather)
```

## 6. Third-Party APIs

### Destination Search

Open-Meteo geocoding:
```text
https://geocoding-api.open-meteo.com/v1/search?name={user_input}&count={variants_displayed}&language=en&format=json
```

The dropdown should be debounced. Store the selected result fields needed for trip creation:
- destination/city name
- country code
- latitude
- longitude
- timezone

### Weather

Open-Meteo forecast:
```text
https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}&start_date={date_start}&end_date={date_end}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max&timezone=auto
```

Weather must be fetched fresh when a trip is opened. Do not persist weather in `trips`.

If forecast data is not available for the requested dates, return a clear weather-unavailable state message and calculate packing from trip duration and trip type only.

## 7. Packing Calculation

Packing suggestions are derived, not stored.

Inputs:
- trip dates
- trip duration
- trip type
- daily weather forecast

Initial rules:
- rainy weather -> rain jacket, umbrella
- cold weather -> warm layers
- trip length > 5 days -> laundry bag, extra socks
- UV index > 3 -> sunscreen
- max temperature > 25C -> hat
- trip type `adventure` -> comfortable shoes, backpack

Recommended location:
```text
src/features/packing/lib/calculate-packing-suggestions.ts
```

Return structured suggestions:
```ts
type PackingSuggestion = {
  id: string;
  label: string;
  reason: string;
  category: "weather" | "duration" | "trip-type";
};
```

Do not add a `packing_items` table for MVP.

## 8. Architecture & Directory Structure

Use a feature-first layered structure inspired by Bulletproof React, adapted for Next.js App Router.

**Source-of-truth structure:**
```text
trip-mate/
├── src/
│   ├── app/                         # Next.js App Router routes and route handlers
│   │   ├── (app)/                   # Main application route group if useful
│   │   │   ├── page.tsx             # "/" with side panel
│   │   │   └── [trip_id]/page.tsx   # Trip detail page
│   │   ├── api/                     # Next.js route handlers
│   │   │   ├── countries/[country_code]/route.ts
│   │   │   ├── destinations/search/route.ts
│   │   │   ├── trips/route.ts
│   │   │   ├── trips/[trip_id]/route.ts
│   │   │   └── weather/route.ts
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/                  # Shared generic UI components
│   │   └── ui/                      # shadcn/ui components
│   ├── config/                      # App config and env parsing
│   ├── features/                    # Feature modules
│   │   ├── countries/
│   │   │   ├── api/
│   │   │   ├── types/
│   │   │   └── components/
│   │   ├── destinations/
│   │   │   ├── api/
│   │   │   ├── components/
│   │   │   └── types/
│   │   ├── packing/
│   │   │   ├── components/
│   │   │   ├── lib/
│   │   │   └── types/
│   │   ├── trips/
│   │   │   ├── api/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   └── types/
│   │   └── weather/
│   │       ├── api/
│   │       ├── lib/
│   │       └── types/
│   ├── hooks/                       # Shared cross-feature hooks
│   ├── lib/                         # Configured clients and shared server/client libraries
│   │   ├── supabase/
│   │   └── http/
│   ├── server/                      # Server-only database/query helpers
│   │   ├── countries/
│   │   └── trips/
│   ├── types/                       # Shared app-wide types
│   └── utils/                       # Shared utility helpers
├── supabase/
│   ├── migrations/
│   └── seed/
├── public/
├── .env.example
├── components.json                  # shadcn/ui config
├── next.config.ts
├── package.json
└── tsconfig.json
```

Only create folders when needed. Avoid empty architecture scaffolding that does not support current work.

**Feature folder structure:**
```text
src/features/<feature-name>/
├── api/         # Browser-safe calls to app API routes
├── components/  # Feature-scoped UI
├── hooks/       # Feature-scoped hooks
├── lib/         # Pure feature logic
├── types/       # Feature-specific types
└── utils/       # Feature-specific helpers
```

## 9. Architecture Boundaries

**Dependency direction:**
```text
src/components, src/hooks, src/lib, src/server, src/types, src/utils
  -> src/features
  -> src/app
```

Rules:
- `src/app` composes pages, layouts, and route handlers.
- `src/features` owns domain UI, hooks, feature API wrappers, types, and pure logic.
- `src/components` is only for generic reusable UI.
- `src/server` is server-only and may use Supabase private/server clients.
- Client components must not import from `src/server`.
- Keep secrets and Supabase service-role access out of client bundles.
- Avoid cross-feature imports. Compose features at the app layer or move shared code into `src/lib`, `src/types`, or `src/utils`.
- Avoid barrel files unless there is a strong local reason.

## 10. Frontend Conventions

React and TypeScript:
- Use TypeScript for all new files.
- Prefer server components by default in `src/app`.
- Add `"use client"` only at the smallest boundary that needs browser APIs, local state, effects, or event handlers.
- Keep local storage access in client-only hooks/utilities.
- Avoid `any`; use explicit types and guards for external API responses.
- Model loading, empty, error, and unavailable states explicitly.

Styling:
- Use Tailwind for layout and styling.
- Use shadcn/ui for dropdowns, selects, popovers, dialogs, buttons, and form primitives when useful.
- Keep UI quiet, practical, and trip-planning focused.
- Do not introduce a separate UI library unless explicitly approved.
- Do not use inline styles except for truly dynamic values.

New trip modal:
- Use a dialog/modal component.
- Destination selection should use a debounced searchable dropdown/combobox.
- The selected destination option must contain all data needed to create the trip.

## 11. Backend & Data Conventions

Route handlers:
- Validate all query params, path params, and request bodies at the route boundary.
- Return clear status codes: `400`, `404`, `409`, `500` where appropriate.
- Do not leak stack traces, SQL errors, provider internals, or secrets.
- Keep external API calls server-side.
- Make per-user trip routes check `owner_key` for list/create/delete and private detail reads.

Supabase:
- Use a server-side Supabase client for route handlers and database helpers.
- Select only fields needed by the caller.
- Use parameterized/query-builder filters.
- Keep schema SQL and seed scripts under `supabase/`.

Anonymous ownership:
- The browser owns trips through `owner_key`.
- This is not secure authentication. Do not describe it as auth.
- If public sharing becomes part of the implemented MVP, add an explicit `share_token` or `is_public` design instead of overloading `owner_key`.

## 12. Implementation Order

Follow this order unless the user redirects:
1. Keep `AGENTS.md` updated with agreed architecture and business rules.
2. Scaffold Next.js, Tailwind, and shadcn/ui.
3. Implement UI with mock data first.
4. Build the side panel, trip detail page, and new trip modal.
5. Add typed feature models and pure packing calculation.
6. Add API route contracts with mocked or static responses if needed.
7. Add Supabase schema and seed scripts for `countries`.
8. Wire real trip CRUD.
9. Wire destination search and weather proxy routes.
10. Replace mock data with real API calls.
11. Run lint, typecheck, and build before deployment work.

## 13. Operational Commands

Prefer package scripts over direct binary execution.

Expected commands after scaffolding:
```text
npm run dev
npm run lint
npm run build
```

If the package manager or scripts differ after project setup, follow `package.json`.

## 14. Environment Variables

Expected environment shape:
```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY= # only if a server-only seed/admin operation truly needs it
```

Do not expose private server keys to the browser. Only `NEXT_PUBLIC_*` variables may be used by client-side code.

## 15. Future Features

Treat these as later releases unless the user explicitly moves them into scope:
- saved packing list items
- checking/unchecking packing items
- `.ics` calendar export
- shared trip links with explicit share tokens
- Supabase Auth migration
- user preferences and profile data
- far-future climate-based packing estimates
