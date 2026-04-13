# ARBIHOST — Airbnb Arbitrage Intelligence Dashboard

> Scan any ZIP code for rental arbitrage opportunities. Pull real long-term rental listings, apply proven STR revenue projections, and identify properties worth reaching out about.

![Status](https://img.shields.io/badge/Status-Production_Ready-00d4b8?style=flat-square) ![API](https://img.shields.io/badge/API-Rentcast-00d4b8?style=flat-square) ![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square)

---

## What It Does

ARBIHOST pulls **live rental listings** from the Rentcast API and calculates projected short-term rental (STR) revenue using documented market multipliers. It finds the gap between what a landlord is asking for long-term and what you could earn on Airbnb.

**Features:**
- Live rental data from any US ZIP code via Rentcast API
- STR revenue projections using AirDNA-derived market multipliers (configurable)
- Sortable, filterable property table with profit scoring (1–10)
- Deal detail panel: live occupancy slider, break-even calculator
- 12-month revenue projection with seasonal model
- One-click outreach email generator with copy-to-clipboard
- Real-time activity log

---

## Quick Start

### 1. Get a Rentcast API Key

Sign up at **[app.rentcast.io/app/api-keys](https://app.rentcast.io/app/api-keys)**

- Free tier: **50 requests/month** (enough for daily scanning)
- Paid plans from **$29/month** for unlimited requests
- No credit card required for free tier

### 2. Clone & Install

```bash
git clone https://github.com/brodyautomates/arbihost.git
cd arbihost
npm install
```

### 3. Configure Your API Key

```bash
cp .env.example .env
```

Edit `.env`:

```
RENTCAST_API_KEY=your_key_here
```

### 4. Run

```bash
npm run dev
```

Open **http://localhost:5173**

---

## STR Revenue Projection Methodology

```
Projected Monthly STR Revenue = LT Monthly Rent × Bedroom Multiplier × Seasonal Factor
```

| Bedrooms | Multiplier | Basis |
|----------|-----------|-------|
| 1BR | 2.30x | AirDNA Miami data |
| 2BR | 2.10x | AirDNA Miami data |
| 3BR | 1.95x | AirDNA Miami data |
| 4BR | 1.82x | AirDNA Miami data |

Seasonal factors reflect Miami's Dec–Mar tourist peak. Adjustable in `src/App.jsx`.

---

## API Security

The API key lives in `.env` and is injected server-side by Vite's proxy. It is **never exposed in the browser bundle.** All requests go to `/api/rentcast/...` which Vite proxies to `api.rentcast.io`.

---

## Adapting for Other Markets

1. Enter any US ZIP code in the header
2. Adjust `STR_MULTIPLIER_BY_BED` in `src/App.jsx` for your market
3. Update `SEASONALITY` for your peak season pattern

---

## Tech Stack

- React 19 + Vite · Tailwind CSS v3 · Recharts · Rentcast API

---

## License

MIT — free to use, modify, and deploy commercially.
