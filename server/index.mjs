import express from "express";
import cors from "cors";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { HiAnime } from "aniwatch";
import axios from "axios";

const app = express();
const PORT = 3001;
const scraper = new HiAnime.Scraper();

const DATA_FILE = path.resolve("data/users.json");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "animemist@admin";

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

function loadUsers() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
}

function hashPassword(password) {
  return crypto.createHash("sha256").update(password + "animemist-salt").digest("hex");
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function getUserByToken(token) {
  const users = loadUsers();
  return users.find((u) => u.tokens && u.tokens.includes(token));
}

function requireAuth(req, res, next) {
  const token = req.headers["authorization"]?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const user = getUserByToken(token);
  if (!user) return res.status(401).json({ error: "Invalid token" });
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  const adminKey = req.headers["x-admin-key"] || req.body?.adminKey;
  if (adminKey === ADMIN_PASSWORD) {
    req.isAdmin = true;
    return next();
  }
  const token = req.headers["authorization"]?.replace("Bearer ", "");
  if (!token) return res.status(403).json({ error: "Admin access required" });
  const user = getUserByToken(token);
  if (!user || user.role !== "admin") return res.status(403).json({ error: "Admin access required" });
  req.user = user;
  req.isAdmin = true;
  next();
}

app.post("/auth/register", (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: "All fields are required" });
  if (password.length < 6)
    return res.status(400).json({ error: "Password must be at least 6 characters" });

  const users = loadUsers();
  if (users.find((u) => u.email === email))
    return res.status(400).json({ error: "Email already registered" });
  if (users.find((u) => u.username === username))
    return res.status(400).json({ error: "Username already taken" });

  const token = generateToken();
  const user = {
    id: crypto.randomUUID(),
    username,
    email,
    passwordHash: hashPassword(password),
    membership: "free",
    role: users.length === 0 ? "admin" : "user",
    createdAt: new Date().toISOString(),
    tokens: [token],
  };
  users.push(user);
  saveUsers(users);

  const { passwordHash, tokens, ...safe } = user;
  res.json({ user: safe, token });
});

app.post("/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });

  const users = loadUsers();
  const user = users.find((u) => u.email === email);
  if (!user || user.passwordHash !== hashPassword(password))
    return res.status(401).json({ error: "Invalid email or password" });

  const token = generateToken();
  user.tokens = [...(user.tokens || []), token].slice(-5);
  saveUsers(users);

  const { passwordHash, tokens, ...safe } = user;
  res.json({ user: safe, token });
});

app.post("/auth/logout", requireAuth, (req, res) => {
  const token = req.headers["authorization"]?.replace("Bearer ", "");
  const users = loadUsers();
  const user = users.find((u) => u.id === req.user.id);
  if (user) {
    user.tokens = (user.tokens || []).filter((t) => t !== token);
    saveUsers(users);
  }
  res.json({ success: true });
});

app.get("/auth/me", requireAuth, (req, res) => {
  const { passwordHash, tokens, ...safe } = req.user;
  res.json({ user: safe });
});

app.get("/admin/users", requireAdmin, (req, res) => {
  const users = loadUsers().map(({ passwordHash, tokens, ...u }) => u);
  res.json({ users });
});

app.patch("/admin/users/:id", requireAdmin, (req, res) => {
  const users = loadUsers();
  const idx = users.findIndex((u) => u.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: "User not found" });

  const allowed = ["membership", "role", "username"];
  allowed.forEach((k) => {
    if (req.body[k] !== undefined) users[idx][k] = req.body[k];
  });
  saveUsers(users);

  const { passwordHash, tokens, ...safe } = users[idx];
  res.json({ user: safe });
});

app.delete("/admin/users/:id", requireAdmin, (req, res) => {
  let users = loadUsers();
  users = users.filter((u) => u.id !== req.params.id);
  saveUsers(users);
  res.json({ success: true });
});

app.get("/admin/stats", requireAdmin, (req, res) => {
  const users = loadUsers();
  res.json({
    total: users.length,
    free: users.filter((u) => u.membership === "free").length,
    premium: users.filter((u) => u.membership === "premium").length,
    vip: users.filter((u) => u.membership === "vip").length,
    admins: users.filter((u) => u.role === "admin").length,
  });
});

const respond = (res, data) => res.json({ results: data });
const fail = (res, err) => {
  console.error(err?.message || err);
  res.status(500).json({ results: null, error: err?.message || "Error" });
};

