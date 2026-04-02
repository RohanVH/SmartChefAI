const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "";

function buildSearchTerm(query = "") {
  const base = String(query || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 180);
  return base ? `${base} short cooking step tutorial` : "recipe cooking tutorial";
}

export async function findRecipeVideo(query) {
  if (!YOUTUBE_API_KEY) return null;

  const q = buildSearchTerm(query);
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("key", YOUTUBE_API_KEY);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", q);
  url.searchParams.set("type", "video");
  url.searchParams.set("videoEmbeddable", "true");
  url.searchParams.set("safeSearch", "strict");
  url.searchParams.set("maxResults", "5");
  url.searchParams.set("order", "relevance");
  url.searchParams.set("videoDuration", "short");

  const response = await fetch(url.toString());
  if (!response.ok) return null;
  const data = await response.json();
  const first = Array.isArray(data.items) ? data.items[0] : null;
  const videoId = first?.id?.videoId;
  if (!videoId) return null;

  return {
    videoId,
    title: first?.snippet?.title || `${query} Recipe Video`,
    channelTitle: first?.snippet?.channelTitle || "YouTube",
    thumbnail: first?.snippet?.thumbnails?.high?.url || first?.snippet?.thumbnails?.medium?.url || "",
    embedUrl: `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0&modestbranding=1`,
    watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}
