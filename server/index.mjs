import express from "express";
import cors from "cors";
import { HiAnime } from "aniwatch";

const app = express();
const PORT = 3001;
const scraper = new HiAnime.Scraper();

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
  scraper
    .getHomePage()
    .then((d) => respond(res, transformHomePage(d)))
    .catch((err) => fail(res, err))
);

app.get("/api/home", (req, res) =>
  scraper
    .getHomePage()
    .then((d) => respond(res, transformHomePage(d)))
    .catch((err) => fail(res, err))
);

app.get("/api/random/id", (req, res) =>
  scraper
    .getHomePage()
    .then((d) => {
      const list = d.trendingAnimes || d.spotlightAnimes || d.latestEpisodeAnimes || [];
      const item = list[Math.floor(Math.random() * list.length)];
      respond(res, item?.id || null);
    })
    .catch((err) => fail(res, err))
);

app.get("/api/search/suggest", (req, res) => {
  const q = req.query.keyword || req.query.q || "";
  scraper
    .searchSuggestions(q)
    .then((d) => respond(res, d.suggestions || d))
    .catch((err) => fail(res, err));
});

app.get("/api/search", (req, res) => {
  const q = req.query.keyword || req.query.q || "";
  const page = parseInt(req.query.page) || 1;
  scraper
    .search(q, page)
    .then((d) => respond(res, d))
    .catch((err) => fail(res, err));
});

app.get("/api/info", (req, res) => {
  const id = req.query.id || "";
  scraper
    .getInfo(id)
    .then((d) => respond(res, d))
    .catch((err) => fail(res, err));
});

app.get("/api/episodes/:animeId", (req, res) =>
  scraper
    .getEpisodes(req.params.animeId)
    .then((d) => respond(res, d.episodes || d))
    .catch((err) => fail(res, err))
);

app.get("/api/servers/:animeId", (req, res) => {
  const ep = req.query.ep;
  const animeEpisodeId = ep
    ? `${req.params.animeId}?ep=${ep}`
    : req.params.animeId;
  scraper
    .getEpisodeServers(animeEpisodeId)
    .then((d) => respond(res, d))
    .catch((err) => fail(res, err));
});

app.get("/api/stream", (req, res) => {
  const rawId = req.query.id || "";
  const server = req.query.server || "hd-1";
  const type = req.query.type || "sub";
  scraper
    .getEpisodeSources(rawId, server, type)
    .then((d) => respond(res, d))
    .catch((err) => fail(res, err));
});

app.get("/api/schedule", (req, res) => {
  const date = req.query.date || new Date().toISOString().split("T")[0];
  scraper
    .getEstimatedSchedule(date)
    .then((d) => respond(res, d.scheduledAnimes || d))
    .catch((err) => fail(res, err));
});

app.get("/api/schedule/:animeId", (req, res) =>
  scraper
    .getNextEpisodeSchedule(req.params.animeId)
    .then((d) => respond(res, d))
    .catch((err) => fail(res, err))
);

app.get("/api/qtip/:animeId", (req, res) =>
  scraper
    .getQtipInfo(req.params.animeId)
    .then((d) => respond(res, d))
    .catch((err) => fail(res, err))
);

app.get("/api/character/list/:animeId", (req, res) =>
  scraper
    .getInfo(req.params.animeId)
    .then((d) =>
      respond(res, d?.anime?.info?.charactersVoiceActors || d?.charactersVoiceActors || [])
    )
    .catch((err) => fail(res, err))
);

app.get("/api/producer/:producerId", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  scraper
    .getProducerAnimes(req.params.producerId, page)
    .then((d) => respond(res, d))
    .catch((err) => fail(res, err));
});

app.get("/api/genre/:genreName", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  scraper
    .getGenreAnime(req.params.genreName, page)
    .then((d) => respond(res, d))
    .catch((err) => fail(res, err));
});

app.get("/api/az-list/:letter", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  scraper
    .getAZList(req.params.letter, page)
    .then((d) => respond(res, d))
    .catch((err) => fail(res, err));
});

app.get("/api/:category", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const category = req.params.category;
  scraper
    .getCategoryAnime(category, page)
    .then((d) => respond(res, d))
    .catch((err) => fail(res, err));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AniRock API server running on http://localhost:${PORT}`);
});