function transformHomePage(d) {
  return {
    spotlights: d.spotlightAnimes || [],
    trending: d.trendingAnimes || [],
    topTen: d.top10Animes || {},
    today: d.top10Animes?.today || [],
    topAiring: d.topAiringAnimes || [],
    mostPopular: d.mostPopularAnimes || [],
    mostFavorite: d.mostFavoriteAnimes || [],
    latestCompleted: d.latestCompletedAnimes || [],
    latestEpisode: d.latestEpisodeAnimes || [],
    topUpcoming: d.topUpcomingAnimes || [],
    recentlyAdded: d.latestEpisodeAnimes || [],
    genres: d.genres || [],
  };
}

app.get("/api", (req, res) =>
  scraper.getHomePage()
    .then((d) => respond(res, transformHomePage(d)))
    .catch((err) => fail(res, err))
);

app.get("/api/home", (req, res) =>
  scraper.getHomePage()
    .then((d) => respond(res, transformHomePage(d)))
    .catch((err) => fail(res, err))
);

app.get("/api/random/id", (req, res) =>
  scraper.getHomePage()
    .then((d) => {
      const list = d.trendingAnimes || d.spotlightAnimes || d.latestEpisodeAnimes || [];
      const item = list[Math.floor(Math.random() * list.length)];
      respond(res, item?.id || null);
    })
    .catch((err) => fail(res, err))
);

app.get("/api/search/suggest", (req, res) => {
  const q = req.query.keyword || req.query.q || "";
  scraper.searchSuggestions(q)
    .then((d) => respond(res, d.suggestions || d))
    .catch((err) => fail(res, err));
});

app.get("/api/search", (req, res) => {
  const q = req.query.keyword || req.query.q || "";
  const page = parseInt(req.query.page) || 1;
  scraper.search(q, page)
    .then((d) => respond(res, {
      data: d.animes || [],
      totalPages: d.totalPages || 1,
      hasNextPage: d.hasNextPage || false,
      currentPage: d.currentPage || 1,
      mostPopularAnimes: d.mostPopularAnimes || [],
    }))
    .catch((err) => fail(res, err));
});

app.get("/api/info", (req, res) => {
  const id = req.query.id || "";
  scraper.getInfo(id)
    .then((d) => {
      const info = d.anime?.info || {};
      const moreInfo = d.anime?.moreInfo || {};
      const eps = info.stats?.episodes || {};
      const tvInfo = {
        sub: eps.sub || 0,
        dub: eps.dub || 0,
        showType: info.stats?.type || "TV",
        duration: info.stats?.duration || "?",
        quality: info.stats?.quality || "HD",
        rating: info.stats?.rating || "",
        releaseDate: (moreInfo.aired || "").match(/\d{4}/)?.[0] || "",
        episodeInfo: eps,
      };
      const animeInfoNested = {
        id: info.id,
        data_id: info.id,
        title: info.name,
        name: info.name,
        poster: info.poster,
        description: info.description,
        Overview: info.description || "",
        Genres: moreInfo.genres || [],
        adultContent: false,
        japanese_title: moreInfo.japanese || info.name,
        stats: info.stats,
        tvInfo,
        moreInfo,
      };
      const data = {
        ...animeInfoNested,
        animeInfo: animeInfoNested,
        promotionalVideos: info.promotionalVideos || [],
        charactersVoiceActors: info.charactersVoiceActors || [],
        recommended_data: d.recommendedAnimes || [],
      };
      respond(res, {
        data,
        seasons: d.seasons || [],
        relatedAnimes: d.relatedAnimes || [],
        recommendedAnimes: d.recommendedAnimes || [],
        mostPopularAnimes: d.mostPopularAnimes || [],
      });
    })
    .catch((err) => fail(res, err));
});

app.get("/api/episodes/:animeId", (req, res) =>
  scraper.getEpisodes(req.params.animeId)
    .then((d) => {
      const episodes = (d.episodes || d || []).map((ep) => ({
        id: ep.episodeId || ep.id,
        number: ep.number,
        episode_no: ep.number,
        title: ep.title,
        isFiller: ep.isFiller,
      }));
      respond(res, { episodes, totalEpisodes: d.totalEpisodes || episodes.length });
    })
    .catch((err) => fail(res, err))
);

