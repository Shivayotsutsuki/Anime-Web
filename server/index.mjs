import express from "express";
import cors from "cors";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { HiAnime } from "aniwatch";

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
    .then((d) => respond(res, d))
    .catch((err) => fail(res, err));
});

app.get("/api/episodes/:animeId", (req, res) =>
  scraper.getEpisodes(req.params.animeId)
    .then((d) => respond(res, d.episodes || d))
    .catch((err) => fail(res, err))
);

app.get("/api/servers/:animeId", (req, res) => {
  const ep = req.query.ep;
  const animeEpisodeId = ep ? `${req.params.animeId}?ep=${ep}` : req.params.animeId;
  scraper.getEpisodeServers(animeEpisodeId)
    .then((d) => respond(res, d))
    .catch((err) => fail(res, err));
});

app.get("/api/stream", (req, res) => {
  const rawId = req.query.id || "";
  const server = req.query.server || "hd-1";
  const type = req.query.type || "sub";
  scraper.getEpisodeSources(rawId, server, type)
    .then((d) => respond(res, d))
    .catch((err) => fail(res, err));
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
