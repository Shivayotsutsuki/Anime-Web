# AniRock

AniRock is a free, open-source anime streaming platform built as a React Single Page Application (SPA).

## Project Overview

This project is a patched and rebranded version of a reverse-engineered anime streaming frontend. The core application logic lives in a single bundled file (`src/bundle.js`) wrapped in a modern Vite build system.

## Architecture

- **Frontend**: React 18, React Router v6, Axios, TailwindCSS, FontAwesome
- **Build Tool**: Vite 5
- **Entry Point**: `src/main.jsx` → imports `src/bundle.js`
- **Styles**: `css/main.css` (TailwindCSS output), FontAwesome

## Key Files

- `src/bundle.js` — Core application logic (minified/patched bundle)
- `src/main.jsx` — App bootstrap entry point
- `index.html` — HTML template
- `vite.config.js` — Vite configuration (port 5000, host 0.0.0.0)
- `css/main.css` — Global styles
- `public/` — Static assets

## API

Data is fetched from: `https://apii-orcin-theta.vercel.app/api`

Endpoints include home page data, anime info, search suggestions, and streaming sources.

## Development

```bash
npm install
npm run dev    # Starts dev server on port 5000
npm run build  # Builds to dist/
```

## Deployment

Configured as a **static** deployment:
- Build command: `npm run build`
- Public directory: `dist`
