# Bookkeeping & P&L Tool

A local-first, single-user bookkeeping application. Upload bank CSV exports, auto-categorize transactions with AI, and generate Profit & Loss reports — all from a browser tab on your own machine. No cloud account, no subscription, no data leaving your laptop.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the App](#running-the-app)
- [Using the App](#using-the-app)
  - [Create a Business](#create-a-business)
  - [Import a CSV](#import-a-csv)
  - [Review Transactions](#review-transactions)
  - [P&L Report](#pl-report)
  - [Manage Categories](#manage-categories)
  - [Delete Imported Files](#delete-imported-files)
- [AI Provider System](#ai-provider-system)
- [Project Structure](#project-structure)
- [Database](#database)
- [API Reference](#api-reference)
- [Migrating to Hosted (Supabase + Vercel)](#migrating-to-hosted-supabase--vercel)
- [Backups](#backups)

---

## Features

- **Multiple businesses** — create unlimited businesses; data is fully isolated between them. Switch with a dropdown in the nav bar.
- **CSV import** — upload any bank or credit card CSV. Auto-detects date, description, and amount columns. Handles separate debit/credit column layouts.
- **Deduplication** — re-importing the same CSV skips rows already in the database; you are shown a count of duplicates skipped.
- **AI categorization** — unrecognized transactions are sent to an AI model in a single batched request. Supports four providers with automatic fallback (see [AI Provider System](#ai-provider-system)).
- **Merchant memory** — when you manually correct a category, the system remembers that merchant. Future imports match by exact description or fuzzy similarity (Levenshtein ≥ 0.85) and skip the AI call entirely.
- **Categorization badge** — every transaction row shows how it was categorized: `AI`, `Memory`, or `Manual`.
- **Manual re-categorize** — select any rows in the table and re-run AI on them with one click.
- **P&L report** — filter by date range (this month, last month, quarter, YTD, or custom). See income and expense totals grouped by category.
- **Export** — download the P&L as a PDF or Excel file directly from the browser. No server involvement.
- **Delete by CSV file** — remove all transactions from one or multiple imported files from the Manage Imports panel.
- **Per-business categories** — add, rename, or delete categories per business. Deleting a category makes affected transactions uncategorized (not deleted).
- **Zero infrastructure** — SQLite on disk, `next dev` or `next start`, done.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) + TypeScript | Single codebase for UI and API |
| UI | Tailwind CSS + shadcn/ui | Professional defaults, no design work needed |
| Database | SQLite via `better-sqlite3` | Single file on disk, zero setup |
| ORM | Drizzle ORM | SQL-first, supports both SQLite and Postgres with one schema |
| AI | Anthropic / OpenAI / Qwen / GLM / Minimax | Auto-detected from env keys, automatic fallback |
| CSV parsing | Papa Parse | Handles real-world bank CSV quirks |
| Exports | jsPDF + SheetJS (client-side) | Browser generates files; server stays stateless |

---

## Prerequisites

- **Node.js v18 or later** — download from [nodejs.org](https://nodejs.org)
- **At least one AI API key** (Anthropic recommended) — see [Configuration](#configuration)

Verify Node.js is installed:

```bash
node --version   # should print v18.x or higher
npm --version
```

---

## Installation

```bash
# 1. Clone or download the project
cd path/to/quickbooks

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.local.example .env.local   # or copy manually — see Configuration below

# 4. Generate and apply the database schema
npm run db:migrate
```

The database file is created automatically at `data/bookkeep.db` the first time you run the app or the migration command. You do not need to create it manually.

---

## Configuration

All configuration lives in `.env.local` in the project root. Create this file if it does not exist.

### Minimum configuration

```env
ANTHROPIC_API_KEY=sk-ant-...
```

### Full configuration (all supported AI providers)

```env
# ── AI Providers ─────────────────────────────────────────────────────────────
# Add whichever keys you have. The system detects them automatically and tries
# them in the order listed below. If the first provider fails, it moves to the
# next — no manual intervention needed.

ANTHROPIC_API_KEY=sk-ant-...        # Claude Haiku 4.5 (direct)
OPENAI_API_KEY=sk-...               # GPT-4o Mini (direct)
OPENROUTER_API_KEY=sk-or-v1-...     # Multi-model gateway (recommended)
OPENROUTER_MODEL=openai/gpt-4o-mini # Optional — defaults to gpt-4o-mini
QWEN_API_KEY=sk-...                 # Qwen Turbo (Alibaba DashScope)
GLM_API_KEY=...                     # GLM-4 Flash (ZhipuAI)
MINIMAX_API_KEY=...                 # MiniMax-Text-01
```

> **About OpenRouter:** keys starting with `sk-or-` are OpenRouter keys. OpenRouter is a single endpoint that gives you access to dozens of models (GPT-4o, Claude, Llama, Gemini, etc.). Set `OPENROUTER_MODEL` to any model from [openrouter.ai/models](https://openrouter.ai/models) — e.g. `anthropic/claude-haiku-4-5`, `meta-llama/llama-3.3-70b-instruct`, `google/gemini-flash-1.5`. If you accidentally put an `sk-or-` key into `MINIMAX_API_KEY`, the system auto-detects it and routes to OpenRouter anyway.

> **Verifying which providers work:** open the Import page and the "AI provider status" panel pings every configured key in real time, showing which are responding (green) and which are failing (red, with the actual error from the provider).

You only need **one** key. The rest are optional fallbacks.

> **Note:** To rotate a key, edit `.env.local` and restart `npm run dev` or `npm start`. There is no settings page in the UI.

---

## Running the App

### Development (with hot reload)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production

```bash
npm run build
npm start
```

### Useful scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile for production |
| `npm start` | Run production build |
| `npm run db:generate` | Generate a new migration after schema changes |
| `npm run db:migrate` | Apply pending migrations to the database |
| `npm run db:studio` | Open Drizzle Studio (visual DB browser) in the browser |

---

## Using the App

### Create a Business

Open [http://localhost:3000](http://localhost:3000). If no businesses exist, you see a form to create your first one. Enter a name and click **Create business**.

Each business gets a default set of categories automatically:

- **Income** — Income
- **Expenses** — Software, Meals, Travel, Office Supplies, Contractor Payments, Professional Services, Marketing, Equipment, Bank Fees

You can edit these at any time from the Categories page.

If you have only one business, the app redirects directly to its dashboard. If you have multiple, you see a list to pick from, plus a switcher dropdown in the navigation bar.

### Import a CSV

1. Navigate to **Import** from the nav bar.
2. Drag and drop a CSV file onto the upload area, or click to browse.
3. Click **Import**.

The server processes the file through these steps in order:

1. **Parse** — reads columns automatically. Detects `date`/`posted`, `description`/`memo`/`narrative`, `amount` or separate `debit`/`credit` columns.
2. **Dedup** — each row is hashed on `(businessId, date, amount, description)`. Rows whose hash already exists in the database are skipped.
3. **Memory match** — looks up the merchant memory table. Exact match first; fuzzy Levenshtein fallback if similarity ≥ 85%. Matched rows are categorized without an AI call.
4. **AI batch** — remaining rows are sent to the configured AI provider in chunks of 50. The AI returns one category per row.
5. **Insert** — all new rows are written in a single database transaction.

After import you see a result card:

```
47 imported   3 duplicates skipped   41 AI categorized   6 from memory
```

### Review Transactions

Navigate to **Transactions**. The table shows:

| Column | Description |
|---|---|
| Date | ISO date from the CSV |
| Description | Raw text from the bank |
| Category | Inline dropdown — change it without leaving the table |
| Source | `AI` / `Memory` / `Manual` badge showing how it was categorized |
| CSV File | The filename it came from |
| Amount | Green for income, red for expenses |

**Filtering** — use the date range presets (This Month, Last Month, Quarter, YTD) or pick a custom range. Type in the search box to filter by description.

**Bulk re-categorize** — check one or more rows, then click **Re-categorize N with AI**. The selected transactions are re-sent to the AI. This does not update merchant memory (you have not made a correction, only requested a fresh AI pass).

**Manual correction** — change a category in the dropdown. The app updates the transaction and writes the merchant → category mapping to memory. The next time you import a row with the same (or similar) description, it will be categorized automatically without an AI call.

### P&L Report

Navigate to **P&L**. Choose a date range using the presets or custom dates. The report shows:

- **Income** table — each income category with its total
- **Expenses** table — each expense category with its total
- **Net Profit** card — income minus expenses, highlighted green or red

**Export PDF** — generates a formatted PDF in the browser and triggers a download.  
**Export Excel** — generates an `.xlsx` file in the browser and triggers a download.  
Neither export involves the server.

### Manage Categories

Navigate to **Categories**. You can:

- **Add** a new category (name + income or expense kind)
- **Rename** an existing category inline (click Rename, edit, press Enter or Save)
- **Delete** a category — triggers a confirmation dialog. Affected transactions become Uncategorized but are not deleted.

Category changes do not retroactively re-run the AI on past transactions. Use the Transactions page bulk re-categorize button if you want that.

### Delete Imported Files

On the Transactions page, click **Manage imports**. A panel appears listing every CSV filename that was imported, with its row count.

- Check one or more files
- Click the red **Delete N transactions from M files** button
- Confirm in the dialog

All transactions from the selected files are permanently removed. This cannot be undone.

---

## AI Provider System

No model selector appears in the UI. The backend detects which API keys are present and builds a priority chain at startup:

```
Anthropic  →  OpenAI  →  OpenRouter  →  Qwen  →  GLM  →  Minimax
```

Only providers whose key is set in `.env.local` are included. During a categorization call, the system tries the first available provider. If it fails (network error, rate limit, bad response), it logs the error and tries the next one. If all fail, affected transactions are saved as Uncategorized and can be re-categorized manually.

**Provider details:**

| Provider | Key | Model used | Base URL |
|---|---|---|---|
| Anthropic | `ANTHROPIC_API_KEY` | `claude-haiku-4-5` | Default SDK |
| OpenAI | `OPENAI_API_KEY` | `gpt-4o-mini` | Default SDK |
| OpenRouter | `OPENROUTER_API_KEY` | `OPENROUTER_MODEL` env var or `openai/gpt-4o-mini` | `https://openrouter.ai/api/v1` |
| Qwen | `QWEN_API_KEY` | `qwen-turbo` | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| GLM | `GLM_API_KEY` | `glm-4-flash` | `https://open.bigmodel.cn/api/paas/v4/` |
| Minimax | `MINIMAX_API_KEY` | `MiniMax-Text-01` | `https://api.minimax.chat/v1` |

OpenAI, OpenRouter, Qwen, GLM, and Minimax all use OpenAI-compatible endpoints, so they require no additional SDK — the `openai` package handles all five.

**Status diagnostics:** the Import page includes an "AI provider status" panel that pings every configured key on page load (and on demand). Each provider shows green (OK + latency) or red (failing + the literal error message from the provider). Use this to verify keys are valid before importing — `GET /api/ai-status` exposes the same data programmatically.

---

## Project Structure

```
quickbooks/
├── app/
│   ├── layout.tsx                        # Root HTML shell + Toaster
│   ├── page.tsx                          # Root: list/create businesses
│   ├── create-business-form.tsx          # Client form component
│   └── business/[id]/
│       ├── layout.tsx                    # Nav bar + business switcher
│       ├── page.tsx                      # Dashboard (MTD summary cards)
│       ├── import/page.tsx               # CSV upload + result card
│       ├── transactions/page.tsx         # Table + filters + manage imports
│       ├── pnl/page.tsx                  # P&L report + PDF/Excel export
│       └── categories/page.tsx           # Category CRUD
│
├── app/api/
│   ├── businesses/route.ts               # GET list, POST create
│   ├── businesses/[id]/route.ts          # GET, PATCH, DELETE
│   ├── categories/route.ts               # GET by business, POST
│   ├── categories/[id]/route.ts          # PATCH, DELETE
│   ├── transactions/route.ts             # GET with filters
│   ├── transactions/[id]/route.ts        # PATCH category (+ memory upsert)
│   ├── transactions/source-files/route.ts# GET file list, DELETE by file
│   ├── import/route.ts                   # POST CSV → parse/dedup/AI/insert
│   ├── categorize/route.ts               # POST manual AI re-run
│   └── pnl/route.ts                      # GET aggregated P&L data
│
├── components/
│   ├── ui/                               # shadcn/ui primitives
│   ├── amount-cell.tsx                   # Signed amount with colour
│   ├── business-switcher.tsx             # Business selector dropdown
│   ├── category-select.tsx               # Category dropdown (grouped)
│   ├── confirm-dialog.tsx                # Generic confirmation modal
│   └── date-range-picker.tsx             # Preset + custom date range
│
├── lib/
│   ├── types.ts                          # Shared TypeScript types
│   ├── hash.ts                           # SHA-256 dedup hash
│   ├── ai/
│   │   ├── providers.ts                  # Multi-provider fallback engine
│   │   └── categorize.ts                 # Public categorize function
│   ├── csv/
│   │   └── parse.ts                      # Papa Parse + column auto-detect
│   ├── db/
│   │   ├── schema.ts                     # Drizzle schema (single source of truth)
│   │   ├── client.ts                     # SQLite connection + WAL mode
│   │   ├── migrate.ts                    # Auto-migration singleton
│   │   ├── seed-categories.ts            # Default categories on business create
│   │   └── migrations/                   # SQL migration files (drizzle-kit)
│   ├── memory/
│   │   └── match.ts                      # Exact + Levenshtein memory lookup
│   └── pnl/
│       └── aggregate.ts                  # GROUP BY query → P&L structure
│
├── data/
│   └── bookkeep.db                       # SQLite database (gitignored)
├── .env.local                            # API keys (gitignored)
├── drizzle.config.ts                     # Drizzle Kit config
└── next.config.ts                        # serverExternalPackages: ['better-sqlite3']
```

---

## Database

Four tables. All foreign keys cascade on delete — removing a business permanently removes all its categories, transactions, and merchant memory.

### `businesses`
| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | cuid2 |
| `name` | TEXT | Display name |
| `created_at` | INTEGER | Unix ms |

### `categories`
| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | cuid2 |
| `business_id` | TEXT FK | → businesses CASCADE |
| `name` | TEXT | e.g. "Software" |
| `kind` | TEXT | `'income'` or `'expense'` |

Unique constraint on `(business_id, name)`.

### `transactions`
| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | cuid2 |
| `business_id` | TEXT FK | → businesses CASCADE |
| `date` | TEXT | ISO `yyyy-mm-dd` |
| `description` | TEXT | Raw bank text |
| `amount` | REAL | Signed: positive = income, negative = expense |
| `category_id` | TEXT FK nullable | → categories SET NULL |
| `categorized_by` | TEXT nullable | `'ai'`, `'memory'`, or `'manual'` |
| `dedup_hash` | TEXT | SHA-256 of `businessId|date|amount|description` |
| `source_file` | TEXT nullable | Original CSV filename |
| `created_at` | INTEGER | Unix ms |

Unique constraint on `(business_id, dedup_hash)`. Index on `(business_id, date)`.

### `merchant_memory`
| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | cuid2 |
| `business_id` | TEXT FK | → businesses CASCADE |
| `normalized_desc` | TEXT | Lowercased, punctuation/digits stripped |
| `category_id` | TEXT FK | → categories CASCADE |
| `updated_at` | INTEGER | Unix ms |

Unique constraint on `(business_id, normalized_desc)`.

### Schema changes

Edit `lib/db/schema.ts`, then run:

```bash
npm run db:generate   # creates a new SQL migration file
npm run db:migrate    # applies it to bookkeep.db
```

---

## API Reference

All routes are Next.js Route Handlers under `/app/api/`. They speak plain JSON (or `multipart/form-data` for the import endpoint).

### Businesses

| Method | Path | Body / Params | Description |
|---|---|---|---|
| GET | `/api/businesses` | — | List all businesses |
| POST | `/api/businesses` | `{ name }` | Create business + seed categories |
| GET | `/api/businesses/[id]` | — | Get single business |
| PATCH | `/api/businesses/[id]` | `{ name }` | Rename |
| DELETE | `/api/businesses/[id]` | — | Delete (cascades everything) |

### Categories

| Method | Path | Body / Params | Description |
|---|---|---|---|
| GET | `/api/categories?businessId=` | — | List categories for business |
| POST | `/api/categories` | `{ businessId, name, kind }` | Create category |
| PATCH | `/api/categories/[id]` | `{ name?, kind? }` | Update |
| DELETE | `/api/categories/[id]` | — | Delete (transactions become Uncategorized) |

### Transactions

| Method | Path | Body / Params | Description |
|---|---|---|---|
| GET | `/api/transactions?businessId=&from=&to=&categoryId=` | — | List with optional filters |
| PATCH | `/api/transactions/[id]` | `{ categoryId }` | Set category + upsert merchant memory |

### Import

| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/api/import` | `multipart/form-data`: `file`, `businessId` | Parse CSV → dedup → memory → AI → insert |

Response:
```json
{
  "imported": 47,
  "skippedDuplicates": 3,
  "aiCategorized": 41,
  "memoryCategorized": 6
}
```

### Manual Re-categorize

| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/api/categorize` | `{ businessId, transactionIds: string[] }` | Re-run AI on selected rows |

### Source Files

| Method | Path | Body / Params | Description |
|---|---|---|---|
| GET | `/api/transactions/source-files?businessId=` | — | List imported CSV filenames with row counts |
| DELETE | `/api/transactions/source-files?businessId=` | `{ sourceFiles: (string\|null)[] }` | Delete all transactions from listed files |

### P&L

| Method | Path | Params | Description |
|---|---|---|---|
| GET | `/api/pnl?businessId=&from=&to=` | ISO date strings | Aggregated P&L report |

Response:
```json
{
  "range": { "from": "2026-01-01", "to": "2026-04-30" },
  "income": [{ "category": "Income", "total": 12500.00 }],
  "expenses": [
    { "category": "Software", "total": 420.00 },
    { "category": "Meals", "total": 180.00 }
  ],
  "totals": { "income": 12500.00, "expenses": 600.00, "net": 11900.00 }
}
```

---

## Migrating to Hosted (Supabase + Vercel)

The architecture was designed so this migration touches only three things — no business logic, no page components, no API shapes change.

**Step 1 — Swap the database driver**

In `lib/db/client.ts`, replace the `better-sqlite3` connection with `postgres.js` pointed at your Supabase connection string. The Drizzle schema, queries, and everything else stays identical.

**Step 2 — Move secrets**

Move `ANTHROPIC_API_KEY` (and any other provider keys) from `.env.local` to Vercel Project Settings → Environment Variables. Add `DATABASE_URL` pointing to your Supabase Postgres connection string.

**Step 3 — Deploy**

```bash
vercel deploy
```

Vercel handles SSL, CDN, and serverless functions automatically.

> Because there is no authentication, hosted mode means anyone who knows the URL can access the data. If you need privacy in hosted mode, an auth layer is a separate feature outside this architecture.

---

## Backups

The entire database is a single file: `data/bookkeep.db`.

To back up, copy that file anywhere:

```bash
cp data/bookkeep.db ~/Desktop/bookkeep-backup-$(date +%Y%m%d).db
```

To restore, stop the app, replace `data/bookkeep.db` with your backup, and restart.

The database uses WAL (Write-Ahead Logging) mode for better concurrent read performance and safer crash recovery.

---

## Non-Goals

This tool deliberately does not include:

- User authentication or login
- Direct bank feed integrations
- Invoicing, estimates, payroll, or tax filing
- Multi-user collaboration
- Rate limiting, audit logs, or production observability

These are out of scope by design. The goal is the simplest possible tool that does bookkeeping well for a single person.
