# HireLocal — Feature Spec & Build Reference

Condensed from `Assignment_01_Functional_Requirements_Group_-_09.docx.pdf` (CSE471,
Group 09) and cross-checked against the actual codebase as of 2026-08-12. Use this file
when asked to build "module X feature Y" (or any feature by name) instead of re-reading
the PDF: it has status, owner, real file paths, and the actual services in use (which
diverge from the PDF in several places — see below).

When a feature here gets built or changed, update its status line in this file in the same
change.

## Team → branch-prefix mapping

"Member #" in the PDF = row order in the assignment's author table, confirmed against
which branch/code implements each feature.

| # | Name | Student ID | Branch prefix |
|---|------|-----------|----------------|
| 1 | Shiva Prasad Sarkar | 23101302 | `shiva/` |
| 2 | Aditi Roy Adri | 23101314 | `adri/` |
| 3 | Jishan Ahmed Chowdhury | 23101041 | `jishan/` |
| 4 | Sudiptha Roy | 23101044 | `sudipta/` |

Repo: `github.com/Aditi-Adri/CSE471-PROJECT`. Roles: **Customer**, **Worker**,
**Corporate Client**, **Admin**.

## Actual tech stack vs. the PDF — read before wiring any "API" below

The PDF describes Python/Flask + a list of paid APIs. The real codebase is different —
**always follow the codebase, not the PDF**, for stack choices:

