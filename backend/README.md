# Backend — Inventory & Supply Chain API

Phase 1: platform security (auth/RBAC), audit logging, system settings, and the live inventory core (categories, items, ROP/EOQ algorithms, stock movements, dashboard aggregation).

Phase 2 adds the full supply-chain loop: supplier management with a four-metric performance score and greedy supplier selection, the purchase order lifecycle (two-level approval, optimistic locking, GRN with under/over-delivery discrepancy handling), stock-threshold and overdue-PO alerts, and the Greedy vs Proportional budget allocation comparison. Node 20, Express 4 (ESM), Mongoose 8.

## Getting started

```bash
cp .env.example .env   # then fill in real secrets for anything beyond local dev
npm install
npm run dev             # starts the API with --watch on http://localhost:5000
```

Swagger docs are served at `http://localhost:5000/api/docs` whenever the server is running.

MongoDB must be reachable at `MONGODB_URI` and running as a **single-node replica set** — the app uses multi-document transactions (e.g. stock movements) which MongoDB only supports on a replica set, even a single-node one. The easiest way to get this locally is `docker compose up` from the repo root, which boots Mongo with `--replSet rs0` and auto-initiates it.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the API with file-watch reload |
| `npm start` | Start the API (no watch) |
| `npm test` | Run the Jest/Supertest suite (unit + integration, in-memory Mongo) |
| `npm run test:coverage` | Same, with coverage; `src/services/**` is gated at 80% |
| `npm run seed:download` | Download the DataCo Smart Supply Chain CSV used for seeding |
| `npm run seed` | Parse the CSV and seed 5 categories / 50 real items / demand history + a Super Admin account |
| `npm run seed:suppliers` | Seed suppliers + purchase orders against the items from `npm run seed` (see below) |
| `npm run seed:agents` | Create the two ADK agents service-account users (see below) |
| `npm run benchmark:reports` | Prove the 7 report endpoints stay under 500ms at 10k items |
| `npm run lint` | ESLint over `src/` |

## Seed data

