import express from "express";
import cors from "cors";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import axios from "axios";

const app = express();
const PORT = 3001;
const DATA_FILE = path.resolve("data/users.json");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "animemist@admin";
const JIKAN_BASE = "https://api.jikan.moe/v4";

// ─── Simple in-memory cache ───────────────────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}
function cacheSet(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

// ─── Jikan helper with rate-limit retry ──────────────────────────────────────
async function jikan(p, params = {}, retries = 3) {
  const url = new URL(`${JIKAN_BASE}${p}`);
  Object.entries(params).forEach(([k, v]) => { if (v != null) url.searchParams.set(k, v); });
  const key = url.toString();
  const cached = cacheGet(key);
  if (cached) return cached;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const r = await axios.get(key, { timeout: 15000 });
      cacheSet(key, r.data);
      return r.data;
    } catch (err) {
      const status = err?.response?.status;
      if (status === 429 && attempt < retries - 1) {
        await new Promise(res => setTimeout(res, 1000 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
}

// ─── Transform Jikan anime → bundle-compatible shape ─────────────────────────
function transformAnime(a) {
  if (!a) return null;
  const tvInfo = {
    sub: a.episodes || 0,
    dub: 0,
    showType: a.type || "TV",
    duration: a.duration || "?",
    quality: "HD",
    rating: a.score ? String(a.score) : "",
    releaseDate: a.aired?.prop?.from?.year ? String(a.aired.prop.from.year) : "",
    episodeInfo: { sub: a.episodes || 0, dub: 0 },
  };
  const moreInfo = {
    aired: a.aired?.string || "",
    genres: (a.genres || []).map(g => g.name),
    japanese: a.title_japanese || "",
    studios: (a.studios || []).map(s => s.name).join(", "),
    status: a.status || "",
    duration: a.duration || "",
    quality: "HD",
  };
  const base = {
    id: String(a.mal_id),
    data_id: String(a.mal_id),
    title: a.title_english || a.title,
    name: a.title_english || a.title,
    jname: a.title_japanese || a.title,
    poster: a.images?.webp?.large_image_url || a.images?.jpg?.large_image_url || "",
    description: a.synopsis || "",
    Overview: a.synopsis || "",
    Genres: (a.genres || []).map(g => g.name),
    adultContent: false,
    japanese_title: a.title_japanese || a.title,
    score: a.score,
    rank: a.rank,
    popularity: a.popularity,
    type: a.type,
    episodes: a.episodes,
    status: a.status,
    airing: a.airing,
    duration: a.duration,
    rating: a.rating,
    stats: {
      episodes: { sub: a.episodes || 0, dub: 0 },
      type: a.type || "TV",
      duration: a.duration || "?",
      quality: "HD",
      rating: a.score ? String(a.score) : "",
    },
    tvInfo,
    moreInfo,
  };
  return base;
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────
function loadUsers() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); } catch { return []; }
}
function saveUsers(users) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
}
function hashPassword(p) {
  return crypto.createHash("sha256").update(p + "animemist-salt").digest("hex");
}
function generateToken() { return crypto.randomBytes(32).toString("hex"); }
function getUserByToken(token) {
  return loadUsers().find(u => u.tokens && u.tokens.includes(token));
}
function requireAuth(req, res, next) {
  const token = req.headers["authorization"]?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const user = getUserByToken(token);
  if (!user) return res.status(401).json({ error: "Invalid token" });
  req.user = user; next();
}
function requireAdmin(req, res, next) {
  const adminKey = req.headers["x-admin-key"] || req.body?.adminKey;
  if (adminKey === ADMIN_PASSWORD) { req.isAdmin = true; return next(); }
  const token = req.headers["authorization"]?.replace("Bearer ", "");
  if (!token) return res.status(403).json({ error: "Admin access required" });
  const user = getUserByToken(token);
  if (!user || user.role !== "admin") return res.status(403).json({ error: "Admin access required" });
  req.user = user; req.isAdmin = true; next();
}

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

const respond = (res, data) => res.json({ results: data });
const fail = (res, err) => {
  console.error(err?.message || err);
  res.status(500).json({ results: null, error: err?.message || "Error" });
};

// ─── Auth routes ──────────────────────────────────────────────────────────────
app.post("/auth/register", (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: "All fields are required" });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
  const users = loadUsers();
  if (users.find(u => u.email === email)) return res.status(400).json({ error: "Email already registered" });
  if (users.find(u => u.username === username)) return res.status(400).json({ error: "Username already taken" });
  const token = generateToken();
  const user = {
    id: crypto.randomUUID(), username, email,
    passwordHash: hashPassword(password),
    membership: "free",
    role: users.length === 0 ? "admin" : "user",
    createdAt: new Date().toISOString(),
    tokens: [token],
  };
  users.push(user); saveUsers(users);
  const { passwordHash, tokens, ...safe } = user;
  res.json({ user: safe, token });
});

