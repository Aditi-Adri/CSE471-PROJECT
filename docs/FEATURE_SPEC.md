# HireLocal — Feature Spec & Build Reference

Condensed from `Assignment_01_Functional_Requirements_Group_-_09.docx.pdf` (CSE471,
Group 09) and cross-checked against the actual codebase, current as of 2026-08-13. Use
this file when asked to build "module X feature Y" (or any feature by name) instead of
re-reading the PDF: it has status, owner, real file paths, and the actual services in use
(which diverge from the PDF in several places — see below).

When a feature here gets built or changed, update its status line in this file in the same
change.

## Team → branch-prefix mapping

"Member #" in the PDF = row order in the assignment's author table, confirmed against
which branch/code implements each feature. One branch per person per feature area — merge
each independently, in any order; none of them depend on another being merged first.

| # | Name | Student ID | Branch |
|---|------|-----------|----------------|
| 1 | Shiva Prasad Sarkar | 23101302 | `shiva/common-workflows-dashboard` |
| 2 | Aditi Roy Adri | 23101314 | `adri/module1-search-improvements` |
| 3 | Jishan Ahmed Chowdhury | 23101041 | `jishan/module1-tracking-improvements` |
| 4 | Sudiptha Roy | 23101044 | `sudipta/module1-real-booking` |

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
| Maps | Google Maps API | `leaflet` + `react-leaflet` (OpenStreetMap tiles) — no `@react-google-maps` anywhere. Used for post-booking live tracking (`components/tracking/LiveTrackingMap.tsx`) and the search-results map (`components/search/WorkerMapView.tsx`). Neither worker nor customer records have real lat/lng (no paid geocoding) — both pin placement and a real booking's destination coords come from `lib/constants/dhakaAreaCoords.ts`, a static per-neighborhood centroid table with small deterministic jitter. Good enough to plot a pin, not a substitute for a real address. |
| Email | "custom email integration" | **Resend** (free tier) |
| SMS (Twilio) | Twilio SMS API | **Mock only, by team decision — final, not a TODO.** [lib/twilio.ts](../lib/twilio.ts) logs the message instead of sending it; the `twilio` package isn't even a dependency anymore. Twilio requires a verified payment method before a trial account can claim *any* phone number, even one paid for out of trial credit — conflicts with the free-APIs-only constraint everything else in this row follows, and the team decided against adding a card for this project. The alert-*trigger* logic in `server.ts` (deciding when a technician is ~10 min away) is fully real and fires on schedule regardless — only the actual text delivery is mocked. |
| File storage (photos/videos → AWS S3) | AWS S3 | **Not implemented anywhere yet.** No upload code exists. Needed for: profile asset uploads, Module 1 F1 NID images, Module 2 F2 PhotoProof. Pick a free-tier-friendly option when building (S3 free tier, Cloudinary free tier, or local disk for dev). |
| Payments (SSLCommerz/bKash/Nagad) | SSLCommerz API | **Not implemented anywhere yet.** No matching code. Needed for Module 2 F3 (escrow) and Module 3 monetization features. Use sandbox/test credentials when building. |
| Task scheduling (node-cron) | node-cron | **Not installed yet** (`package.json` has no `node-cron`). Needed for Module 3 F(g) escrow auto-payout — add it when building that feature. |

## Core discovery & booking flow — the real thing, as of 2026-08-13

This used to describe an entirely client-side "Preview only" mockup (see git history if
you need that version). Most of it is real now, end-to-end tested against the actual
database:

1. **Customer searches** (plain text or filters, or the map toggle) → ✅ built, Module 1 F2.
2. **Customer opens a worker's profile, requests a booking** at a proposed rate + address
   (prefilled from their saved `User.address` if set) → ✅ **real** (`POST /api/bookings`).
   Creates a `Booking` row with `status: PENDING_ACCEPTANCE`.
3. **Bargaining** — the worker (`app/dashboard/worker-job`, `WorkerJobsList.tsx`) accepts,
   declines, or sends back **one** counter-offer (`POST /api/bookings/[id]/respond`); the
   customer then accepts or declines that counter (`POST .../respond-counter`) — bounded,
   not open-ended negotiation. Accepting either way generates the arrival code and flips
   status to `CONFIRMED`.
