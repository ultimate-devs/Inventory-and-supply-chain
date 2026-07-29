# Backend — Inventory & Supply Chain API

Phase 1 API: platform security (auth/RBAC), audit logging, system settings, and the live inventory core (categories, items, ROP/EOQ algorithms, stock movements, dashboard aggregation). Node 20, Express 4 (ESM), Mongoose 8.

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

Algorithms live as pure, independently unit-tested functions under `src/services/algorithms/` (`rop.js`, `eoq.js`, `stockStatus.js`, `demandStats.js`); `Item`'s own pre-save hook (`models/Item.js`) recomputes and caches ROP/EOQ/stock-status on every save, so creating an item, editing it, or recording a stock movement all keep those fields current automatically. `services/stockMovementService.js` wraps a stock movement + item update in a single Mongo transaction.

`models/Supplier.js`, `PurchaseOrder.js`, and `Alert.js` are **schema-only** — a Phase 2 lookahead agreed with Member 3, no routes/controllers exist for them yet.

## Testing

Jest + Supertest, with `mongodb-memory-server` running as a single-node replica set (so transaction-based tests, like stock movements, work exactly like production). `tests/unit/` covers the algorithm functions with edge cases (zero demand, zero lead time, boundary stock levels, extreme values); `tests/integration/` exercises full request flows (auth, RBAC, category/item CRUD, stock movements, dashboard aggregation) against a real (in-memory) database.
