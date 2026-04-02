import { memo, useEffect, useMemo, useState } from "react";
import { getApiErrorMessage } from "../services/api";
import { recipeService } from "../services/recipeService";

const STEP_QUERY_RULES = [
  { test: /oil|ghee|butter/, query: "pour oil into pan cooking tutorial short" },
  { test: /saute|sauté|onion/, query: "saute onions cooking tutorial short" },
  { test: /temper|mustard|cumin/, query: "tempering spices in oil cooking tutorial short" },
  { test: /boil|simmer/, query: "bring to simmer cooking tutorial short" },
  { test: /mix|stir/, query: "stir ingredients in pan cooking tutorial short" },
  { test: /garnish|serve/, query: "finish garnish and serve dish tutorial short" },
];

function extractStepVideoQuery(recipe, currentStep) {
  const source = `${currentStep?.title || ""} ${currentStep?.ingredients || currentStep?.ingredient || ""} ${currentStep?.instruction || currentStep?.text || ""}`.toLowerCase();
  const matchedRule = STEP_QUERY_RULES.find((rule) => rule.test.test(source));
  if (matchedRule) return `${recipe?.name || "recipe"} ${matchedRule.query}`;

  const keywords = source
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => word.length > 2)
    .filter((word) => !["with", "then", "into", "until", "minutes", "minute", "medium", "high", "low", "ingredients", "current", "step"].includes(word))
    .slice(0, 8)
    .join(" ");

  return `${recipe?.name || "recipe"} ${keywords} cooking tutorial short`;
}

function RecipeVideoGuideComponent({ recipe, currentStep, activeStepIndex = 0, compact = false }) {
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const stepQuery = useMemo(() => extractStepVideoQuery(recipe, currentStep), [recipe, currentStep]);
  const isMobile = useMemo(() => typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches, []);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!recipe?.name || !currentStep) return;
      setLoading(true);
      setError("");
      try {
        const data = await recipeService.getRecipeVideoGuide(stepQuery);
        if (active) {
          setVideo(data.video || null);
          if (!data.video && data.message) setError(data.message);
        }
      } catch (nextError) {
        if (active) {
          setError(getApiErrorMessage(nextError, "Video guidance is unavailable right now."));
          setVideo(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [recipe?.name, currentStep, stepQuery]);

  if (!currentStep) return null;

  const autoplay = isMobile ? 0 : 1;
  const src = video?.videoId ? `https://www.youtube.com/embed/${video.videoId}?autoplay=${autoplay}&mute=1&controls=1&playsinline=1&rel=0&modestbranding=1` : "";

  return (
    <section className={`rounded-[1.8rem] border border-slate-700 bg-slate-900/70 p-4 ${compact ? "" : "glass-panel"}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-sky-300">Step Video Guidance</p>
          <h3 className="mt-1 font-display text-lg text-slate-100">Video support for step {activeStepIndex + 1}</h3>
        </div>
        {video?.watchUrl ? <a href={video.watchUrl} target="_blank" rel="noreferrer" className="text-sm text-sky-300 hover:text-sky-200">Open on YouTube</a> : null}
      </div>

      {loading ? (
        <div className="overflow-hidden rounded-[1.4rem] border border-slate-800 bg-slate-950">
          <div className="aspect-video animate-pulse bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900" />
          <div className="space-y-2 p-4">
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-800" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-slate-800" />
          </div>
        </div>
      ) : video ? (
        <div className="overflow-hidden rounded-[1.4rem] border border-slate-800 bg-slate-950">
          <div className="aspect-video">
            <iframe src={src} title={video.title || "Cooking step video"} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen loading="lazy" />
          </div>
          <div className="p-4">
            <p className="text-sm font-medium text-slate-100">{video.title}</p>
            <p className="mt-1 text-xs text-slate-400">{isMobile ? "Autoplay is paused on mobile so playback does not interrupt your cooking flow." : `Search query: ${stepQuery}`}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-[1.4rem] border border-dashed border-slate-700 bg-slate-950/70 px-4 py-6 text-sm text-slate-400">
          <p className="font-medium text-slate-200">No matching short video was found for this step.</p>
          <p className="mt-2">{error || "You can still follow the written instruction and ask the AI chef for a quick explanation."}</p>
          <p className="mt-2 text-xs text-slate-500">Search query used: {stepQuery}</p>
        </div>
      )}
    </section>
  );
}

const RecipeVideoGuide = memo(RecipeVideoGuideComponent);
export default RecipeVideoGuide;