app.post("/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  const users = loadUsers();
  const user = users.find(u => u.email === email);
  if (!user || user.passwordHash !== hashPassword(password)) return res.status(401).json({ error: "Invalid email or password" });
  const token = generateToken();
  user.tokens = [...(user.tokens || []), token].slice(-5);
  saveUsers(users);
  const { passwordHash, tokens, ...safe } = user;
  res.json({ user: safe, token });
});

app.post("/auth/logout", requireAuth, (req, res) => {
  const token = req.headers["authorization"]?.replace("Bearer ", "");
  const users = loadUsers();
  const user = users.find(u => u.id === req.user.id);
  if (user) { user.tokens = (user.tokens || []).filter(t => t !== token); saveUsers(users); }
  res.json({ success: true });
});

app.get("/auth/me", requireAuth, (req, res) => {
  const { passwordHash, tokens, ...safe } = req.user;
  res.json({ user: safe });
});

// ─── Admin routes ─────────────────────────────────────────────────────────────
app.get("/admin/users", requireAdmin, (req, res) => {
  res.json({ users: loadUsers().map(({ passwordHash, tokens, ...u }) => u) });
});
app.patch("/admin/users/:id", requireAdmin, (req, res) => {
  const users = loadUsers();
  const idx = users.findIndex(u => u.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: "User not found" });
  ["membership", "role", "username"].forEach(k => { if (req.body[k] !== undefined) users[idx][k] = req.body[k]; });
  saveUsers(users);
  const { passwordHash, tokens, ...safe } = users[idx];
  res.json({ user: safe });
});
app.delete("/admin/users/:id", requireAdmin, (req, res) => {
  saveUsers(loadUsers().filter(u => u.id !== req.params.id));
  res.json({ success: true });
});
app.get("/admin/stats", requireAdmin, (req, res) => {
  const users = loadUsers();
  res.json({
    total: users.length,
    free: users.filter(u => u.membership === "free").length,
    premium: users.filter(u => u.membership === "premium").length,
    vip: users.filter(u => u.membership === "vip").length,
    admins: users.filter(u => u.role === "admin").length,
  });
});

// ─── Home data helper ─────────────────────────────────────────────────────────
async function homeData() {
  const [topAiring, seasonal, topAll] = await Promise.all([
    jikan("/top/anime", { filter: "airing", limit: 10 }),
    jikan("/seasons/now", { limit: 15 }),
    jikan("/top/anime", { limit: 10 }),
  ]);
  const airing = (topAiring.data || []).map(transformAnime);
  const seasonalList = (seasonal.data || []).map(transformAnime);
  const topList = (topAll.data || []).map(transformAnime);
  return {
    spotlights: airing.slice(0, 5),
    trending: airing.slice(0, 10),
    topTen: { today: airing.slice(0, 10), week: topList.slice(0, 10), month: topList.slice(0, 10) },
    today: airing.slice(0, 10),
    topAiring: airing,
    mostPopular: topList,
    mostFavorite: topList,
    latestCompleted: seasonalList,
    latestEpisode: seasonalList,
    topUpcoming: [],
    recentlyAdded: seasonalList,
    genres: ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Mystery", "Romance", "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller"],
  };
}

