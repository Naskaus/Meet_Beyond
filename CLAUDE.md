# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GoBeyond Voucher Wallet — a travel voucher redemption web app where travelers activate vouchers via booking codes and partners redeem them with PINs. Current version: v0.11.

## Commands

```bash
# Install dependencies
npm install

# Start the server (port 3000)
node server.js
```

No test framework or linter is configured. The `npm test` script is a placeholder.

## Architecture

**Stack**: Node.js + Express.js backend, vanilla JavaScript frontend, SQLite3 database.

### Backend (`server.js`, `database.js`)

- `server.js` — Express server with REST API, session auth via `cookie-session`, static file serving for all frontend apps.
- `database.js` — SQLite schema creation, migrations, and seed data. Auto-creates `voucher_wallet.db` on first run with 12 sample vouchers and a default admin account.

### Frontend — Four Separate Apps

Each is a self-contained directory served statically by Express:

| App | Path | Entry Point | Purpose |
|-----|------|-------------|---------|
| Landing | `/` | `index.html` + `main.js` | Marketing page with anime.js scroll animations |
| Traveler App | `/app/` | `app/index.html` + `app/app.js` | 4-screen flow: activate booking code → browse vouchers → view detail → redeem with PIN |
| Admin Dashboard | `/admin/` | `admin/index.html` + `admin/script.js` | Manage partners, bookings, and voucher visibility per booking |
| Login | `/login/` | `login/index.html` + `login/script.js` | Session-based login form, redirects to `/admin/` |

### Authentication (3-Role Model)

- **Admin** — full access; default credentials: `admin` / `admin123`
- **Partner** — manages own vouchers; has a 4-digit PIN for voucher redemption
- **Traveler** — no account; uses a booking code (e.g. `BKK-2026-ABCD`) to access assigned vouchers

### Database Schema (SQLite)

Five tables: `users`, `vouchers`, `bookings`, `booking_vouchers` (many-to-many mapping of which vouchers are visible per booking), `redemptions` (audit trail).

### Key API Routes

All under `/api/`. Auth is session-based via cookies. Key patterns:
- `POST /api/login`, `POST /api/logout` — session management
- `GET|POST /api/vouchers` — list (filtered by role/booking_code query param) or create
- `GET|POST /api/bookings` — admin manages booking codes with voucher visibility
- `PUT /api/bookings/:id/vouchers` — update which vouchers a booking can see
- `POST /api/validate` — validate a booking code (traveler flow)
- `POST /api/redeem` — redeem voucher with PIN verification

### Styling

CSS variables define the GoBeyond brand: `--color-accent: #E11D48` (red), light mode, Inter font. The traveler app is mobile-optimized (max-width 480px) and PWA-ready (`app/manifest.json`).
