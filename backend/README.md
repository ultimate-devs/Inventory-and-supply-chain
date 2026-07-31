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
| `npm run lint` | ESLint over `src/` |

## Seed data

`npm run seed` seeds real data derived from the [DataCo Smart Supply Chain dataset](https://www.kaggle.com/datasets/shashwatwork/dataco-smart-supply-chain-for-big-data-analysis) (~180k order-line rows, 2015-2018). It is **not** committed to the repo (see `scripts/seed-data/` in `.gitignore` — the CSV is ~95MB); run `npm run seed:download` first, or place `DataCoSupplyChainDataset.csv` in `scripts/seed-data/` yourself.

`scripts/seedFromDataCo.js` documents its own derivation choices in detail, but in short: it groups the dataset's `Department Name` column (not the much narrower `Category Name` column) into 5 categories, picks the 10 most-ordered real products in each, and builds each product's 30-day demand history from the real 30-consecutive-day window with the most order activity in that product's own history. Everything downstream (unit cost, ROP, EOQ, stock status) is computed from that real data by the same code paths the API uses at runtime — nothing about the seed is faked beyond documented, labelled business assumptions (see the comment header in the script) for figures the dataset doesn't contain, like procurement cost.

Also creates a Super Admin login from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `.env` (defaults: `admin@example.com` / `ChangeMe123!` — change these for anything beyond local dev).

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

## Testing

Jest + Supertest, with `mongodb-memory-server` running as a single-node replica set (so transaction-based tests, like stock movements and goods receipt, work exactly like production). `tests/unit/` covers the algorithm functions with edge cases (zero demand/budget, empty item lists, tied urgency scores, boundary stock levels, extreme values); `tests/integration/` exercises full request flows (auth, RBAC, category/item CRUD, stock movements, dashboard aggregation, supplier CRUD/recommendation, the full PO lifecycle including two-level approval and discrepancy handling, and the algorithm comparison + alert acknowledgement flows) against a real (in-memory) database.

Note: on Windows, `mongodb-memory-server` can take noticeably longer than expected per test file to spin up/tear down its replica set, and Jest sometimes reports "did not exit one second after the test run has completed" even though every test already passed - this is process-teardown lag, not a hung test; check the printed pass/fail summary rather than assuming a stall.