// ─── Anime API routes ─────────────────────────────────────────────────────────
app.get("/api", async (req, res) => { try { respond(res, await homeData()); } catch (err) { fail(res, err); } });
app.get("/api/home", async (req, res) => { try { respond(res, await homeData()); } catch (err) { fail(res, err); } });

app.get("/api/random/id", async (req, res) => {
  try {
    const d = await jikan("/top/anime", { filter: "airing", limit: 25 });
    const list = d.data || [];
    const item = list[Math.floor(Math.random() * list.length)];
    respond(res, item ? String(item.mal_id) : null);
  } catch (err) { fail(res, err); }
});

app.get("/api/search/suggest", async (req, res) => {
  const q = req.query.keyword || req.query.q || "";
  if (!q.trim()) return respond(res, []);
  try {
    const d = await jikan("/anime", { q, limit: 8, sfw: true });
    respond(res, (d.data || []).map(a => ({
      id: String(a.mal_id),
      name: a.title_english || a.title,
      jname: a.title_japanese || a.title,
      poster: a.images?.webp?.image_url || a.images?.jpg?.image_url || "",
      type: a.type || "TV",
    })));
  } catch (err) { fail(res, err); }
});

app.get("/api/search", async (req, res) => {
  const q = req.query.keyword || req.query.q || "";
  const page = parseInt(req.query.page) || 1;
  try {
    const d = await jikan("/anime", { q, page, limit: 20, sfw: true });
    respond(res, {
      data: (d.data || []).map(transformAnime),
      totalPages: d.pagination?.last_visible_page || 1,
      hasNextPage: d.pagination?.has_next_page || false,
      currentPage: page,
      mostPopularAnimes: [],
    });
  } catch (err) { fail(res, err); }
});

app.get("/api/info", async (req, res) => {
  const id = req.query.id || "";
  const malId = id.replace(/[^0-9]/g, "") || id;
  if (!malId) return res.status(400).json({ error: "id required" });
  try {
    const [infoResp, charsResp, recResp] = await Promise.all([
      jikan(`/anime/${malId}/full`),
      jikan(`/anime/${malId}/characters`).catch(() => ({ data: [] })),
      jikan(`/anime/${malId}/recommendations`).catch(() => ({ data: [] })),
    ]);
    const a = infoResp.data;
    const baseData = transformAnime(a);

    const charactersVoiceActors = (charsResp.data || []).slice(0, 20).map(c => ({
      character: {
        id: c.character?.mal_id,
        name: c.character?.name,
        poster: c.character?.images?.webp?.image_url || c.character?.images?.jpg?.image_url || "",
      },
      voiceActors: (c.voice_actors || []).slice(0, 2).map(va => ({
        id: va.person?.mal_id,
        name: va.person?.name,
        poster: va.person?.images?.jpg?.image_url || "",
      })),
    }));

    const recommended_data = (recResp.data || []).slice(0, 10).map(r => ({
      id: String(r.entry?.mal_id),
      name: r.entry?.title,
      title: r.entry?.title,
      poster: r.entry?.images?.webp?.image_url || r.entry?.images?.jpg?.image_url || "",
    }));

    const data = {
      ...baseData,
      animeInfo: { ...baseData },
      promotionalVideos: a.trailer?.url ? [{ title: "Trailer", source: a.trailer.url, thumbnail: a.trailer.images?.maximum_image_url || "" }] : [],
      charactersVoiceActors,
      recommended_data,
    };
    data.animeInfo.charactersVoiceActors = charactersVoiceActors;

    const relatedAnimes = (a.relations || []).flatMap(r =>
      (r.entry || []).filter(e => e.type === "anime").map(e => ({
        id: String(e.mal_id), name: e.name, title: e.name, relation: r.relation,
        poster: "",
      }))
    );

    // Build seasons from Sequel/Prequel relations
    const sequelEntries = (a.relations || [])
      .filter(r => ["Sequel", "Prequel", "Alternative version"].includes(r.relation))
      .flatMap(r => (r.entry || []).filter(e => e.type === "anime"))
      .slice(0, 5);

    let seasons = [];
    if (sequelEntries.length > 0) {
      const posterResults = await Promise.allSettled(
        sequelEntries.map(e => jikan(`/anime/${e.mal_id}`))
      );
      seasons = [
        {
          id: String(malId),
          season: a.title_english || a.title,
          season_poster: a.images?.webp?.large_image_url || a.images?.jpg?.large_image_url || "",
        },
        ...sequelEntries.map((e, i) => ({
          id: String(e.mal_id),
          season: e.name,
          season_poster: posterResults[i].status === "fulfilled"
            ? (posterResults[i].value?.data?.images?.webp?.large_image_url || posterResults[i].value?.data?.images?.jpg?.large_image_url || "")
            : "",
        })),
      ];
    }

    respond(res, {
      data,
      seasons,
      relatedAnimes,
      recommendedAnimes: recommended_data,
      mostPopularAnimes: [],
    });
  } catch (err) { fail(res, err); }
});