const SERVER_NAME_MAP = {
  "megacloud": "HD-1",
  "vidsrc":    "HD-2",
  "hd-1":      "HD-2",
  "hd-2":      "HD-3",
  "t-cloud":   "HD-3",
};
const ANIWATCH_SERVER_MAP = {
  "hd-1": ["megacloud", "hd-1", "hd-2"],
  "hd-2": ["hd-1", "hd-2", "megacloud"],
  "hd-3": ["hd-2", "megacloud", "hd-1"],
};

function toStreamingLink(d) {
  if (!d || !d.sources?.length) return null;
  return {
    link: { file: d.sources[0].url },
    iframe: null,
    intro: d.intro || null,
    outro: d.outro || null,
    tracks: (d.tracks || []).map(t => ({ file: t.file, label: t.label, kind: t.kind, default: t.default })),
  };
}

app.get("/api/servers/:animeId", async (req, res) => {
  const ep = req.query.ep;
  if (!ep) return fail(res, "ep query param required");

  const SNAME_MAP = {
    "megacloud": "HD-1",
    "hd-1":      "HD-1",
    "vidsrc":    "HD-2",
    "hd-2":      "HD-2",
    "t-cloud":   "HD-3",
    "hd-3":      "HD-3",
  };
  const SERVER_ORDER = { "HD-1": 0, "HD-2": 1, "HD-3": 2, "HD-4": 3 };
  const TYPE_ORDER   = { "sub": 0, "dub": 1, "hin": 2, "raw": 3 };

  try {
    const referer = `${HIANIME_BASE}/watch/${req.params.animeId}?ep=${ep}`;
    const html_resp = await axios.get(`${HIANIME_AJAX}/episode/servers?episodeId=${ep}`, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        "Referer": referer,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      },
    });
    const html = html_resp.data?.html || "";

    const flat = [];
    const seen = new Set();
    for (const m of html.matchAll(/data-type="([^"]+)"[^>]*data-id="([^"]+)"[^>]*data-server-id="([^"]+)"/g)) {
      const [, rawType, dataId, serverId] = m;
      const rawTypeLower = rawType.toLowerCase();
      const type = rawTypeLower === "hin" ? "raw" : rawTypeLower;
      if (!["sub", "dub", "raw"].includes(type)) continue;
      const btnMatch = html.slice(html.indexOf(`data-id="${dataId}"`)).match(/<a[^>]*>([^<]+)<\/a>/);
      const rawName = (btnMatch?.[1] || "").trim().toLowerCase();
      const serverName = SNAME_MAP[rawName] || SNAME_MAP[rawTypeLower] || "HD-" + serverId;
      const key = `${type}_${serverName}`;
      if (seen.has(key)) continue;
      seen.add(key);
      flat.push({ type, serverName, data_id: dataId, server_id: serverId });
    }

    flat.sort((a, b) => {
      const t = (TYPE_ORDER[a.type] ?? 99) - (TYPE_ORDER[b.type] ?? 99);
      if (t !== 0) return t;
      return (SERVER_ORDER[a.serverName] ?? 99) - (SERVER_ORDER[b.serverName] ?? 99);
    });

    respond(res, flat);
  } catch (err) {
    fail(res, err);
  }
});

const HIANIME_BASE = `https://${process.env.ANIWATCH_DOMAIN || "aniwatchtv.to"}`;
const HIANIME_AJAX = `${HIANIME_BASE}/ajax/v2`;
const HIANIME_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "X-Requested-With": "XMLHttpRequest",
};

const SERVER_DATA_ID_MAP = {
  "hd-1": 1,
  "hd-2": 4,
  "hd-3": 1,
};

async function getEmbedUrl(episodeNumericId, serverDataId, referer) {
  const resp = await axios.get(`${HIANIME_AJAX}/episode/servers?episodeId=${episodeNumericId}`, {
    headers: { ...HIANIME_HEADERS, Referer: referer },
  });
  const html = resp.data?.html || "";
  const regex = new RegExp(`data-id="([^"]+)"[^>]*data-server-id="${serverDataId}"`, "i");
  const match = html.match(regex);
  if (!match) {
    const anyMatch = html.match(/data-id="([^"]+)"/);
    if (!anyMatch) throw new Error("No server found");
    return anyMatch[1];
  }
  return match[1];
}

async function getEmbedLink(dataId, referer) {
  const resp = await axios.get(`${HIANIME_AJAX}/episode/sources?id=${dataId}`, {
    headers: { ...HIANIME_HEADERS, Referer: referer },
  });
  return resp.data?.link || null;
}

