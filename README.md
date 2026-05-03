# Trip Mate

Trip Mate is a small travel preparation app. It keeps a browser user's trips, fetches destination facts and fresh weather, and calculates simple packing suggestions.

## Stack

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- shadcn/ui components
- Supabase Postgres
- Vercel

There is no Supabase Auth in the MVP. The browser stores an anonymous owner key in `localStorage`, and all database access goes through Next.js API routes.

## Local Setup

Install dependencies:

```bash
npm install
```

Create `.env.local`:

```bash
cp .env.example .env.local
```

Fill:

```env
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Run the database SQL manually in Supabase SQL Editor:

1. `supabase/schema.sql`
2. `supabase/seed/countries.sql`

Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Checks

```bash
npm run lint
npm run build
```

## Deploy

Push the repo to GitHub and import it into Vercel with the Next.js framework preset. Add the same environment variables in Vercel for Preview and Production.
