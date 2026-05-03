# Anime Mist

Anime Mist is a free, open-source anime streaming platform built as a React Single Page Application (SPA).

## Project Overview

This project is a patched and rebranded anime streaming frontend. The core application logic lives in a single bundled file (`src/bundle.js`) wrapped in a modern Vite build system, with an overlay system added for membership, admin panel, and release calendar.

## Architecture

- **Frontend**: React 18, React Router v6, Axios, TailwindCSS, FontAwesome
- **Build Tool**: Vite 5 (port 5000, proxies `/api`, `/auth`, `/admin` to the backend)
- **Backend API (local)**: `server/index.mjs` — Express.js server (port 3001) using Jikan public API
- **Backend API (Vercel)**: `api/handler.js` — Same Express logic, deployed as a Vercel serverless function
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
- `server/index.mjs` — Local Express API server (Jikan + auth routes, port 3001)
- `api/handler.js` — Vercel serverless function (same logic as server/index.mjs)
- `vercel.json` — Vercel routing: /api/* and /auth/* and /admin/* → serverless, /* → SPA
- `data/users.json` — User storage (JSON file)
- `index.html` — HTML template
- `vite.config.js` — Vite configuration with proxy to port 3001
- `css/main.css` — Global styles
- `public/animemist-logo.png` — Anime Mist logo
- `public/favicon.png` — Favicon

## API Data Source

Uses **Jikan v4** (MyAnimeList public API) at `https://api.jikan.moe/v4`. Features:
- **In-memory caching** (5 min TTL) to avoid repeated Jikan calls
- **Rate limit retry** (3 attempts, 1s/2s/3s backoff on HTTP 429)
- All routes degrade gracefully — individual sub-request failures don't crash the page

## API Routes

### Anime Data
- `GET /api` → home page data (spotlights, trending, latestEpisode, genres, topTen, etc.)
- `GET /api/home` → same as /api
- `GET /api/search?keyword={q}&page={p}` → search results
- `GET /api/search/suggest?keyword={q}` → autocomplete suggestions (id, name, jname, poster, type)
- `GET /api/info?id={malId}` → anime info — `{ results: { data: { ...animeInfo, animeInfo:{tvInfo,...} }, seasons, relatedAnimes, recommendedAnimes } }`
  - **Critical**: `data.animeInfo` is a nested copy of data — the bundle accesses `data.animeInfo.tvInfo`
- `GET /api/episodes/{animeId}` → episode list — `{ results: { episodes: [{id, number, title}], totalEpisodes } }`
- `GET /api/servers/{animeId}?ep={epId}` → server list (always HD-1 sub+dub stubs)
- `GET /api/stream?id={epId}&server={s}&type={t}` → streaming sources (returns empty link — no CDN)
- `GET /api/schedule` → weekly airing schedule (from Jikan /schedules)
- `GET /api/schedule/{animeId}` → single anime broadcast info
- `GET /api/qtip/{animeId}` → quick tooltip info card
- `GET /api/genre/{genreName}` → anime by genre (maps name→MAL genre ID)
- `GET /api/az-list/{letter}` → anime by first letter
- `GET /api/top-airing` → top airing anime
- `GET /api/most-popular` → most popular anime
- `GET /api/{category}` → catch-all category handler

### Auth & Membership
- `POST /auth/register` → register (first user becomes admin)
- `POST /auth/login` → login → returns JWT token
- `GET /auth/me` → get current user (Bearer token)
- `POST /auth/logout` → logout

### Admin (requires `x-admin-key` header or admin role JWT)
- `GET /admin/users` → list all users
- `PATCH /admin/users/:id` → update user (membership, role)
- `DELETE /admin/users/:id` → delete user
- `GET /admin/stats` → usage stats

## Page Routes (SPA)

- `/` → Landing page (minimalist splash with search bar — by design)
- `/home` → Main homepage (spotlight slider, trending, latest episodes, top 10)
- `/search?keyword={q}` → Search results grid
- `/{animeId}` → Anime detail page (info, genres, characters, episodes)
- `/watch/{animeId}` → Watch page (player, episode list, servers)
- `/genre/{name}` → Genre page
- `/top-airing`, `/most-popular`, etc. → Category pages

## Membership System

Three tiers:
- **Free** — Ads, HD, English/Japanese subtitles
- **Premium** — Ad-free, 4K, downloads (₹199/mo)
- **VIP** — Everything + multi-device + exclusive content (₹499/mo)

First registered user automatically becomes admin. Admin password for panel: `animemist@admin` (override with `ADMIN_PASSWORD` env var).

## Development

```bash
npm install
node server/index.mjs   # Start API server (port 3001)
npm run dev             # Start frontend (port 5000, proxies /api, /auth, /admin)
```

## Deployment (Vercel)

- `vercel.json` routes all `/api/*`, `/auth/*`, `/admin/*` to `api/handler.js`
- `api/handler.js` is the same Express app as `server/index.mjs` adapted for serverless
- User data is copied from `data/users.json` to `/tmp/users.json` on first invocation
- Build command: `npm run build` | Output: `dist`

## Known Limitations

- **No video streaming**: Jikan is metadata-only. The watch page player will be empty (black screen) — there is no CDN/video source. This is a frontend demo/streaming interface.
- **Jikan rate limits**: 3 req/sec. Mitigated by in-memory caching + retry logic.
- **Vercel Analytics 404s**: Harmless, baked into bundle.js (no Vercel Pro account).
