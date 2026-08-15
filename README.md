# HireLocal

**Verified and Accountable Local Service Platform** — find, book, and track background-checked
local technicians (plumbers, electricians, AC repair, and more) in Dhaka.

CSE471 (System Analysis & Design) group project, Group 09, BRAC University.

## Tech stack

- **Framework**: Next.js 16 (App Router) + TypeScript, served through a custom
  [server.ts](server.ts) (Socket.IO wraps Next's request handler for live tracking)
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL via Prisma (any free-tier Postgres works — see below)
- **Auth**: NextAuth.js (email/password + Google OAuth)
- **Realtime**: Socket.IO (live worker location, SOS dispatch)
- **AI**: Groq (OpenAI-compatible, free tier) for search-query category mapping, with a
  free keyword-engine fallback when no API key is set

See [docs/FEATURE_SPEC.md](docs/FEATURE_SPEC.md) for the full breakdown of what's built,
what's still a prototype, and what's next — including where the actual stack diverges
from the original assignment spec (Groq instead of OpenAI, Leaflet instead of Google
Maps, etc.) and why.

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up your environment**

   ```bash
   cp .env.example .env
   ```

   Fill in `.env` — every variable's comment explains where to get a free key and what
   breaks (gracefully) if you leave it blank. At minimum you need `DATABASE_URL` and
   `NEXTAUTH_SECRET` to run the app at all.

   No Postgres yet? The easiest option needs no signup:

   ```bash
   npm run db:dev
   ```

   This starts a free local Postgres via `prisma dev` and prints the connection string to
   paste into `DATABASE_URL`. Neon, Supabase, or Railway's free tiers also work with zero
   code changes.

3. **Apply migrations and seed demo data**

   ```bash
   npx prisma migrate deploy
   npm run db:seed
   npm run db:seed:tracking   # optional — seeds demo workers for the live-tracking test pages
   ```

4. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server (custom server + Socket.IO) |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | ESLint |
| `npm test` | Run the test suite once (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run db:migrate` | Create/apply a Prisma migration in dev |
| `npm run db:studio` | Open Prisma Studio (browse the database) |
| `npm run db:seed` | Seed service categories + demo workers |
| `npm run db:seed:tracking` | Seed demo workers for the `/track` and `/sos` test pages |

## Project structure

```
app/                  Next.js App Router — pages and API routes
  api/                 Route handlers, grouped by feature (auth, search, tracking, ...)
  <feature>/           Pages, grouped the same way
components/           React components, grouped by feature
lib/                   Framework-agnostic logic — validation, auth helpers, business
                       rules — kept separate from components so it's independently
                       testable (see the *.test.ts files next to most of it)
prisma/                schema.prisma, migrations, and seed scripts
docs/FEATURE_SPEC.md   What's built, what's a prototype, what's next — read this first
```

## Team

| Name | Branch prefix | Focus |
|---|---|---|
| Shiva Prasad Sarkar | `shiva/` | Auth & common workflows, worker verification |
| Aditi Roy Adri | `adri/` | Smart search & AI category mapping |
| Jishan Ahmed Chowdhury | `jishan/` | Live tracking & SOS |
| Sudiptha Roy | `sudipta/` | Booking flow |

Branch naming and the module/feature → code mapping are documented in
[docs/FEATURE_SPEC.md](docs/FEATURE_SPEC.md) — read it before starting new work, it's kept
up to date as things ship.
