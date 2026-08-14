# Spare Parts Store — Implementation Map (viva reference)

Everything that makes this feature work, in the order you'd build it: **database → backend API → frontend → integration points**.

---

## 1. What the feature does

A signed-in user (worker or customer) opens **Spare Parts**, browses the catalogue, taps **Select** on the parts they need, opens the **Cart & Bill** page, adjusts quantities, and taps **Confirm payment**. The server validates stock, deducts it, and writes an order — all inside one transaction, so stock can never go negative. The purchase then appears in **Recent purchases** on the shop page and in **Order history** on the account page.

```
/shop  ──Select──►  cart state (React context)  ──►  /shop/cart  ──Confirm──►  POST /api/shop/orders
   ▲                                                                                    │
   └──────────────── GET /api/shop/items (fresh stock) ◄─────────────────────────────────┘
```

---

## 2. Database layer

### 2.1 `prisma/schema.prisma` — **CHANGED**

Three new models at the bottom of the file (lines ~486–542):

| Model | Purpose | Key fields |
|---|---|---|
| `Item` | Catalogue row — one per spare part | `name`, `pictureUrl?`, `useCase`, `price Decimal(10,2)`, `stockQty Int`, `workType?` |
| `Order` | One confirmed purchase | `workerId → User.id`, `jobId?` (optional link to a Booking), `totalAmount Decimal(10,2)`, `createdAt` |
| `OrderItem` | One line per part in an order | `orderId → Order.id`, `itemId → Item.id`, `itemName`, `quantity`, `unitPrice`, `subtotal` |

One line added to the existing `User` model (line ~114):

```prisma
orders Order[]   /// Orders placed in the Spare Parts Store
```

**Design points to defend in the viva:**

- **Price snapshotting.** `OrderItem` stores `itemName`, `unitPrice` and `subtotal` as copies. If an item is later renamed or repriced, old receipts still show what the buyer actually paid. This is why `OrderItem` duplicates data instead of just joining to `Item`.
- **Delete rules.** `Order → User` is `onDelete: Cascade` (delete a user, their orders go too). `OrderItem → Item` is `onDelete: Restrict` — you cannot delete a part that appears in any historical order, which protects the audit trail.
- **`Decimal(10,2)` not `Float`.** Money in binary floating point accumulates rounding error; `Decimal` is exact. Consequence in code: you multiply with `price.mul(qty)`, not `price * qty`.
- **Indexes.** `Item(workType)`, `Item(stockQty)` for catalogue filtering; `Order(workerId)`, `Order(jobId)`, `Order(createdAt)` for history lookups; `OrderItem(orderId)`, `OrderItem(itemId)` for joins.

### 2.2 `prisma/migrations/add_spare_parts_store/migration.sql` — **ADDED**

Hand-written migration that `CREATE TABLE IF NOT EXISTS`es the three tables, their foreign keys and their indexes. It **only adds** tables — it never alters or drops anything that already existed.

> ⚠️ Viva-safe note: this folder has no timestamp prefix, so Prisma doesn't treat it as a normal migration. Apply it with `prisma migrate deploy` or by running the SQL directly. Avoid `prisma migrate dev`, which detects the drift and offers to **reset** (wipe) the database.

### 2.3 Seed data — **ADDED**

| File | Contents |
|---|---|
| `prisma/seedItems.ts` | First 10 parts (Water Pump, PVC Pipe, Copper Wire, …) |
| `prisma/seedMoreItems.ts` | 30 more parts across Plumbing / Electrical / General |
| `prisma/checkDb.ts` | Read-only helper — prints row counts to verify the DB is intact |

Run (PowerShell):

```powershell
$env:DATABASE_URL="<neon url>"; npx tsx prisma/seedItems.ts
$env:DATABASE_URL="<neon url>"; npx tsx prisma/seedMoreItems.ts
```

---

## 3. Backend layer — API routes

All three are Next.js App Router route handlers under `app/api/shop/`.

### 3.1 `app/api/shop/items/route.ts` — **ADDED**

`GET /api/shop/items` → array of all items with live `stockQty`, newest first.

Selects only the fields the UI needs (`id, name, pictureUrl, useCase, price, stockQty, workType`). Stock is read fresh on every request, which is how the catalogue knows to disable **Out of stock** cards.

### 3.2 `app/api/shop/orders/route.ts` — **ADDED** (the important one)

`POST /api/shop/orders`

```jsonc
// request
{ "workerId": "clx…", "jobId": null, "items": [{ "itemId": 3, "quantity": 2 }] }

// success
{ "success": true, "message": "Order confirmed and added to bill",
  "orderId": 17, "totalAmount": "5000.00", "itemsCount": 1 }

// stock conflict → HTTP 409
{ "error": "Insufficient stock for \"Water Pump\". Only 1 available.",
  "itemId": 3, "available": 1, "requested": 2 }
```

Six steps:

1. Validate the body (`workerId` + non-empty `items`).
2. Fetch every requested `Item`; 404 if any id doesn't exist.
3. **Validate stock for *all* items before touching anything** — if one line fails, nothing is deducted. Returns `409` with the available quantity so the UI can explain the conflict.
4. Inside `prisma.$transaction`: decrement `stockQty` for each item.
5. Still inside the transaction: create the `Order`, then `createMany` the `OrderItem` rows with snapshot name/price/subtotal.
6. Return the new order id and total.

