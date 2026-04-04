# PokeVault — Pokémon Card Collection Dashboard

A full-stack web app for tracking your Pokémon card collection and eBay sales, with automatic market pricing from the Pokémon TCG API.

---

## Features

- **Collection Tracker** — Add/edit/delete cards with grades, purchase price, date, notes
- **Auto Market Pricing** — Pulls current prices from the Pokémon TCG API by card ID
- **Profit/Loss** — Unrealized ROI per card vs purchase price
- **eBay Tracker** — Log listings, auto-calculate eBay fees (13.25% + $0.30 default), record net profit
- **Dashboard** — Portfolio value, ROI, realized profit, best/worst performers, recent sales
- **Charts** — Portfolio by set, purchase vs market price, monthly sales profit
- **CSV Import/Export** — Bulk import cards, export collection and eBay data
- **Pokémon TCG Search** — Search cards inline when adding to collection

---

## Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL (or use Railway's free PostgreSQL addon)

### Setup

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd pokemon-dashboard

# 2. Copy env example
cp .env.example .env
# Edit .env with your DATABASE_URL and optional POKEMON_TCG_API_KEY

# 3. Install dependencies
npm run install:all

# 4. Start dev servers (runs Express on :3001 + Vite on :5173)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

The Vite dev server proxies `/api` requests to Express on port 3001.

---

## Railway Deployment

### Step 1 — Create a Railway project

1. Go to [railway.app](https://railway.app) and create a new project
2. Click **+ New** → **Deploy from GitHub repo** → connect your repo

### Step 2 — Add a PostgreSQL database

1. In your Railway project, click **+ New** → **Database** → **PostgreSQL**
2. Railway automatically sets the `DATABASE_URL` environment variable in your service

### Step 3 — Set environment variables

In your Railway service settings → **Variables**, add:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `POKEMON_TCG_API_KEY` | Your key from [pokemontcg.io](https://pokemontcg.io) (optional but recommended) |

`DATABASE_URL` and `PORT` are set automatically by Railway.

### Step 4 — Deploy

Railway will:
1. Run `npm install && npm run build` (installs deps + builds the React app)
2. Start with `npm start` (Express serves the built React files + API)

The database tables are created automatically on first startup via the migration script.

### Step 5 — Open your app

Click the generated Railway domain (e.g. `https://your-app.up.railway.app`).

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `PORT` | No | `3001` | Server port (Railway sets this) |
| `NODE_ENV` | No | `development` | Set to `production` on Railway |
| `POKEMON_TCG_API_KEY` | No | — | API key for higher rate limits |
| `EBAY_FEE_RATE` | No | `0.1325` | Default eBay fee rate (13.25%) |
| `EBAY_FEE_FIXED` | No | `0.30` | Default eBay fixed fee per sale |

---

## CSV Import Format

For bulk importing cards, your CSV must have a `name` column (required). All other columns are optional:

```
name,set_name,card_number,condition,quantity,purchase_price,purchase_date,notes,pokemon_tcg_id,market_price,image_url
Charizard,Base Set,4/102,PSA 9,1,450.00,2023-06-15,My favorite!,base1-4,520.00,
Pikachu,Base Set,58/102,Raw NM,2,25.00,2024-01-01,,,,
```

- `purchase_date` format: `YYYY-MM-DD`
- `purchase_price` / `market_price`: numeric (e.g. `25.00`)
- `pokemon_tcg_id`: Card ID from pokemontcg.io (e.g. `base1-4`, `swsh1-25`)

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Charts | Recharts |
| Backend | Node.js + Express |
| Database | PostgreSQL (via `pg`) |
| Hosting | Railway |
| Pricing API | Pokémon TCG API (pokemontcg.io) |