4. **Arrival safety code** → ✅ **real gate**. `Booking.arrivalCode` is generated
   server-side on accept. The worker submits it back
   (`POST /api/bookings/[id]/verify-code`, rate-limited) — matching is the *only* thing
   that sets `arrivalVerifiedAt`, which is the *only* thing
   [lib/booking/shapeBookingForViewer.ts](../lib/booking/shapeBookingForViewer.ts) checks
   before a worker's view of the booking includes `serviceAddress`/`customerPhone`. Every
   booking API route runs through this same shaping function — see
   [lib/booking/loadBookingWithViewerRole.ts](../lib/booking/loadBookingWithViewerRole.ts)
   for the "which side is asking" check every route shares.
   **Documented simplification**: the code isn't a secret exchanged out-of-band — it's
   visible to both sides once generated (customer at `/bookings/[id]`, worker in their job
   list). The worker submitting it back is "this is genuinely the accepted worker's own
   authenticated session" more than a shared-secret boundary.
5. **Live tracking** → ✅ built (Module 1 F3) but **still a separate system**. The real
   booking flow above and the tracking demo (`app/track`, `/api/tracking/booking/assign`)
   both write `Booking` rows but through unrelated code paths, and `WorkerLocation.workerId`
   (tracking) isn't the same identity space as `Worker.id` (real bookings). Wiring these
   into one flow (a confirmed real booking automatically starts a live-tracked trip) is the
   next integration gap.
6. **Job completes** → ✅ real (`POST /api/bookings/[id]/complete`, customer-only, requires
   `ARRIVED` first). No payment/escrow behind it yet — Module 2 F3, unbuilt.
7. **No worker available → post a request** — 🔴 not built, unassigned. Closest precedent
   remains the SOS 3km broadcast (Module 1 F3), which is emergency-only.
8. **Workers browse open work** (rather than just react to a booking or an SOS ping) — 🔴
   not built, unassigned.

## Codebase conventions to follow

- **Branch naming**: `<member-firstname>/<kebab-feature-slug>`, one branch per person per
  feature area — branch off `main` and stay self-contained rather than stacking on another
  person's in-progress branch (small overlaps, like both needing `User.address`, are fine;
  identical content merges cleanly on its own). Merge back with `git merge --no-edit`
  (matches existing history — no squash/rebase pattern used).
- **Ownership comments in code**: every finished feature has a banner comment of the form
  `MODULE <n> -> FEATURE <n> (<Member>): <title>` directly above its Prisma models /
  main route file (see `prisma/schema.prisma`, `app/api/search/route.ts`,
  `lib/ai/groqClient.ts`, `prisma/seed.ts`, `prisma/seedTracking.ts`,
  `lib/booking/shapeBookingForViewer.ts`). Add the same style of banner to new schema
  blocks / route files for anything built from this doc.
- **Prisma**: models for one feature are grouped under a single `====` banner comment in
  [prisma/schema.prisma](../prisma/schema.prisma).
- **Routing**: API routes under `app/api/<feature>/...`, pages under `app/<feature>/...`
  (Next.js App Router) — follow the existing tree, don't invent a different layout.
- **No AI/assistant attribution in commits, PRs, or files** — a durable preference for
  this repo, not just a one-off.

## Common Workflows (shared, not member-specific in the PDF)