| Area | PDF says | Codebase actually uses |
|---|---|---|
| Framework | Python, Flask | **Next.js 16 (App Router) + TypeScript**, custom `server.ts` (Node http server + Socket.IO wrapping Next's handler) |
| DB | PostgreSQL | PostgreSQL + Prisma ✅ matches, but any free-tier Postgres (local `prisma dev`, Neon, Supabase, Railway) — not a specific paid instance |
| AI (search category mapping, and by extension TrustScore/fraud detection, income predictor in Modules 2–3) | OpenAI API | **Groq free tier** (OpenAI-compatible chat completions — [lib/ai/groqClient.ts](../lib/ai/groqClient.ts)), with a **free keyword-engine fallback** ([lib/search/categoryMapper.ts](../lib/search/categoryMapper.ts)) when no key is set. Team is on a documented free-APIs-only constraint — apply the same Groq-or-free-fallback pattern to any other "OpenAI API" feature. |
| Maps | Google Maps API | `leaflet` + `react-leaflet` (OpenStreetMap tiles) are the installed deps — no `@react-google-maps` anywhere. Assume Leaflet. |
| Email | "custom email integration" | **Resend** (free tier) |
| SMS (Twilio) | Twilio SMS API | `twilio` package is installed but **not actually called**. [lib/twilio.ts](../lib/twilio.ts) is a mock that just `console.log`s the message. Real dispatch logic (10-min-away alert) is fully wired up in [server.ts](../server.ts) and calls this mock — swapping in the real Twilio SDK there is the only remaining step. |
| File storage (photos/videos → AWS S3) | AWS S3 | **Not implemented anywhere yet.** No upload code exists. Needed for: profile asset uploads, Module 1 F1 NID images, Module 2 F2 PhotoProof. Pick a free-tier-friendly option when building (S3 free tier, Cloudinary free tier, or local disk for dev). |
| Payments (SSLCommerz/bKash/Nagad) | SSLCommerz API | **Not implemented anywhere yet.** No matching code. Needed for Module 2 F3 (escrow) and Module 3 monetization features. Use sandbox/test credentials when building. |
| Task scheduling (node-cron) | node-cron | **Not installed yet** (`package.json` has no `node-cron`). Needed for Module 3 F(g) escrow auto-payout — add it when building that feature. |

## Codebase conventions to follow

- **Branch naming**: `<member-firstname>/<kebab-feature-slug>`, e.g.
  `shiva/worker-verification-badges`. Branch off `main`; merge back with
  `git merge --no-edit` (matches existing history — no squash/rebase pattern used).
- **Ownership comments in code**: every finished feature has a banner comment of the form
  `MODULE <n> -> FEATURE <n> (<Member>): <title>` directly above its Prisma models /
  main route file (see `prisma/schema.prisma:16`, `:78`, `:346`, and
  `app/api/search/route.ts`, `lib/ai/groqClient.ts`, `prisma/seed.ts`,
  `prisma/seedTracking.ts`). Add the same style of banner to new schema blocks / route
  files for anything built from this doc, so the mapping stays self-documenting in the
  code itself, not just here.
- **Prisma**: models for one feature are grouped under a single `====` banner comment in
  [prisma/schema.prisma](../prisma/schema.prisma).
- **Routing**: API routes under `app/api/<feature>/...`, pages under `app/<feature>/...`
  (Next.js App Router) — follow the existing tree, don't invent a different layout.

## Common Workflows (shared, not member-specific in the PDF)

| # | Feature | Status | Files |
|---|---|---|---|
| 1 | Registration, Login (email/pw + Google SSO), Logout, Session mgmt, password reset | ✅ Built | `app/login`, `app/register`, `app/forgot-password`, `app/reset-password`, `app/api/auth/**`, schema banner at `prisma/schema.prisma:78` |
| 2 | RBAC & role management (Customer/Worker/Corporate/Admin, pending→active worker states) | 🟡 Partial | Auth + role field exist; full admin promote/demote/suspend UI not confirmed built |
| 3 | Profile management & asset uploads | 🟡 Partial | `app/account`, `app/complete-profile`, `app/dashboard/worker-profile`, `app/api/worker-profile`. **Gap**: AWS S3 (or free alt) file upload for photos/videos — not implemented |
| 4 | Admin panel (approvals, disputes, analytics, heatmap, audit log) | 🟡 Partial | Only the worker-verification queue is built: `app/admin/verifications`, `app/api/admin/verifications`. Disputes, business analytics, demand heatmap, audit log = **not built** |

## Module 1

| F | Owner | Feature | Status | Files |
|---|---|---|---|---|
| 1 | Shiva | Multi-layer worker verification (NID match → skill test → police clearance) + digital badges | ✅ Built | `app/api/verification/tier1`, `tier2`, `tier3`, `app/dashboard/verification`, models `Tier1Verification`/`Tier2SkillTest`/`Tier3PoliceClearance`/`WorkerReference` (`prisma/schema.prisma:346`) |
| 2 | Adri | Smart text search + AI category mapping + filters | ✅ Built | `app/api/search`, `app/search`, model `SearchLog`, `lib/ai/groqClient.ts` + `lib/search/categoryMapper.ts` (Groq w/ keyword fallback, see stack table) |
| 3 | Jishan | Live worker tracking (map + ETA) + SOS emergency dispatch (3km radius) | ✅ Built, 🔴 one gap | `app/api/tracking/**`, `app/track`, `app/sos`, `server.ts` (Socket.IO location updates + 10-min alert trigger), models `WorkerLocation`/`SosRequest`/`Booking`. **Gap**: SMS is mocked (console.log), not real Twilio — see stack table |
| 4 | Sudiptha | Multi-address family portal (multiple properties, caretaker invites) + digital scope-lock engine (OTP-signed fixed price/scope before job starts) | 🔴 Not built | Only a bare `Booking` model exists (destination coords, ETA, status) and `app/workers/[id]/booking`. No `Address`/family-property model, no caretaker roles, no OTP scope-lock/pricing-contract logic yet |

## Module 2: Trust, Quality & AI Analytics — 🔴 none built yet

No matching Prisma models exist for any of these (`Review`, `PhotoProof`, `Dispute`,
`WorkerAnalytics` are all absent from schema).

| F | Owner | Feature |
|---|---|---|
| 1 | Shiva | AI TrustScore engine (6-metric reliability score) + review fraud detector (Groq, not OpenAI — see stack table). Reviews restricted to verified completions within 72h |
| 2 | Adri | PhotoProof job documentation (timestamped/GPS-tagged before/after photos, needs file storage) + neighborhood demand heatmap for workers |
| 3 | Jishan | Dispute resolution + escrow settlement (needs a payment gateway — see stack table gap) |
| 4 | Sudiptha | Worker income intelligence dashboard + AI predictive planner (Groq) |

## Module 3: Marketplace Monetization, Communication & Automated Ops — 🔴 none built yet

PDF lists 2 features per member here (numbering in the source PDF repeats 1–4 twice —
this is that second pass).

| Owner | Feature |
|---|---|
| Shiva | Worker SaaS subscription paid from in-app wallet balance → premium search ranking flag |
| Shiva | Real-time job chat + notifications via Socket.IO. Note: `server.ts` already runs a Socket.IO server for tracking — extend it, don't start a second one |
| Adri | Spare parts e-commerce shop + inventory margin manager (catalog, markup, escrow-bill append, stock decrement) |
| Adri | Admin verification lifecycle queue + ban enforcement — **extends** the already-built `app/admin/verifications`; read that first, don't duplicate |
| Jishan | Platform financial analytics + commission ledger dashboard (job commissions + subscriptions + parts margin, by district) |
| Jishan | Corporate multi-property subscription portal (B2B, recurring checks, caretaker permissions, aggregated billing) |
| Sudiptha | Automated escrow expiry + wallet payout pipeline — hourly `node-cron` job, 48h no-dispute auto-release minus commission. Needs `node-cron` added to `package.json` |
| Sudiptha | Dynamic multi-tier subscription plan selector (Silver/Gold radius tiers) driven by a `SubscriptionTiers` table |

## How to use this doc when asked to "build module X feature Y"

1. Find the row above for owner, status, and existing files.
2. If 🟡/✅ partial, **read the existing files first** — extend, don't duplicate.
3. Check the tech-stack table for the real service to integrate (Groq not OpenAI, Leaflet
   not Google Maps, etc.) instead of following the PDF literally.
4. Branch off `main` as `<owner>/<slug>`; add a
   `MODULE X -> FEATURE Y (<Owner>): <title>` banner comment to new schema
   models / the main route file, matching the existing style.
5. Update this file's status cell/marker in the same change once the feature lands.
