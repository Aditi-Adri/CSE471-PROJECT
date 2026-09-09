# HireLocal

https://cse471-project-6feo.onrender.com/

# HireLocal

> A verified local technician marketplace for Dhaka — search in plain language, hire with confidence, track the job to completion.

**Live demo:** https://cse471-project-6feo.onrender.com/

Built for **CSE471: System Analysis and Design**, Group 09.

> ℹ️ The demo is hosted on a free tier that sleeps after inactivity. The first request may take up to a minute while the server wakes up; everything is fast after that.

---

## About

Hiring a plumber, electrician, or AC technician in Dhaka usually happens through word of mouth, with no way to verify who is showing up at your door, no transparent pricing, and no record of the job. HireLocal replaces that with a single platform where technicians are identity-verified, rates are negotiated openly, and the customer's address stays private until the assigned technician actually arrives and confirms their identity on site.

---

## Features

### For customers
- **Plain-language search** — describe the problem ("water tap is leaking in kitchen") and the system maps it to the right service category automatically using AI, with a keyword-matching fallback so search never breaks
- **Rich filtering** — by neighborhood, hourly budget, verification tier, and current availability, with list and map views
- **Booking with rate negotiation** — propose a rate, receive one counter-offer, accept or decline
- **Arrival safety code** — your exact address and phone number stay hidden from the technician until they enter the correct code at your door
- **Live tracking** — watch your technician approach on a live map with an ETA
- **Emergency SOS** — one tap alerts every verified technician online within 3 km
- **Open job requests** — if nothing matches your search, post what you need and let technicians apply with their asking wage
- **Favorites and complaints** — save technicians to rebook later, or report a problem for admin review

### For technicians
- **Three-tier verification** — national ID face match, skill test, and police clearance, each earning a visible trust badge
- **AI TrustScore** — a 0–100 reliability score computed from six weighted metrics on real platform activity
- **Demand heatmap** — see which of Dhaka's 22 neighborhoods currently have the most unmet demand, with live weather and an AI-written recommendation
- **Job requests and parts billing** — apply to open jobs, and buy parts mid-job that are added automatically to the customer's final bill
- **Subscription plans** — widen your service radius from 1 km up to 15 km

### For corporate clients
- Manage multiple properties, book against any of them, and view aggregated monthly billing

### For admins
- Verification queue, review fraud moderation, complaints resolution, coupon management, and workshop creation

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL (Neon) |
| ORM | Prisma 7 |
| Auth | NextAuth.js 4 — credentials (bcrypt) + Google OAuth |
| Real-time | Socket.IO 4 (custom `server.ts`) |
| Maps | Leaflet + react-leaflet, OpenStreetMap tiles |
| Validation | Zod 4 |
| AI | Groq API (free tier) with a local keyword-engine fallback |
| Weather | Open-Meteo (no key required) |
| Payments | SSLCommerz sandbox |
| Email | Resend |
| Testing | Vitest |
| Hosting | Render |

Every external service used is on a genuinely free tier — no paid API keys anywhere in the project.

---

## Getting started

### Prerequisites
- Node.js 20 or newer
- A PostgreSQL database (a free [Neon](https://neon.tech) project works well)

### Installation

```bash
git clone https://github.com/Aditi-Adri/CSE471-PROJECT.git
cd CSE471-PROJECT
npm install
```

`npm install` runs `prisma generate` automatically via the `postinstall` hook.

### Environment variables

Create a `.env` file in the project root:

```env
# Required
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
NEXTAUTH_SECRET="run: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"

# Optional — each degrades gracefully if omitted
GROQ_API_KEY=""                  # AI category mapping, fraud check, heatmap insight
GOOGLE_CLIENT_ID=""              # Google sign-in
GOOGLE_CLIENT_SECRET=""
RESEND_API_KEY=""                # password-reset emails
EMAIL_FROM="onboarding@resend.dev"
SSLCOMMERZ_STORE_ID=""           # payment gateway
SSLCOMMERZ_STORE_PASSWORD=""
```

| Variable | Required | If missing |
|---|---|---|
| `DATABASE_URL` | ✅ | App cannot start |
| `NEXTAUTH_SECRET` | ✅ | Authentication fails |
| `NEXTAUTH_URL` | ✅ | Login redirects break |
| `GROQ_API_KEY` | ➖ | Falls back to the local keyword engine |
| `GOOGLE_CLIENT_ID` / `SECRET` | ➖ | Google sign-in unavailable; email/password still works |
| `RESEND_API_KEY` / `EMAIL_FROM` | ➖ | Password-reset emails not delivered |
| `SSLCOMMERZ_*` | ➖ | Checkout completes without a gateway round trip |

### Database setup

```bash
npx prisma migrate deploy   # apply all migrations
npm run db:seed             # seed categories, workers, and demo data
```

### Run it

```bash
npm run dev
```

Open http://localhost:3000.

> The app runs through a custom `server.ts` rather than `next dev`, because Socket.IO needs to attach to the same HTTP server that Next.js uses.

---

## Available scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server (Next.js + Socket.IO) |
| `npm run build` | Production build |
| `npm start` | Run the production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run the test suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run db:seed` | Seed the database |
| `npm run db:studio` | Open Prisma Studio to browse data |

---

## Project structure

```
app/
  api/            API route handlers (backend)
  search/         Search page
  dashboard/      Role-specific dashboards
  admin/          Admin panel
  bookings/       Booking flow and status
  workers/[id]/   Worker profile pages
components/       React components, grouped by feature
lib/
  ai/             Groq client + keyword classifier
  search/         Query building
  trust/          TrustScore + fraud detection
  opportunities/  Demand heatmap scoring
  booking/        Booking visibility rules
  payments/       SSLCommerz integration
  validation/     Zod schemas
prisma/
  schema.prisma   Database schema
  migrations/     23 SQL migrations
  seed.ts         Seed scripts
docs/
  FEATURE_SPEC.md Feature ownership and build status
server.ts         Custom server (Next.js + Socket.IO)
```

---

## Database migrations

This project uses **hand-written SQL migrations**, applied in two steps:

```bash
# 1. Edit prisma/schema.prisma, then format and validate
npx prisma format
npx prisma validate

# 2. Write the SQL by hand at:
#    prisma/migrations/<YYYYMMDDHHMMSS>_<name>/migration.sql

# 3. Actually run the SQL against the database
npx prisma db execute --file prisma/migrations/<folder>/migration.sql

# 4. Record it in Prisma's migration history
npx prisma migrate resolve --applied <folder-name>

# 5. Regenerate the client
npx prisma generate
```

> ⚠️ **Do not use `npm run db:migrate` (`prisma migrate dev`)** — it hangs waiting on an interactive prompt in this setup.
>
> ⚠️ **Step 3 is not optional.** `migrate resolve --applied` only writes a bookkeeping row; it does **not** run your SQL. Skipping step 3 leaves the schema and the real database out of sync while appearing to succeed.

---

## Testing

```bash
npm test
```

134 unit tests covering the pure logic layers — keyword classification, worker query building, TrustScore maths, review fraud heuristics, review eligibility windows, demand scoring, and coupon calculations. These modules are deliberately kept free of database imports so they can be tested without any database or environment setup.

---

## Team

| Name | Student ID |
|---|---|
| Aditi Roy Adri | 23101314 |
| Shiva Prasad Sarkar | 23101302 |
| Jishan Ahmed Chowdhury | 23101041 |
| Sudiptha Roy | 23101044 |

See [`docs/FEATURE_SPEC.md`](docs/FEATURE_SPEC.md) for per-feature ownership and build status.

---

