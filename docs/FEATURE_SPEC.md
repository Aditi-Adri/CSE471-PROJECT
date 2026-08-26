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
| 3 | Jishan Ahmed Chowdhury | 23101041 | `jishan/live-tracking-sos` |
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
| Payments (SSLCommerz/bKash/Nagad) | SSLCommerz API | **Wired into the Spare Parts Shop checkout** (`app/api/shop/orders`, `app/api/shop/payment/*`, [lib/payments/sslcommerz.ts](../lib/payments/sslcommerz.ts)) using SSLCommerz's real sandbox — genuinely free, no card/business verification. Optional/graceful-fallback like Groq: without `SSLCOMMERZ_STORE_ID`/`SSLCOMMERZ_STORE_PASSWORD` set, checkout still completes (marked paid, no gateway involved); with them, it's a real hosted-checkout round trip with server-side validation before an order is ever marked PAID. Still needed elsewhere: Module 2 F3 (escrow) and the rest of Module 3's monetization features (subscriptions, wallet payouts) — this only covers the shop. |
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
5. **Live tracking** → ✅ built (Module 1 F3) and **on the same real `Booking`/`Worker`
   rows as everything else** — no longer a separate system. A worker sharing their
   location on a `CONFIRMED` booking (`components/tracking/WorkerLocationShare.tsx`) pushes
   real GPS fixes straight onto that booking, and the same arrival-code gate above still
   governs when `ARRIVED` actually happens (GPS proximity alone reports `etaMinutes: 0`,
   it never sets the status itself — see the comment in `server.ts`'s `location:update`
   handler for why that distinction matters).
6. **Job completes** → ✅ real (`POST /api/bookings/[id]/complete`, customer-only, requires
   `ARRIVED` first). No payment/escrow behind it yet — Module 2 F3, unbuilt.
7. **No worker available → post a request** — 🔴 not built/wired up, unassigned. A
   `JobRequest`/`JobRequestStatus` model exists in the schema (an initial, incomplete
   attempt at this) but has no API routes or UI yet — don't be surprised to find it sitting
   there unused. Closest *working* precedent remains the SOS 3km broadcast (Module 1 F3),
   which is emergency-only.
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
  `lib/ai/groqClient.ts`, `prisma/seed.ts`, `app/api/sos/route.ts`,
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
| 3 | Jishan | Live worker tracking (map + ETA) + SOS emergency dispatch (3km radius) | ✅ Built (rebuilt on real data — the original had drifted into a self-contained demo with hardcoded coordinates and a client-only simulated GPS sender, disconnected from the real `Booking`/`Worker` flow; this replaces it end to end) | Real GPS via the browser's Geolocation API (free, no key) — `components/tracking/WorkerLocationShare.tsx` (booking-scoped, `location:update`) and `components/tracking/WorkerOnlinePanel.tsx` (standalone "go online", `worker:location`), both over the existing Socket.IO connection (`server.ts`). Range is a real Haversine query (`lib/geo.ts`) over online/available/verified `Worker` rows with a fresh `locationUpdatedAt` — see `app/api/sos/route.ts`. Accepting an SOS (`app/api/sos/[id]/accept`, race-safe via a conditional `updateMany`) creates a real `Booking` (CONFIRMED, real arrival code), so it's the same live map and arrival-code gate as any other booking from there — `components/tracking/LiveTrackingMap.tsx` on both `app/bookings/[id]` and the worker's job list. Customer trigger: `app/sos`, `components/sos/SosTrigger.tsx`. Models: `Worker.isOnline`/`currentLat`/`currentLng`/`locationUpdatedAt`, `SosRequest.bookingId`, `Booking` (the removed `WorkerLocation` demo table is gone). SMS is mocked by team decision, not a gap (see stack table) |
| 4 | Sudiptha | Multi-address family portal + digital scope-lock engine — in concrete terms: real booking requests, bargaining, and an arrival-code gate on the customer's phone/address | ✅ **Built** (scope-lock/bargaining half) — see the booking-flow section above. 🔴 **Not built**: the multi-address/family-portal half — multiple saved properties, caretaker invites. `User.address` is a single field, not a list | `app/api/bookings/**`, `app/bookings/[id]`, `app/dashboard/worker-job` (`WorkerJobsList.tsx`), `components/booking/*`, `lib/booking/*` |