app.get("/api/stream", async (req, res) => {
  const id = req.query.id || "";
  const ep = req.query.ep || "";
  const fullId = ep ? `${id}?ep=${ep}` : id;
  const server = (req.query.server || "hd-1").toLowerCase();
  const type = req.query.type || "sub";

  const epNumericId = ep || fullId.split("?ep=")[1];
  const referer = `${HIANIME_BASE}/watch/${fullId}`;
  const serverDataId = SERVER_DATA_ID_MAP[server] || 4;

  try {
    const tryServers = ANIWATCH_SERVER_MAP[server] || ["megacloud", "hd-1", "hd-2"];
    for (const srv of tryServers) {
      try {
        const d = await scraper.getEpisodeSources(fullId, srv, type);
        if (d?.sources?.length) {
          return res.json({ results: { streamingLink: toStreamingLink(d) } });
        }
      } catch (_) {}
    }
  } catch (_) {}

  try {
    const dataId = await getEmbedUrl(epNumericId, serverDataId, referer);
    const embedLink = await getEmbedLink(dataId, referer);
    if (embedLink) {
      return res.json({
        results: {
          streamingLink: {
            link: null,
            iframe: embedLink,
            intro: null,
            outro: null,
            tracks: [],
          },
        },
      });
    }
  } catch (e) {
    console.error("embed fallback error:", e.message);
  }

  return res.json({ results: null, error: "No stream found. Try a different server." });
});

app.get("/api/schedule", (req, res) => {
  const date = req.query.date || new Date().toISOString().split("T")[0];
  scraper.getEstimatedSchedule(date)
    .then((d) => {
      const animes = (d.scheduledAnimes || []).map((a) => ({
        id: a.id,
        name: a.name,
        title: a.name,
        jname: a.jname,
        time: a.time,
        episode: a.episode,
        airingTimestamp: a.airingTimestamp,
        secondsUntilAiring: a.secondsUntilAiring,
      }));
      respond(res, animes);
    })
    .catch((err) => fail(res, err));
});

app.get("/api/schedule/:animeId", (req, res) =>
  scraper.getNextEpisodeSchedule(req.params.animeId)
    .then((d) => respond(res, d))
    .catch((err) => fail(res, err))
);

app.get("/api/qtip/:animeId", (req, res) =>
  scraper.getQtipInfo(req.params.animeId)
    .then((d) => respond(res, d))
    .catch((err) => fail(res, err))
);

app.get("/api/character/list/:animeId", (req, res) =>
  scraper.getInfo(req.params.animeId)
    .then((d) =>
      respond(res, d?.anime?.info?.charactersVoiceActors || d?.charactersVoiceActors || [])
    )
    .catch((err) => fail(res, err))
);

app.get("/api/producer/:producerId", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  scraper.getProducerAnimes(req.params.producerId, page)
    .then((d) => respond(res, {
      data: d.animes || [],
      totalPages: d.totalPages || 1,
      hasNextPage: d.hasNextPage || false,
      currentPage: d.currentPage || 1,
      producerName: d.producerName,
      topAiringAnimes: d.topAiringAnimes || [],
    }))
    .catch((err) => fail(res, err));
});

app.get("/api/genre/:genreName", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  scraper.getGenreAnime(req.params.genreName, page)
    .then((d) => respond(res, {
      data: d.animes || [],
      totalPages: d.totalPages || 1,
      hasNextPage: d.hasNextPage || false,
      currentPage: d.currentPage || 1,
      genreName: d.genreName,
      topAiringAnimes: d.topAiringAnimes || [],
    }))
    .catch((err) => fail(res, err));
});

app.get("/api/az-list/:letter", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  scraper.getAZList(req.params.letter, page)
    .then((d) => respond(res, {
      data: d.animes || [],
      totalPages: d.totalPages || 1,
      hasNextPage: d.hasNextPage || false,
      currentPage: d.currentPage || 1,
    }))
    .catch((err) => fail(res, err));
});

app.get("/api/:category", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const category = req.params.category;
  scraper.getCategoryAnime(category, page)
    .then((d) => respond(res, {
      data: d.animes || [],
      totalPages: d.totalPages || 1,
      hasNextPage: d.hasNextPage || false,
      currentPage: d.currentPage || 1,
      category: d.category,
    }))
    .catch((err) => fail(res, err));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Anime Mist API server running on http://localhost:${PORT}`);
});