app.get("/api/episodes/:animeId", async (req, res) => {
  const malId = parseInt(req.params.animeId.replace(/[^0-9]/g, "") || req.params.animeId, 10);
  try {
    const infoResp = await jikan(`/anime/${malId}`);
    const totalEpisodes = infoResp.data?.episodes || 0;
    // Encode malId + episode number into the id so the player can resolve the correct anime.
    // Format: "x?ep=<malId*100000+epNum>" — the bundle extracts the number after "ep=" and
    // sends it to /api/embed/:encodedId/:type where we decode back to malId and episode.
    const episodes = Array.from({ length: Math.min(totalEpisodes, 500) }, (_, i) => ({
      id: `x?ep=${malId * 100000 + (i + 1)}`,
      number: i + 1,
      episode_no: i + 1,
      title: `Episode ${i + 1}`,
      isFiller: false,
    }));
    respond(res, { episodes, totalEpisodes });
  } catch (err) { fail(res, err); }
});

// ─── ani.zip mapping cache (MAL → TMDB + type) ───────────────────────────────
const mappingCache = new Map();
async function getMapping(malId) {
  if (mappingCache.has(malId)) return mappingCache.get(malId);
  try {
    const r = await axios.get(`https://api.ani.zip/mappings?mal_id=${malId}`, { timeout: 8000 });
    const m = r.data?.mappings || {};
    const result = { tmdbId: m.themoviedb_id || null, type: (m.type || "TV").toLowerCase() };
    mappingCache.set(malId, result);
    return result;
  } catch {
    return { tmdbId: null, type: "tv" };
  }
}

// Encode malId + episode into a single number: malId * 100000 + ep
// This lets the bundle extract it via /ep=(\d+)/ and we can decode it server-side
function encodeEpId(malId, ep) { return malId * 100000 + ep; }
function decodeEpId(encoded) {
  const n = parseInt(encoded, 10);
  return { malId: Math.floor(n / 100000), ep: n % 100000 };
}

app.get("/api/servers/:animeId", async (req, res) => {
  const ep = req.query.ep || "1";
  respond(res, [
    { type: "sub", serverName: "HD-1", data_id: `${ep}-s1`, server_id: "1" },
    { type: "dub", serverName: "HD-1", data_id: `${ep}-d1`, server_id: "2" },
    { type: "sub", serverName: "HD-2", data_id: `${ep}-s2`, server_id: "3" },
    { type: "dub", serverName: "HD-2", data_id: `${ep}-d2`, server_id: "4" },
    { type: "sub", serverName: "HD-3", data_id: `${ep}-s3`, server_id: "5" },
    { type: "dub", serverName: "HD-3", data_id: `${ep}-d3`, server_id: "6" },
    { type: "sub", serverName: "HD-4", data_id: `${ep}-s4`, server_id: "7" },
    { type: "dub", serverName: "HD-4", data_id: `${ep}-d4`, server_id: "8" },
  ]);
});