## Module 2: Trust, Quality & AI Analytics — 🟡 partially started

`PhotoProof`, `Dispute`, `WorkerAnalytics` are still absent from schema — Features 3 and 4
below have no matching models yet. `Review` now exists (Feature 1).

| F | Owner | Feature | Status | Files |
|---|---|---|---|---|
| 1 | Shiva | AI TrustScore engine (6-metric reliability score) + review fraud detector (Groq, not OpenAI). Reviews restricted to verified completions within 72h | ✅ Built | `lib/trust/trustScoreMath.ts` (pure, unit-tested — 6 weighted metrics: rating quality, completion reliability, verification tier, responsiveness, review authenticity, review volume) + `recomputeTrustScore.ts` (runs the real queries, caches `Worker.trustScore` and re-derives `ratingAvg`/`ratingCount`/`completedJobs` from real `Review`/`Booking` rows instead of seed data). Fraud detection follows the same Groq-or-free-fallback pattern as `lib/ai/categoryMapper.ts`: `lib/trust/groqFraudCheck.ts` + `fraudHeuristic.ts` (unit-tested) via `fraudDetector.ts`, plus a DB-backed duplicate-comment check. `lib/trust/reviewEligibility.ts` (unit-tested) enforces the 72h-from-completion window. Recompute is triggered from every input that changes: `app/api/bookings/[id]/respond` (sets `Booking.respondedAt`), `.../complete` (sets `completedAt`), `.../review` (submit), `app/api/admin/reviews` (hide/unhide), `app/api/admin/verifications/tier{1,2,3}` (tier bump), and `app/api/worker-profile` (initial score). Moderation queue at `app/admin/reviews`. Model `Review`, `Worker.trustScore`/`trustScoreUpdatedAt` |
| 2 | Adri | Neighborhood demand heatmap for workers. (PDF also listed PhotoProof job documentation here — **decided not to build it, by Adri's own call, not a TODO**) | ✅ Built (heatmap) | Worker-only `/dashboard/opportunities` (redirects everyone else). `lib/opportunities/demandScoreMath.ts` (pure, unit-tested) scores each of the 22 Dhaka areas by real demand (open `JobRequest`s, recent `Booking`/`SosRequest`s bucketed to their nearest neighborhood centroid, zero-result area-filtered `SearchLog` rows) ÷ available `Worker` supply — no fabricated numbers. `lib/opportunities/demandScore.ts` runs the actual queries. Two free APIs, each doing a distinct job: Groq (`lib/ai/groqClient.ts`'s `summarizeOpportunitiesWithGroq`, same key as Feature 2 of Module 1) turns the scores into one actionable sentence with a deterministic fallback if it's unavailable; Open-Meteo (`lib/weather/openMeteo.ts`, no key required at all) supplies real current Dhaka weather as its own context card — deliberately *not* folded into the score formula, since there's no real data backing a weather→demand correlation for this app. `components/opportunities/*` (interactive Leaflet bubble map + ranked table, click either to sync selection, "Browse jobs here" deep-links into the existing job-requests apply flow via `?area=`) |
| 3 | Jishan | Dispute resolution + escrow settlement (needs a payment gateway). Now has something real to attach to — `Booking.status` reaches `COMPLETED` for real | 🔴 Not built | — |
| 4 | Sudiptha | Worker income intelligence dashboard + AI predictive planner (Groq). Now has real `agreedRateBdt`/`COMPLETED` bookings to aggregate | 🔴 Not built | — |