| # | Feature | Status | Files |
|---|---|---|---|
| 1 | Registration, Login (email/pw + Google SSO), Logout, Session mgmt, password reset | ✅ Built | `app/login`, `app/register`, `app/forgot-password`, `app/reset-password`, `app/api/auth/**` |
| 2 | RBAC & role management (Customer/Worker/Corporate/Admin, pending→active worker states) | 🟡 Partial | Auth + role field + per-request middleware exist; no admin promote/demote/suspend UI or API anywhere yet |
| 3 | Profile management & asset uploads | 🟡 Partial | `/account` is the shared, role-aware dashboard every role lands on after login (`app/account/page.tsx`, `components/dashboard/**`) — name/phone/**address** editing (`app/api/account/profile`), password change/set (`app/api/account/password`), role-specific quick links, logout/home. Bare `/dashboard` redirects here. Worker-specific setup stays at `app/dashboard/worker-profile` (creation only — no `PATCH`, so a worker can't edit headline/bio/rate/area after the fact). **Gap**: still no file-upload code anywhere (S3/Cloudinary/etc.) for NID images or portfolio photos |
| 4 | Admin panel (approvals, disputes, analytics, heatmap, audit log) | 🟡 Partial | Only the worker-verification queue is built: `app/admin/verifications`, `app/api/admin/verifications`. Disputes, business analytics, demand heatmap, audit log = **not built** |

## Module 1

| F | Owner | Feature | Status | Files |
|---|---|---|---|---|
| 1 | Shiva | Multi-layer worker verification (NID match → skill test → police clearance) + digital badges | ✅ Built | `app/api/verification/tier1`, `tier2`, `tier3`, `app/dashboard/verification`, models `Tier1Verification`/`Tier2SkillTest`/`Tier3PoliceClearance`/`WorkerReference` |
| 2 | Adri | Smart text search + AI category mapping + filters + map view | ✅ Built | `app/api/search` (rate-limited), `app/search`, `components/search/WorkerMapView.tsx` (List/Map toggle), model `SearchLog`, `lib/ai/groqClient.ts` + `lib/search/categoryMapper.ts` (Groq w/ keyword fallback) |
| 3 | Jishan | Live worker tracking (map + ETA) + SOS emergency dispatch (3km radius) | ✅ Built | `app/api/tracking/**` (every route requires a signed-in session), `app/track`, `app/sos`, `server.ts`, models `WorkerLocation`/`SosRequest`/`Booking`. Dark theme scoped to this feature's own pages (`lib/ui/trackingTheme.ts`). SMS is mocked by team decision, not a gap (see stack table). **Remaining gap**: not wired to the real booking flow — step 5 of the booking-flow section above |
| 4 | Sudiptha | Multi-address family portal + digital scope-lock engine — in concrete terms: real booking requests, bargaining, and an arrival-code gate on the customer's phone/address | ✅ **Built** (scope-lock/bargaining half) — see the booking-flow section above. 🔴 **Not built**: the multi-address/family-portal half — multiple saved properties, caretaker invites. `User.address` is a single field, not a list | `app/api/bookings/**`, `app/bookings/[id]`, `app/dashboard/worker-job` (`WorkerJobsList.tsx`), `components/booking/*`, `lib/booking/*` |

## Module 2: Trust, Quality & AI Analytics — 🔴 none built yet

No matching Prisma models exist for any of these (`Review`, `PhotoProof`, `Dispute`,
`WorkerAnalytics` are all absent from schema).

| F | Owner | Feature |
|---|---|---|
| 1 | Shiva | AI TrustScore engine (6-metric reliability score) + review fraud detector (Groq, not OpenAI). Reviews restricted to verified completions within 72h |
| 2 | Adri | PhotoProof job documentation (timestamped/GPS-tagged before/after photos, needs file storage) + neighborhood demand heatmap for workers |
| 3 | Jishan | Dispute resolution + escrow settlement (needs a payment gateway). Now has something real to attach to — `Booking.status` reaches `COMPLETED` for real |
| 4 | Sudiptha | Worker income intelligence dashboard + AI predictive planner (Groq). Now has real `agreedRateBdt`/`COMPLETED` bookings to aggregate |

## Module 3: Marketplace Monetization, Communication & Automated Ops — 🔴 none built yet

PDF lists 2 features per member here (numbering in the source PDF repeats 1–4 twice —
this is that second pass).

| Owner | Feature |
|---|---|
| Shiva | Worker SaaS subscription paid from in-app wallet balance → premium search ranking flag |
| Shiva | Real-time job chat + notifications via Socket.IO. `server.ts` already runs a Socket.IO server for tracking — extend it, don't start a second one |
| Adri | Spare parts e-commerce shop + inventory margin manager (catalog, markup, escrow-bill append, stock decrement) |
| Adri | Admin verification lifecycle queue + ban enforcement — **extends** `app/admin/verifications`; read that first, don't duplicate |
| Jishan | Platform financial analytics + commission ledger dashboard (job commissions + subscriptions + parts margin, by district) |
| Jishan | Corporate multi-property subscription portal (B2B, recurring checks, caretaker permissions, aggregated billing) |
| Sudiptha | Automated escrow expiry + wallet payout pipeline — hourly `node-cron` job, 48h no-dispute auto-release minus commission. Needs `node-cron` added to `package.json`. Now has a real `ARRIVED`→`COMPLETED` transition to hang the timeout off of |
| Sudiptha | Dynamic multi-tier subscription plan selector (Silver/Gold radius tiers) driven by a `SubscriptionTiers` table |

## How to use this doc when asked to "build module X feature Y"

1. Find the row above for owner, status, and existing files.
2. If 🟡/✅ partial, **read the existing files first** — extend, don't duplicate.
3. Check the tech-stack table for the real service to integrate (Groq not OpenAI, Leaflet
   not Google Maps, Twilio is off by team decision, etc.) instead of following the PDF
   literally.
4. Branch off `main` as `<owner>/<slug>`; add a
   `MODULE X -> FEATURE Y (<Owner>): <title>` banner comment to new schema
   models / the main route file, matching the existing style.
5. Update this file's status cell/marker in the same change once the feature lands.
6. Bargaining, the arrival safety code, and the multi-address portal are now split: the
   first two are done (Module 1 F4 row above); multi-address/caretaker is not. The
   no-availability request board and worker job search still don't have a home — see
   steps 7–8 of the booking-flow section.