app.get("/api/stream", (req, res) => {
  res.json({
    results: { streamingLink: { link: { file: "" }, iframe: null, intro: null, outro: null, tracks: [] } },
  });
});

// ─── Shared embed handler ─────────────────────────────────────────────────────
// Proxies provider HTML from our server so the bundle's iframe is same-origin.
// Same-origin iframe → window.top === window → providers can't detect sandbox.
// Injected patch also explicitly overrides top/parent/frameElement to be safe.
const EMBED_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Patch injected into provider HTML — neutralises sandbox-detection checks.
// We create a fake window.top that is NOT equal to window (so providers that
// check "if(window===window.top){redirect}" keep showing the player), but whose
// .location is accessible (so "try{window.top.location.href}catch{sandboxError}"
// doesn't throw).
const SANDBOX_PATCH = `<script>
(function(){
  var w=window;
  // 1. Fake window.top: NOT equal to window (so "if(window===window.top){redirect}" stays false)
  //    but .location is readable (so sandbox try/catch doesn't throw).
  var fakeTop={
    location:{href:w.location.href,hostname:w.location.hostname,protocol:w.location.protocol,origin:w.location.origin,pathname:w.location.pathname},
    document:w.document,postMessage:w.postMessage.bind(w),
    addEventListener:w.addEventListener.bind(w),frames:[],length:0,closed:false
  };
  fakeTop.window=fakeTop; fakeTop.top=fakeTop; fakeTop.parent=fakeTop; fakeTop.self=fakeTop;
  function def(k,v){try{Object.defineProperty(w,k,{get:function(){return v;},configurable:true});}catch(e){}}
  def('top',fakeTop); def('parent',fakeTop); def('frameElement',null);

  // 2. Fix relative fetch/XHR calls so they resolve to the PROVIDER origin
  //    (not our proxy domain). The provider origin is set in <base href="...">.
  var providerOrigin=(document.querySelector('base')||{}).href||'';
  providerOrigin=providerOrigin.replace(/\\/$/,'');
  if(providerOrigin){
    var _fetch=w.fetch;
    w.fetch=function(url,opts){
      if(typeof url==='string'&&url.charAt(0)==='/'){url=providerOrigin+url;}
      return _fetch.call(w,url,opts);
    };
    var _open=XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open=function(m,url){
      if(typeof url==='string'&&url.charAt(0)==='/'){url=providerOrigin+url;}
      return _open.apply(this,arguments);
    };
  }
})();
</script>`;

async function handleEmbed(req, res, buildUrl) {
  const { malId, ep } = decodeEpId(req.params.encodedId);
  let providerUrl = null;

  try {
    const { tmdbId, type } = await getMapping(malId);
    providerUrl = buildUrl(tmdbId, type, ep);
  } catch {}

  if (!providerUrl) {
    const { malId: m, ep: e } = decodeEpId(req.params.encodedId);
    providerUrl = `https://vidsrc.xyz/embed/tv?tmdb=${m}&season=1&episode=${e}`;
  }

  try {
    const response = await axios.get(providerUrl, {
      timeout: 12000,
      maxRedirects: 5,
      headers: {
        "User-Agent": EMBED_UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.google.com/",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "cross-site",
      },
      validateStatus: s => s < 500,
    });

    let html = typeof response.data === "string" ? response.data : JSON.stringify(response.data);
    if (!html.includes("<html") && !html.includes("<!DOCTYPE")) throw new Error("Non-HTML response");

    // Determine the actual base URL (after any redirects) for relative assets
    const finalUrl = response.request?.res?.responseUrl || providerUrl;
    const baseOrigin = new URL(finalUrl).origin;

    // Inject base tag + sandbox-detection patch right after <head>
    // If no <head>, inject at the very start
    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/(<head[^>]*>)/i, `$1<base href="${baseOrigin}/">${SANDBOX_PATCH}`);
    } else {
      html = `<base href="${baseOrigin}/">${SANDBOX_PATCH}` + html;
    }

    res.removeHeader("X-Frame-Options");
    res.setHeader("Content-Security-Policy", "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    console.error(`[Embed] proxy failed for ${providerUrl}: ${err.message} — falling back to redirect`);
    res.redirect(302, providerUrl);
  }
}

