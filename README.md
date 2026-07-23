# Web-Based Inventory and Supply Chain Management System

**Using Greedy and Reorder-Point Algorithms**

A full-stack MERN application that replaces spreadsheet-driven inventory and procurement work with algorithmic decision support: it decides *when* to reorder (Reorder-Point), *how much* to order (EOQ), *what to buy first* under a limited budget (Greedy allocation), and *who to buy it from* (supplier scoring). A layer of Gemini-powered ADK agents sits on top of the REST API and performs monitoring, advisory, procurement, and analytics tasks autonomously.

> MSc Masters Project (2025/26) - University of the West of Scotland, School of Computing, Engineering and Physical Sciences.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Algorithms](#algorithms)
- [AI Agent Layer (ADK)](#ai-agent-layer-adk)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [User Roles](#user-roles)
- [Dataset](#dataset)
- [Team and Module Ownership](#team-and-module-ownership)

- [Licence and Academic Notice](#licence-and-academic-notice)

---

## Overview

Small and medium-sized businesses that hold physical stock typically manage it with spreadsheets and paperwork. The result is predictable: stockouts, over-ordering, late purchase orders, and supplier relationships managed on instinct rather than evidence.

This system addresses that gap end to end. It covers supplier management, purchase order processing, goods receipt, inventory tracking, and stock movement - with four algorithms embedded in the live application rather than studied in isolation, and a secure, fully audited backend underneath.

The academic contribution is the comparison: the Greedy budget allocation algorithm is benchmarked against a Proportional baseline and, for problems under 20 items, against an exact Integer Linear Programming solution — all on identical data drawn from a real 180,000-record supply chain dataset.

## Key Features

**Inventory**
- Category and item management with search, filtering, and pagination
- Automatic stock classification: `OK` / `LOW` / `CRITICAL` / `EXCESS`
- Simple and probabilistic Reorder-Point calculation at 90%, 95%, and 99% service levels
- EOQ calculation with a 7×7 sensitivity matrix (±30% on ordering and holding costs)
- Stock movements as atomic MongoDB multi-document transactions
- Hourly cron job recalculating ROP/EOQ and raising or clearing stock alerts

**Procurement and Supply Chain**
- Supplier CRUD with an embedded catalogue and performance score history
- Weighted supplier performance scoring, recalculated on every goods receipt
- Greedy supplier selection with a ranked recommendation list and user override
- Purchase order state machine — `draft → submitted → approved / rejected → shipped / cancelled` — with optimistic locking and full status history
- Two-level approval above a configurable value threshold
- Goods Receipt Notes with three-way matching and automatic discrepancy alerts
- Daily job flagging overdue purchase orders

**Budget Allocation and Analytics**
- Greedy budget allocation ranked by urgency score
- Proportional and ILP baselines with a side-by-side comparison endpoint
- Run history for every algorithm execution
- Seven reporting and analytics pages (stock turnover, supplier performance, spend, movement, and more) with CSV export
- Performance target: any report page renders in under 500 ms for datasets up to 10,000 items

**Security and Governance**
- JWT authentication with short-lived access tokens and rotating refresh tokens in HTTP-only cookies
- bcrypt password hashing (cost factor 12) and time-limited cryptographic reset tokens
- Four-role RBAC middleware guarding every endpoint
- Helmet.js headers, per-IP rate limiting, `express-validator` sanitisation, restrictive CORS
- Hash-chained, tamper-evident audit log written at middleware level, with a searchable React view
- Real-time dashboard: KPI cards, stock-level charts, activity timeline, critical stock alerts

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), Redux Toolkit, React Router, TypeScript, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB with Mongoose ODM |
| Auth & Security | JWT, bcrypt, Helmet.js, express-rate-limit, express-validator, CORS |
| Agents | Google Agent Development Kit (ADK), Gemini |
| Testing | Jest, Supertest, OWASP ZAP, Burp Suite Community |
| Deployment | Docker, docker-compose |

## Architecture

The backend follows a four-tier separation:

```
Routes  →  Controllers  →  Services  →  Models (Mongoose)
   ↑
Middleware: auth → RBAC → validation → rate limit → audit log
```

Agents run as separate lightweight services on the same Docker network and talk to the existing REST API over HTTP. **No agent requires backend modification** — every capability an agent has is an existing endpoint wrapped as a callable tool.

```
┌──────────────────────────────────────────────┐
│  React SPA (Redux Toolkit, Tailwind)         │
└───────────────────┬──────────────────────────┘
                    │ REST / JWT
┌───────────────────▼──────────────────────────┐
│  Express API  ── security & audit middleware │
│  auth │ inventory │ procurement │ analytics  │
└───────┬──────────────────────────┬───────────┘
        │                          │ HTTP (tools)
┌───────▼────────┐        ┌────────▼───────────┐
│    MongoDB     │        │  ADK Agent Layer   │
│                │        │  monitor │ advise  │
│                │        │  procure │ analyse │
└────────────────┘        └────────────────────┘
```

## Algorithms

### Reorder Point

```
Simple ROP        = avgDailyDemand × leadTime + safetyStock
Probabilistic ROP = avgDailyDemand × leadTime + (Z × σ_d × √leadTime)
```

`Z` = 1.28, 1.65, 2.33 for 90%, 95%, and 99% service levels. `σ_d` is the standard deviation of daily demand over a configurable 7-, 14-, or 30-day window, taken from the item's embedded `dailyDemandHistory[]`.

### Economic Order Quantity

```
EOQ = √(2DS / H)
```

`D` = annual demand, `S` = ordering cost per order, `H` = annual holding cost per unit. The sensitivity matrix varies `S` and `H` independently across seven levels from −30% to +30%, producing 49 EOQ values so managers can see how fragile a recommendation is to cost-estimation error.

### Greedy Budget Allocation

```
urgencyScore = (calculatedROP − currentStock) × avgDailyDemand
```

Items are sorted by descending urgency and funded in order: each receives its full EOQ quantity while budget remains, and nothing once it is exhausted. The function is pure — no database calls, no side effects — which makes it trivially unit-testable.

**Baselines.** The Proportional algorithm gives each item a share of budget proportional to its urgency over total urgency, divided by unit cost. The ILP formulation runs for datasets under 20 items and yields the mathematically optimal allocation. All three are compared on four metrics: total urgency resolved, items fully restocked, items partially restocked, and budget utilisation.

### Supplier Performance and Selection

```
finalScore      = (onTimeRate×0.35 + accuracyRate×0.25
                  + leadTimeReliability×0.25 + priceConsistency×0.15) × 100

selectionRating = normPerformance×0.5 + normLeadTime×0.3 + normPrice×0.2
```

Scoring weights were validated by sensitivity analysis against AHP pairwise rankings on a synthetic panel derived from the dataset. Lead-time reliability is `(averageLeadTime − leadTimeVariability) / averageLeadTime`; price consistency uses the same form over the last ten orders. Scores recalculate on every goods receipt.

## AI Agent Layer (ADK)

Four agents, each wrapping existing API routes as callable tools:

| Agent | Tools | Purpose |
|---|---|---|
| **Monitoring** | `read_stock_levels`, `create_alert` | Event-driven detection of critical stock, replacing fixed cron logic |
| **Advisory** | `calculate_rop`, `get_item_stock_data`, `scenario_what_if` | Runs ROP scenarios across demand-variability patterns and recommends a model and service level per item |
| **Procurement** | `get_supplier_recommendation`, `create_draft_purchase_order` | Detects low stock, selects a supplier, drafts a PO |
| **Analytics** | `run_greedy_algorithm`, `read_report_data`, `generate_chart_narrative` | Executes allocation runs and turns chart output into plain-English management commentary |

**Guardrails.** The procurement agent creates orders in `draft` state only — never auto-submits — and every agent-generated order passes through the same two-level human approval as a manual one. If no suitable supplier can be recommended, the case escalates to a human operator. The monitoring agent applies four suppression policies: one alert per item per type, a 24-hour cooldown after resolution (escalation excepted), an hourly cap on agent-generated alerts, and logging of every decision including suppressed ones, so false-alarm and missed-alarm rates can be measured.

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB 6+ (replica set required — multi-document transactions depend on it)
- Docker and Docker Compose (recommended)
- A Gemini API key for the agent layer

### With Docker (recommended)

```bash
git clone <repository-url>
cd inventory-supply-chain-system
cp .env.example .env      # then fill in the values
docker-compose up --build
```

Docker networking differs across Windows, macOS, and Linux, which is exactly why the committed `docker-compose.yml` is the supported path.

### Manual setup

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev

# Seed the database with dataset-derived demand histories
cd backend
npm run seed
```

Frontend: `http://localhost:5173` · API: `http://localhost:5000`

## Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── routes/          # HTTP routing only
│   │   ├── controllers/     # request/response handling
│   │   ├── services/        # business logic, framework-agnostic
│   │   ├── models/          # Mongoose schemas
│   │   ├── middleware/      # auth, RBAC, validation, audit
│   │   ├── algorithms/      # rop.js, eoq.js, greedy.js, proportional.js,
│   │   │                    # ilp.js, supplierScoring.js  (pure functions)
│   │   ├── jobs/            # hourly ROP recalc, daily overdue PO check
│   │   └── utils/
│   └── tests/               # unit, integration, performance
├── frontend/
│   └── src/
│       ├── features/        # Redux slices, typed per slice
│       ├── pages/
│       ├── components/      # Table, Modal, Badge, Chart wrappers
│       ├── hooks/
│       └── services/        # API clients
├── agents/                  # ADK agent definitions and tool wrappers
├── docs/
└── docker-compose.yml
```

Algorithm files live apart from everything else and stay free of I/O - that is what keeps the 80% coverage target realistic.

## User Roles

| Role | Capability |
|---|---|
| **Super Admin** | Full access; second-level approval on high-value purchase orders; user management; audit log access |
| **Inventory Manager** | Categories, items, stock movements, goods receipts, ROP/EOQ configuration |
| **Procurement Officer** | Suppliers, purchase order creation and submission, first-level approval |
| **Analyst** | Read-only access to reports, analytics, and algorithm runs |

## Dataset

Evaluation uses the **DataCo Smart Supply Chain** dataset (Constante, Silva and Pereira, 2019) — roughly 180,000 real supply chain records covering products, order quantities, delivery times, and demand history, released under CC0 Public Domain.

Available at: <https://www.kaggle.com/datasets/shashwatwork/dataco-smart-supply-chain-for-big-data-analysis>

No surveys, interviews, or custom data collection are involved, and no real personal data is processed — so no ethics approval was required under UWS guidelines.

## Team and Module Ownership

| Student | Banner ID | Module |
|---|---|---|
| **Kiran Karki** | B01835840 | Backend security architecture - JWT auth, RBAC, HTTP hardening, tamper-evident audit logging, real-time dashboard, ADK monitoring agent |
| **Riya Bista** | B01832472 | Database schema, category and item APIs, ROP (simple + probabilistic), EOQ with sensitivity analysis, stock movements, ADK advisory agent |
| **Sanjib Moktan** | B01821096 | Supplier management and scoring, greedy supplier selection, purchase order state machine with two-level approval, goods receipts, ADK procurement agent |
| **Binod Kumar Khatri** | B01838319 | Greedy budget allocation with Proportional and ILP baselines, React/Redux frontend architecture, seven analytics pages, Jest test suite, ADK analytics agent |

**Supervisor:** Muhammad Tufail Khan · **Moderator:** Beba Dusanovic · **Programme Leader:** Graeme McRobbie




## Licence and Academic Notice

Developed as an MSc Masters Project for the University of the West of Scotland, 2025/26. The DataCo dataset is CC0 Public Domain. This repository is submitted academic work - please observe your institution's academic integrity policy before reusing any part of it.