**Adri's own addition, not one of the PDF's numbered features above**: customer complaints
against a worker, resolved by an admin (optionally with a reply). Deliberately simple and
**not** tied to a booking or payment — kept separate from Jishan's Module 2 F3 above (dispute
resolution + escrow settlement) so the two won't collide when he builds it; this is closer to
"report this worker" than a financial dispute. ✅ Built. Models `Complaint`/`ComplaintStatus`.
`POST /api/complaints` (customer-only, filed from a worker's profile page —
`components/complaints/FileComplaintForm.tsx` on `app/workers/[id]/page.tsx`),
`GET /api/complaints/mine` (the customer's own, `app/dashboard/complaints`),
`GET`/`POST /api/admin/complaints` (admin-only list + resolve-with-optional-reply,
`app/admin/complaints`).

## Module 3: Marketplace Monetization, Communication & Automated Ops — 🟡 partially started

PDF lists 2 features per member here (numbering in the source PDF repeats 1–4 twice —
this is that second pass).

| Owner | Feature | Status | Files |
|---|---|---|---|
| Shiva | Worker SaaS subscription paid from in-app wallet balance → premium search ranking flag | 🔴 Not built | — |
| Shiva | Real-time job chat + notifications via Socket.IO. `server.ts` already runs a Socket.IO server for tracking — extend it, don't start a second one | 🔴 Not built | — |
| Adri | Spare parts e-commerce shop + inventory margin manager (catalog, markup, escrow-bill append, stock decrement) | 🟡 Partial — built the escrow-bill-append half on top of the existing Job Requests flow (not Sudiptha's shop/Item/Order — separate models, see below); markup/margin isn't in yet, `Part.price` is a single sell price | `JobRequestApplication.wageBdt` (worker states a price when applying, customer picks based on it), models `Part`/`PartOrder`/`PartOrderItem` (own catalog + order, tied to a real `JobRequest` via a real foreign key — not free text like `Order.jobId`). `POST /api/job-requests/[id]/apply` (now needs a wage), `GET /api/parts`, `POST /api/job-requests/[id]/parts` (hired worker buys parts, stock decrements in a transaction, only the actual hired worker can buy on that job). `mine`/`my-applications` both return `wageBdt` + `partsTotalBdt` + `totalBillBdt` — the combined bill the customer pays. `components/jobRequests/BuyPartsForm.tsx`. Seed: `prisma/seedParts.ts` |
| Adri | Admin verification lifecycle queue + ban enforcement — **extends** `app/admin/verifications`; read that first, don't duplicate | 🔴 Not built | — |
| Adri | Workshops & training programs — not one of the PDF's numbered features, a self-added extra. Admin creates a workshop or training programme, free or paid; any worker or customer can register. No real payment gateway — same simple approach as Parts Billing, registering just records the fee that was agreed | ✅ Built | Models `Workshop`/`WorkshopRegistration` (unique per workshop+user). `GET /api/workshops` (list, upcoming first, shows registrant count + whether the viewer already registered), `POST /api/workshops` (admin-only create), `POST /api/workshops/[id]/register` (any signed-in non-admin). Admin: `app/admin/workshops`, `components/workshops/AdminWorkshopsDashboard.tsx`. Worker/customer: `app/dashboard/workshops`, `components/workshops/WorkshopsList.tsx` |
| Jishan | Platform financial analytics + commission ledger dashboard (job commissions + subscriptions + parts margin, by district) | 🔴 Not built | — |
| Jishan | Corporate multi-property subscription portal (B2B, recurring checks, caretaker permissions, aggregated billing) | 🔴 Not built | — |
| Sudiptha | Automated escrow expiry + wallet payout pipeline — hourly `node-cron` job, 48h no-dispute auto-release minus commission. Needs `node-cron` added to `package.json`. Now has a real `ARRIVED`→`COMPLETED` transition to hang the timeout off of | 🔴 Not built | — |
| Sudiptha | Dynamic multi-tier subscription plan selector (Silver/Gold radius tiers) driven by a `SubscriptionTiers` table | ✅ Built (as "Worker Subscription & Working Radius") | Plan catalog is a static config, not a DB table — `lib/constants/subscriptionPlans.ts` — exactly 4 plans (Basic 1km free / Starter 2km / Standard 5km / Premium 15km, each with price + benefits), plus the one-time 30-day free Premium trial. (The database's `SubscriptionTier` enum also has an unused `UNLIMITED` value from an earlier draft — harmless, just not sold.) New model `SubscriptionOrder` (shaped just like `Order`, reuses `PaymentStatus`) + 4 new `Worker` columns (`serviceRadiusKm`, `subscriptionTier`, `subscriptionExpiresAt`, `subscriptionTrialUsed`) — migrations `20260820120000_worker_subscription_radius` and `20260821090000_starter_plan_basic_1km` (adds the `STARTER` tier + drops Basic's default to 1km), both fully additive. Reuses the exact SSLCommerz flow from the shop (`lib/payments/sslcommerz.ts`) via `lib/payments/confirmSubscriptionPayment.ts` / `failSubscriptionOrder.ts` and `app/api/subscription/checkout`, `app/api/subscription/payment/*`. Radius circle is drawn with the project's existing Leaflet + OpenStreetMap map stack (`components/subscription/WorkingRadiusMap.tsx`) — not Google Maps (see the tech-stack table above); clicking any plan card on `/dashboard/worker/subscription` previews that plan's radius on the map before buying. Worker-only page `app/dashboard/worker/subscription`, dashboard widget `components/subscription/SubscriptionStatusCard.tsx`. Every worker starts on Basic's fixed 1km — no profile-form choice needed anymore |

## Module 4 — not in the PDF; own additions

Not one of the PDF's numbered features — small, self-contained extras rather than
something assigned. Simple by design, not meant to carry the same weight as the
Module 1/2/3 rows above.

| Owner | Feature | Status | Files |
|---|---|---|---|
| Adri | Favorite workers — customer stars a worker to rebook later without searching again | ✅ Built | Model `Favorite` (`customerId`, `workerId`, unique together). `POST /api/favorites/[workerId]` toggles star on/off, `GET /api/favorites` lists them. `components/favorites/FavoriteButton.tsx` on `app/workers/[id]/page.tsx` (customers only), `components/favorites/FavoritesList.tsx` on `/dashboard/favorites` |
| Shiva | Referral codes + coupon system — any account can share its own referral code; signing up with one rewards both sides with a coupon. Admin creates/manages coupons independently. Applies at the one real money-moving checkout today, the Spare Parts Shop (`app/api/shop/orders`) | ✅ Built | Models `Coupon` (admin- or referral-issued; public or private via `issuedToUserId`), `CouponRedemption`; `User.referralCode`/`referredById`; `Order.discountBdt`. Pure logic: `lib/coupons/couponMath.ts` (discount amount), `lib/coupons/couponEligibility.ts` (usable-right-now check) — both unit-tested, same split as `trustScoreMath`/`demandScoreMath`. `lib/referrals/issueReferralReward.ts` issues the matching pair of coupons (10% off, capped ৳200, min order ৳300, 90-day expiry — `lib/referrals/referralConfig.ts`). Referral code entry is on the credentials `POST /api/auth/register` form only, not Google SSO. `POST /api/coupons/validate` (live checkout preview), `GET /api/coupons/mine`, `GET /api/referrals/me`, `GET/POST /api/admin/coupons`, `PATCH /api/admin/coupons/[id]`. UI: `components/coupons/ReferralCard.tsx` on `/account`, `components/coupons/MyCouponsList.tsx` on `/dashboard/coupons`, coupon field on `app/shop/cart`, `components/admin/CouponManager.tsx` on `/admin/coupons` |

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