// ─── HD-1 → vidlink.pro (primary — no nested iframes, JWPlayer, SSR data) ────
app.get("/api/embed/:encodedId/:type", (req, res) =>
  handleEmbed(req, res, (tmdbId, type, ep) => {
    if (!tmdbId) return null;
    return type === "movie"
      ? `https://vidlink.pro/movie/${tmdbId}`
      : `https://vidlink.pro/tv/${tmdbId}/1/${ep}`;
  })
);

// ─── HD-2 → vidsrc.me ────────────────────────────────────────────────────────
app.get("/api/embed2/:encodedId/:type", (req, res) =>
  handleEmbed(req, res, (tmdbId, type, ep) => {
    if (!tmdbId) return null;
    return type === "movie"
      ? `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`
      : `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=1&episode=${ep}`;
  })
);

// ─── HD-3 → 2embed.cc ────────────────────────────────────────────────────────
app.get("/api/embed3/:encodedId/:type", (req, res) =>
  handleEmbed(req, res, (tmdbId, type, ep) => {
    if (!tmdbId) return null;
    return type === "movie"
      ? `https://www.2embed.cc/embed/${tmdbId}`
      : `https://www.2embed.cc/embedtv/${tmdbId}?s=1&e=${ep}`;
  })
);

// ─── HD-4 → vidsrc.xyz ───────────────────────────────────────────────────────
app.get("/api/embed4/:encodedId/:type", (req, res) =>
  handleEmbed(req, res, (tmdbId, type, ep) => {
    if (!tmdbId) return null;
    return type === "movie"
      ? `https://vidsrc.xyz/embed/movie?tmdb=${tmdbId}`
      : `https://vidsrc.xyz/embed/tv?tmdb=${tmdbId}&season=1&episode=${ep}`;
  })
);

app.get("/api/schedule", async (req, res) => {
  try {
    const d = await jikan("/schedules", { limit: 25 });
    respond(res, (d.data || []).map(a => ({
      id: String(a.mal_id),
      name: a.title_english || a.title,
      title: a.title_english || a.title,
      jname: a.title_japanese || a.title,
      time: a.broadcast?.time || "TBA",
      episode: a.episodes || null,
      airingTimestamp: null,
      secondsUntilAiring: null,
    })));
  } catch (err) { fail(res, err); }
});

app.get("/api/schedule/:animeId", async (req, res) => {
  const malId = req.params.animeId.replace(/[^0-9]/g, "") || req.params.animeId;
  try {
    const d = await jikan(`/anime/${malId}`);
    respond(res, { broadcast: d.data?.broadcast || null, nextEpisodeSchedule: null });
  } catch (err) { fail(res, err); }
});

app.get("/api/qtip/:animeId", async (req, res) => {
  const malId = req.params.animeId.replace(/[^0-9]/g, "") || req.params.animeId;
  try {
    const d = await jikan(`/anime/${malId}`);
    respond(res, transformAnime(d.data));
  } catch (err) { fail(res, err); }
});

app.get("/api/character/list/:animeId", async (req, res) => {
  const malId = req.params.animeId.replace(/[^0-9]/g, "") || req.params.animeId;
  try {
    const d = await jikan(`/anime/${malId}/characters`);
    respond(res, (d.data || []).slice(0, 30).map(c => ({
      character: {
        id: c.character?.mal_id,
        name: c.character?.name,
        poster: c.character?.images?.webp?.image_url || c.character?.images?.jpg?.image_url || "",
      },
      voiceActors: (c.voice_actors || []).slice(0, 2).map(va => ({
        id: va.person?.mal_id,
        name: va.person?.name,
        poster: va.person?.images?.jpg?.image_url || "",
      })),
    })));
  } catch (err) { fail(res, err); }
});