`npm run seed` seeds real data derived from the [DataCo Smart Supply Chain dataset](https://www.kaggle.com/datasets/shashwatwork/dataco-smart-supply-chain-for-big-data-analysis) (~180k order-line rows, 2015-2018). It is **not** committed to the repo (see `scripts/seed-data/` in `.gitignore` — the CSV is ~95MB); run `npm run seed:download` first, or place `DataCoSupplyChainDataset.csv` in `scripts/seed-data/` yourself.

`scripts/seedFromDataCo.js` documents its own derivation choices in detail, but in short: it groups the dataset's `Department Name` column (not the much narrower `Category Name` column) into 5 categories, picks the 10 most-ordered real products in each, and builds each product's 30-day demand history from the real 30-consecutive-day window with the most order activity in that product's own history. Everything downstream (unit cost, ROP, EOQ, stock status) is computed from that real data by the same code paths the API uses at runtime — nothing about the seed is faked beyond documented, labelled business assumptions (see the comment header in the script) for figures the dataset doesn't contain, like procurement cost.

Also creates a Super Admin login from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `.env` (defaults: `admin@example.com` / `ChangeMe123!` — change these for anything beyond local dev).

`npm run seed` only seeds items/categories from the DataCo CSV — it doesn't touch suppliers or purchase orders, so those sections are empty until you also run `npm run seed:suppliers` (`scripts/seedSuppliersAndPurchaseOrders.js`, idempotent). It creates 8 suppliers (approved/pending/suspended) with catalogues drawn from the seeded items, and 14 purchase orders spanning the full lifecycle (draft through received/cancelled), requested and approved by existing seeded users (a `procurement_officer` as requester, `inventory_manager`/`super_admin` as approvers — matching the "requester can't approve their own PO" and two-level-approval rules). Run it after `npm run seed`.

## Architecture

Layered: `routes → controllers → services → models`. Controllers stay thin (parse request, call a service, send the response envelope); business logic lives in `services/`; services never touch `req`/`res`. Every response uses the shared envelope `{ success, data, message, meta? }` (`utils/sendResponse.js`), and a single global error handler (`middleware/errorHandler.js`) normalizes thrown `ApiError`s, Mongoose validation/cast errors, and duplicate-key errors into that shape.

Auth: bcrypt-hashed passwords (cost 12), short-lived JWT access tokens returned to the client, and a rotating refresh token stored **hashed** on the `User` document and set as an httpOnly/secure/SameSite cookie scoped to `/api/v1/auth`. `middleware/auth.js` exports `protect` (verifies the access token) and `authorize(...roles)` (RBAC). Every mutating request is audit-logged (`middleware/auditLog.js` + `AuditLog` model).

Algorithms live as pure, independently unit-tested functions under `src/services/algorithms/` (`rop.js`, `eoq.js`, `stockStatus.js`, `demandStats.js`, plus Phase 2's `supplierScoring.js`, `supplierSelection.js`, `urgencyScore.js`, `greedyAllocation.js`, `proportionalAllocation.js`, `algorithmComparison.js`); `Item`'s own pre-save hook (`models/Item.js`) recomputes and caches ROP/EOQ/stock-status on every save, and its post-save hook (`services/alertService.js`) opens/resolves the matching low/critical/excess-stock alert - so creating an item, editing it, or recording a stock movement all keep those fields and alerts current automatically. `services/stockMovementService.js` wraps a stock movement + item update in a single Mongo transaction; movement types now include `receipt` (GRN), `consumption` (also updates `dailyDemandHistory`), and `damage` alongside the original `in`/`out`/`adjustment`.

Phase 2 modules, same layered pattern:

- **Suppliers** (`supplierService.js`) — CRUD, item catalogue (price/lead time per item), approve/suspend status, and `GET /suppliers/recommend?item=` (greedy selection: ranks every supplier stocking that item by price, lead time, and performance score).
- **Purchase orders** (`purchaseOrderService.js`) — full lifecycle `draft → submitted → approved/rejected → sent → shipped → partially_received/received → cancelled`. Every status-changing write is a `findOneAndUpdate` keyed on a `version` field (optimistic locking) so two concurrent approvals can't silently clobber each other. Orders above `SystemSettings.poTwoLevelApprovalThreshold` require two different approvers.
- **GRN** (`grnService.js`) — `POST /purchase-orders/:id/receive` runs entirely inside one Mongo transaction: detects under/over-delivery per line, posts a `receipt` stock movement (which itself recalculates ROP/EOQ/stock-status and syncs the item's alert), resolves any `overdue_po` alert, and - once the PO is fully received - recalculates the supplier's performance score from that delivery.
- **Alerts** (`alertService.js`) — `low_stock`/`critical_stock`/`excess_stock` alerts are kept in sync automatically by `Item`'s post-save hook; `overdue_po` alerts are raised by an hourly cron (`services/scheduler.js`) for any receivable PO past its expected delivery date. `GET /alerts/unread-count` backs the notification bell.
- **Algorithms/Greedy** (`algorithmService.js`) — pulls real low-stock/critical items, scores each by urgency and cost-to-clear, then runs the Greedy (urgency-first) and Proportional (water-filling) allocators side by side; every comparison run is saved to `GreedyRun` for the history page.

## ADK agents (`agents/`) and the agent-to-API auth flow

A sibling service at `../agents` (separate Node 24 project, own `package.json`/Dockerfile) runs four Gemini-backed agents (Monitoring, Advisory, Analytics, Procurement) built on Google's Agent Development Kit (`@google/adk`). It talks to this API over plain HTTP - it never touches MongoDB directly and never bypasses RBAC.

**Auth flow**: there is no separate token-issuance mechanism for services. The agents process authenticates exactly the way any human client does - `POST /auth/login` with a stored email/password, caching the returned access token and logging in again shortly before it expires (or immediately on a `401`). Two service-account `User` documents exist for this, created by `npm run seed:agents` (`scripts/seedServiceAgents.js`, idempotent - re-running it leaves existing accounts untouched):

| Account | Role | Used by |
|---|---|---|
| `agents-readonly@internal.local` | `ANALYST` | Monitoring, Advisory, Analytics agents (read-only) |
| `agents-procurement@internal.local` | `PROCUREMENT_OFFICER` | Procurement agent (creates suppliers/draft POs) |

Both are flagged `isServiceAccount: true` on the `User` model (also surfaced on `req.user` by `protect`) purely so audit trails and the future frontend "Agent Insights" panel can tell an agent-driven action apart from a human one at a glance - it has no effect on authorization, which is still just the normal `role` + `authorize(...)` check every other request goes through.

**Every agent insight/recommendation is recorded via `POST /api/v1/agent-logs`** (new `AgentLog` model), which `relatedModel`/`relatedId` ties back to the specific record it's about (an `Alert`, a `GreedyRun`, a `PurchaseOrder`, ...) rather than being a free-floating text blob. `GET /api/v1/agent-logs` is readable by any authenticated role. Agent actions are also written to the existing `AuditLog` via `recordAuditEvent`, with `action` prefixed `agent.<type>.<action>` so they're distinguishable from human-triggered entries in the same trail.

**The Procurement agent cannot approve a purchase order it creates, structurally, not just by convention**: its toolset only wraps `POST /purchase-orders` (creates a `draft`) and `POST /purchase-orders/:id/submit` (starts the existing two-*different*-human-approver flow) - it is simply never given a tool that calls `/approve`. If `GET /suppliers/recommend` finds no eligible supplier (`recommended: null` - an expected outcome, not an error), the agent reports the gap instead of drafting a PO.

**The agents service's own HTTP API requires a second, separate secret**: `POST /run/{advisory,analytics,procurement}` on port 4000 has no per-caller identity of its own (it always acts as the pre-authenticated service account), so every request must carry an `x-internal-api-key` header matching `AGENTS_INTERNAL_API_KEY`, checked in constant time and failing closed if the server-side key is unset - otherwise anyone who could merely reach port 4000 could trigger the Procurement agent to draft/submit real purchase orders, or read internal reports, for free.

See `agents/.env.example` for the env vars the agents service needs (`GEMINI_API_KEY`, `API_BASE_URL`, `AGENTS_INTERNAL_API_KEY`, the two service-account credentials) and `docker-compose.yml`'s `agents` service block for how it's wired up alongside `api`/`mongo`.

## Testing

Jest + Supertest, with `mongodb-memory-server` running as a single-node replica set (so transaction-based tests, like stock movements and goods receipt, work exactly like production). `tests/unit/` covers the algorithm functions with edge cases (zero demand/budget, empty item lists, tied urgency scores, boundary stock levels, extreme values); `tests/integration/` exercises full request flows (auth, RBAC, category/item CRUD, stock movements, dashboard aggregation, supplier CRUD/recommendation, the full PO lifecycle including two-level approval and discrepancy handling, and the algorithm comparison + alert acknowledgement flows) against a real (in-memory) database.

Note: on Windows, `mongodb-memory-server` can take noticeably longer than expected per test file to spin up/tear down its replica set, and Jest sometimes reports "did not exit one second after the test run has completed" even though every test already passed - this is process-teardown lag, not a hung test; check the printed pass/fail summary rather than assuming a stall.
