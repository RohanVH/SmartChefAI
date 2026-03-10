import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { recipeService } from "../services/recipeService";

export default function RecipeVideoGuide({ recipe, activeStepIndex }) {
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [startAt, setStartAt] = useState(0);
  const iframeRef = useRef(null);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!recipe?.name) return;
      setLoading(true);
      setLoaded(false);
      setVideo(null);
      try {
        const data = await recipeService.getRecipeVideoGuide(`${recipe.name} ${recipe.cuisine || ""}`.trim());
        if (active) setVideo(data.video || null);
      } catch {
        if (active) setVideo(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [recipe?.name, recipe?.cuisine]);

  useEffect(() => {
    if (!video) return;
    const total = Math.max(recipe?.steps?.length || 1, 1);
    const cookSeconds = Math.max((Number(recipe?.cookTimeMinutes) || 20) * 60, total * 45);
    const perStep = Math.floor(cookSeconds / total);
    const nextStart = Math.max((activeStepIndex || 0) * perStep, 0);
    setStartAt(nextStart);
  }, [activeStepIndex, recipe?.cookTimeMinutes, recipe?.steps?.length, video]);

  const embedUrl = useMemo(() => {
    if (!video?.videoId) return "";
    return `https://www.youtube.com/embed/${video.videoId}?enablejsapi=1&rel=0&modestbranding=1&start=${startAt}`;
  }, [video?.videoId, startAt]);

  const onStepSync = () => {
    if (!iframeRef.current) return;
    iframeRef.current.src = embedUrl;
  };

  useEffect(() => {
    onStepSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedUrl]);

  return (
    <section className="rounded-3xl border border-slate-700 bg-slate-800/80 p-4 shadow-xl shadow-black/20">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-xl text-slate-100">Recipe Video Guide</h3>
        {video?.watchUrl ? (
          <a href={video.watchUrl} target="_blank" rel="noreferrer" className="text-sm text-sky-300 hover:text-sky-200">
            Open on YouTube
          </a>
        ) : null}
      </div>

      {loading ? (
        <LoadingVideoState />
      ) : video ? (
        <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
          <div className="aspect-video w-full">
            <iframe
              ref={iframeRef}
              src={embedUrl}
              title={video.title || "Recipe video guide"}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
              onLoad={() => setLoaded(true)}
            />
          </div>
          <div className="p-3">
            <p className="text-sm text-slate-200">{video.title}</p>
            <p className="mt-1 text-xs text-slate-400">{loaded ? "Video ready. Click a step to sync timestamp." : "Preparing player..."}</p>
          </div>
        </div>
      ) : (
        <p className="rounded-xl bg-slate-900 p-4 text-sm text-slate-300">No video guide available for this recipe right now.</p>
      )}
    </section>
  );
}

function LoadingVideoState() {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
      <p className="text-sm text-slate-200">Preparing your cooking guide...</p>
      <div className="mt-3 flex items-end gap-1">
        {Array.from({ length: 10 }).map((_, idx) => (
          <motion.span
            key={idx}
            className="inline-block w-2 rounded-full bg-emerald-400"
            animate={{ height: [6, 18, 8, 15, 7] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: idx * 0.06 }}
          />
        ))}
      </div>
    </div>
  );
}