**Why the transaction matters (classic viva question):** without it, a crash between "stock deducted" and "order created" would destroy inventory with no record of a sale. `$transaction` makes all five writes atomic — they all commit or all roll back. Validating every line *before* the transaction also avoids a partial basket where 2 of 3 items get bought.

### 3.3 `app/api/shop/orders/worker/[workerId]/route.ts` — **ADDED**

`GET /api/shop/orders/worker/:workerId` → that user's orders, newest first, each with its nested `items` (name, quantity, unit price, subtotal). Powers both "Recent purchases" and the account page's order history.

---

## 4. Frontend layer

| File | Status | Role |
|---|---|---|
| `lib/types/shop.ts` | **ADDED** | Shared types `ShopItem`, `CartLine`, `ShopOrder` + helpers `lineSubtotal()`, `formatBdt()` |
| `components/shop/CartProvider.tsx` | **ADDED** | React context holding the cart; `addItem`, `decreaseItem`, `removeItem`, `clearCart`, `syncStock`, plus derived `totalQuantity` / `totalBill` |
| `app/shop/layout.tsx` | **ADDED** | Wraps `/shop` **and** `/shop/cart` in `<CartProvider>` so the cart survives navigation between them |
| `app/shop/page.tsx` | **ADDED** | Catalogue page — grid of item cards, Cart button with badge, Recent purchases table |
| `app/shop/cart/page.tsx` | **ADDED** | Cart & Bill page — quantity steppers, itemised bill, Confirm payment, success state |
| `components/dashboard/OrderHistory.tsx` | **ADDED** | Reusable order-history list, fetches `/api/shop/orders/worker/:id` |

### Things worth pointing at during the demo

- **Cart state lives in a layout, not a page.** Because `app/shop/layout.tsx` sits above both routes, client-side navigation from the catalogue to the cart doesn't remount the provider, so the basket persists. It's also mirrored into `sessionStorage` (hydrated in an effect, to avoid a server/client hydration mismatch) so a hard refresh doesn't empty it.
- **Card alignment.** Each card is `flex h-full flex-col`; the description is clamped to two lines with `min-h-10`, the stock line always renders, and the button sits in a `mt-auto` block. That's what keeps every **Select** button on the same baseline regardless of text length.
- **Select is a toggle**, not a quantity stepper: click → green "✓ Selected", click again → removed. Quantities are edited only on the cart page, which keeps one source of truth for quantity editing.
- **Stock is enforced in two places.** The UI caps the `+` button at `stockQty` (good UX), and the API re-validates on submit (correctness). Client-side checks are convenience; the server is the authority — if stock changed since page load, the `409` path calls `syncStock()` and shows the API's message.
- **Currency.** `formatBdt()` renders `৳` with locale grouping so the UI never prints raw `Decimal` strings.

---

## 5. Integration points (existing files that were **CHANGED**)

| File | Change |
|---|---|
| `components/layout/SiteHeader.tsx` | Added `{ href: "/shop", label: "Spare Parts Shop" }` to `NAV_LINKS` (appears in both desktop and mobile nav) |
| `app/account/page.tsx` | Imports and renders `<OrderHistory workerId={user.id} />` |
| `prisma/schema.prisma` | `orders Order[]` relation on `User` (see §2.1) |

Access control: both shop pages redirect unauthenticated visitors to `/login` via `useSession()`; any signed-in role may shop.

---

## 6. Complete file checklist

**Added — database**

```
prisma/migrations/add_spare_parts_store/migration.sql
prisma/seedItems.ts
prisma/seedMoreItems.ts
prisma/checkDb.ts                       (optional helper)
```

**Added — backend**

```
app/api/shop/items/route.ts                       GET  /api/shop/items
app/api/shop/orders/route.ts                      POST /api/shop/orders
app/api/shop/orders/worker/[workerId]/route.ts    GET  /api/shop/orders/worker/:id
```

**Added — frontend**

```
lib/types/shop.ts
components/shop/CartProvider.tsx
app/shop/layout.tsx
app/shop/page.tsx
app/shop/cart/page.tsx
components/dashboard/OrderHistory.tsx
```

**Changed — existing files**

```
prisma/schema.prisma                 + Item, Order, OrderItem models; + User.orders
components/layout/SiteHeader.tsx     + "Spare Parts Shop" nav link
app/account/page.tsx                 + <OrderHistory /> section
```

---

## 7. Likely viva questions → short answers

**Where is stock actually protected?**
In `POST /api/shop/orders`: every line is validated before any write, and the deduction + order creation run inside `prisma.$transaction`, so it's all-or-nothing.

**What happens if two users buy the last unit at the same time?**
The second request's validation (or the transaction's decrement) sees the reduced stock and returns `409` with the real available quantity; the client re-syncs and shows the message. Nothing is oversold.

**Why store `itemName` and `unitPrice` on `OrderItem`?**
Historical accuracy — receipts must not change when a part is renamed or repriced later.

**Why is the cart in a layout instead of a page?**
So both `/shop` and `/shop/cart` share one provider instance and the basket survives navigation; `sessionStorage` covers full page reloads.

**Why `Decimal` and not `Float`?**
Exact money arithmetic. It's also why the code calls `price.mul(quantity)` — the JS `*` operator doesn't work on Prisma `Decimal`.

**How is a purchase tied to a job?**
`Order.jobId` is an optional reference to a `Booking`, so a part bought during a job can be attached to that job's bill; it's `null` for a standalone purchase.
