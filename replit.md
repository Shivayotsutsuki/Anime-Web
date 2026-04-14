# Anime Mist

Anime Mist is a free, open-source anime streaming platform built as a React Single Page Application (SPA).

## Project Overview

This project is a patched and rebranded version of a reverse-engineered anime streaming frontend. The core application logic lives in a single bundled file (`src/bundle.js`) wrapped in a modern Vite build system, with an overlay system added for membership, admin panel, and release calendar.

## Architecture

- **Frontend**: React 18, React Router v6, Axios, TailwindCSS, FontAwesome
- **Build Tool**: Vite 5 (port 5000, proxies `/api`, `/auth`, `/admin` to the backend)
- **Backend API**: Local Express.js server (port 3001) using the `aniwatch` npm package
- **Entry Point**: `src/main.jsx` → imports `src/bundle.js` + `src/overlay/index.jsx`
- **Styles**: `css/main.css` (TailwindCSS output), FontAwesome, `src/overlay/styles.css`

## Key Files

- `src/bundle.js` — Core application logic (patched bundle, branded as Anime Mist)
- `src/main.jsx` — App bootstrap (loads bundle + overlay)
- `src/overlay/index.jsx` — Overlay entry point (Schedule, Membership, Admin tabs)
- `src/overlay/MembershipPage.jsx` — Membership tiers page with login/register
- `src/overlay/AdminPanel.jsx` — Admin panel (user management, stats)
- `src/overlay/ScheduleView.jsx` — Anime release calendar
- `src/overlay/AuthModal.jsx` — Login/Register modal
- `src/overlay/styles.css` — Overlay UI styles
- `server/index.mjs` — Local API server (Express + aniwatch scraper + auth routes)
- `data/users.json` — User storage (auto-created)
- `index.html` — HTML template
- `vite.config.js` — Vite configuration with proxy to backend
- `css/main.css` — Global styles
- `public/animemist-logo.png` — Anime Mist logo
- `public/favicon.png` — Favicon (same logo)

## API

### Anime Data (aniwatch scraper)
- `GET /api` → home page data
- `GET /api/search?keyword={q}&page={p}` → search results
- `GET /api/info?id={id}` → anime info
- `GET /api/episodes/{animeId}` → episode list
- `GET /api/servers/{animeId}?ep={epId}` → streaming servers
- `GET /api/stream?id={episodeId}&server={s}&type={t}` → streaming sources
- `GET /api/schedule?date={date}` → release calendar
- And more category/genre/producer endpoints

### Auth & Membership
- `POST /auth/register` → register (first user becomes admin)
- `POST /auth/login` → login → returns token
- `GET /auth/me` → get current user (Bearer token)
- `POST /auth/logout` → logout

### Admin (requires `x-admin-key` header or admin role)
- `GET /admin/users` → list all users
- `PATCH /admin/users/:id` → update user (membership, role)
- `DELETE /admin/users/:id` → delete user
- `GET /admin/stats` → usage stats

## Membership System

Three tiers:
- **Free** — Ads, HD, English/Japanese subtitles
- **Premium** — Ad-free, 4K, downloads (₹199/mo)
- **VIP** — Everything + multi-device + exclusive content (₹499/mo)

First registered user automatically becomes admin. Admin password for panel: `animemist@admin` (set via `ADMIN_PASSWORD` env var to change).

## Development

```bash
npm install
node server/index.mjs   # Start API server (port 3001)
npm run dev             # Start frontend (port 5000, proxies /api, /auth, /admin)
```

## Loading Behavior

On first visit, the app shows a loading splash for 2-4 seconds while scraping live HiAnime data. Subsequent visits (within 24 hours) load instantly from localStorage cache.

## Deployment

Configured as **static** deployment:
- Build command: `npm run build`
- Public directory: `dist`

Note: For production, the backend API server needs to run separately.
