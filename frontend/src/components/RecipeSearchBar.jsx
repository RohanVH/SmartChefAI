import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import FoodImage from "./FoodImage";
import { recipeService } from "../services/recipeService";

export default function RecipeSearchBar({ cuisine, regionalStyle, onResults }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [didYouMean, setDidYouMean] = useState(null);
  const [loading, setLoading] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      const q = query.trim();
      if (q.length < 2) {
        setSuggestions([]);
        setDidYouMean(null);
        return;
      }
      try {
        const data = await recipeService.searchRecipeSuggestions(q);
        setSuggestions((data.suggestions || []).map((s) => s.name));
        setDidYouMean(data.didYouMean || null);
      } catch {
        setSuggestions([]);
        setDidYouMean(null);
      }
    }, 300);
    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
  }, []);

  const hasRecognition = useMemo(
    () => typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition),
    []
  );

  const runSearch = async (term) => {
    const q = term.trim();
    if (!q) return;
    setLoading(true);
    try {
      const data = await recipeService.searchRecipes({
        query: q,
        cuisine,
        regionalStyle: cuisine === "Indian" ? regionalStyle : null,
      });
      onResults(data.recipes || [], data.didYouMean || null, q);
    } finally {
      setLoading(false);
    }
  };

  const startVoiceSearch = () => {
    if (!hasRecognition) return;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setVoiceActive(true);
    recognition.onend = () => setVoiceActive(false);
    recognition.onerror = () => setVoiceActive(false);
    recognition.onresult = (event) => {
      const text = event.results?.[0]?.[0]?.transcript?.trim() || "";
      if (!text) return;
      setQuery(text);
      runSearch(text);
    };
    recognition.start();
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto mt-8 max-w-5xl rounded-3xl border border-slate-700 bg-slate-800/70 p-5 shadow-xl shadow-black/20"
    >
      <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-full border border-slate-600 bg-slate-900 px-4 py-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") runSearch(query);
          }}
          placeholder="Search recipes (e.g., Chicken Biryani)"
          className="flex-1 bg-transparent px-2 py-2 text-lg text-slate-100 outline-none"
        />
        {hasRecognition ? (
          <button
            onClick={startVoiceSearch}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${voiceActive ? "bg-emerald-500 text-slate-950" : "bg-slate-700 text-slate-100 hover:bg-slate-600"}`}
          >
            {voiceActive ? "Listening..." : "🎤"}
          </button>
        ) : null}
        <button
          onClick={() => runSearch(query)}
          className="rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold text-slate-950 hover:brightness-110"
          disabled={loading}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {didYouMean && didYouMean.toLowerCase() !== query.trim().toLowerCase() ? (
        <p className="mt-3 text-center text-sm text-slate-300">
          Did you mean:{" "}
          <button
            onClick={() => {
              setQuery(didYouMean);
              runSearch(didYouMean);
            }}
            className="font-semibold text-sky-300 hover:text-sky-200"
          >
            {didYouMean}
          </button>
        </p>
      ) : null}

      {suggestions.length ? (
        <div className="mx-auto mt-3 max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 p-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => {
                setQuery(suggestion);
                runSearch(suggestion);
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
            >
              <FoodImage query={suggestion} seed={`search-${suggestion}`} alt={suggestion} className="h-9 w-9 rounded-md object-cover" loading="lazy" />
              <span>{suggestion}</span>
            </button>
          ))}
        </div>
      ) : null}
    </motion.section>
  );
}