app.get("/api/producer/:producerId", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  try {
    const d = await jikan("/top/anime", { page, limit: 20 });
    respond(res, {
      data: (d.data || []).map(transformAnime),
      totalPages: d.pagination?.last_visible_page || 1,
      hasNextPage: d.pagination?.has_next_page || false,
      currentPage: page,
      producerName: req.params.producerId,
      topAiringAnimes: [],
    });
  } catch (err) { fail(res, err); }
});

app.get("/api/genre/:genreName", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const genreMap = {
    action: 1, adventure: 2, cars: 3, comedy: 4, dementia: 5,
    demons: 6, mystery: 7, drama: 8, ecchi: 9, fantasy: 10,
    game: 11, historical: 13, horror: 14, kids: 15, magic: 16,
    "martial-arts": 17, mecha: 18, music: 19, parody: 20,
    samurai: 21, romance: 22, school: 23, "sci-fi": 24, shoujo: 25,
    "shoujo-ai": 26, shounen: 27, "shounen-ai": 28, space: 29,
    sports: 30, "super-power": 31, vampire: 32, harem: 35,
    "slice-of-life": 36, "slice of life": 36, supernatural: 37,
    military: 38, police: 39, psychological: 40, thriller: 41,
    seinen: 42, josei: 43, isekai: 62,
  };
  const genreId = genreMap[req.params.genreName.toLowerCase()] || 1;
  try {
    const d = await jikan("/anime", { genres: genreId, page, limit: 20, sfw: true });
    respond(res, {
      data: (d.data || []).map(transformAnime),
      totalPages: d.pagination?.last_visible_page || 1,
      hasNextPage: d.pagination?.has_next_page || false,
      currentPage: page,
      genreName: req.params.genreName,
      topAiringAnimes: [],
    });
  } catch (err) { fail(res, err); }
});

app.get("/api/az-list", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  try {
    const d = await jikan("/anime", { order_by: "title", sort: "asc", page, limit: 20, sfw: true });
    respond(res, {
      data: (d.data || []).map(transformAnime),
      totalPages: d.pagination?.last_visible_page || 1,
      hasNextPage: d.pagination?.has_next_page || false,
      currentPage: page,
    });
  } catch (err) { fail(res, err); }
});

app.get("/api/az-list/:letter", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  try {
    const d = await jikan("/anime", { letter: req.params.letter, page, limit: 20, sfw: true });
    respond(res, {
      data: (d.data || []).map(transformAnime),
      totalPages: d.pagination?.last_visible_page || 1,
      hasNextPage: d.pagination?.has_next_page || false,
      currentPage: page,
    });
  } catch (err) { fail(res, err); }
});

app.get("/api/:category", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const category = req.params.category;
  const filterMap = {
    "top-airing": "airing",
    "most-popular": "bypopularity",
    "most-favorite": "favorite",
    "subbed-anime": "airing",
    "dubbed-anime": "airing",
    "recently-added": "airing",
    "top-upcoming": "upcoming",
  };
  const typeMap = { movie: "movie", tv: "tv", ova: "ova", ona: "ona", special: "special" };
  try {
    let d;
    if (filterMap[category]) {
      d = await jikan("/top/anime", { filter: filterMap[category], page, limit: 20 });
    } else if (typeMap[category]) {
      d = await jikan("/top/anime", { type: typeMap[category], page, limit: 20 });
    } else {
      d = await jikan("/top/anime", { page, limit: 20 });
    }
    respond(res, {
      data: (d.data || []).map(transformAnime),
      totalPages: d.pagination?.last_visible_page || 1,
      hasNextPage: d.pagination?.has_next_page || false,
      currentPage: page,
      category,
    });
  } catch (err) { fail(res, err); }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Anime Mist API server running on http://localhost:${PORT}`);
});
