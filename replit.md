# AniRock

AniRock is a free, open-source anime streaming platform built as a React Single Page Application (SPA).

## Project Overview

This project is a patched and rebranded version of a reverse-engineered anime streaming frontend. The core application logic lives in a single bundled file (`src/bundle.js`) wrapped in a modern Vite build system.

## Architecture

- **Frontend**: React 18, React Router v6, Axios, TailwindCSS, FontAwesome
- **Build Tool**: Vite 5 (port 5000, proxies `/api` to the backend)
- **Backend API**: Local Express.js server (port 3001) using the `aniwatch` npm package
- **Entry Point**: `src/main.jsx` → imports `src/bundle.js`
- **Styles**: `css/main.css` (TailwindCSS output), FontAwesome

## Key Files

- `src/bundle.js` — Core application logic (patched bundle, API URL updated to `/api`)
- `src/main.jsx` — App bootstrap entry point
- `server/index.mjs` — Local API server (Express + aniwatch scraper)
- `index.html` — HTML template
- `vite.config.js` — Vite configuration with proxy to backend
- `css/main.css` — Global styles
- `public/` — Static assets

## API

The app previously relied on `https://apii-orcin-theta.vercel.app/api` (now down).

**Replacement**: A local Express API server (`server/index.mjs`) using the `aniwatch` npm package to scrape HiAnime directly. The Vite dev server proxies all `/api` requests to `http://localhost:3001`.

### Endpoint mappings:
- `GET /api` → home page data (spotlights, trending, top airing, etc.)
- `GET /api/info?id={id}` → anime info
- `GET /api/search?keyword={q}&page={p}` → search results
- `GET /api/search/suggest?keyword={q}` → search suggestions
- `GET /api/episodes/{animeId}` → episode list
- `GET /api/servers/{animeId}?ep={epId}` → streaming servers
- `GET /api/stream?id={episodeId}&server={s}&type={t}` → streaming sources
- `GET /api/schedule?date={date}` → estimated anime schedule
- `GET /api/qtip/{animeId}` → quick tooltip info
- And more category/genre/producer endpoints

## Development

```bash
npm install
node server/index.mjs   # Start API server (port 3001) 
npm run dev             # Start frontend (port 5000, proxies /api)
```

## Loading Behavior

On first visit, the app shows "Watch Anime Anytime, Anywhere" (a loading splash) for 2-4 seconds while it scrapes live data from HiAnime. After the first load, data is cached in localStorage for 24 hours for instant subsequent loads.

## Deployment

Configured as a **static** deployment:
- Build command: `npm run build`
- Public directory: `dist`

Note: For production deployment, the backend API server needs to run separately or endpoints need to be updated to a deployed API URL.
