import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import FoodImage from "./FoodImage";
import { getApiErrorMessage } from "../services/api";
import { recipeService } from "../services/recipeService";

const MIN_CONFIDENCE = 0.55;

export default function RecipeSearchBar({ cuisine, regionalStyle, onResults }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [didYouMean, setDidYouMean] = useState(null);
  const [loading, setLoading] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [error, setError] = useState("");
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
    }, 250);
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
    setError("");
    try {
      const data = await recipeService.searchRecipes({
        query: q,
        cuisine,
        regionalStyle: cuisine === "Indian" ? regionalStyle : null,
      });
      onResults(data.recipes || [], data.didYouMean || null, q);
    } catch (nextError) {
      setError(getApiErrorMessage(nextError, "Search failed. Please try again."));
      onResults([], null, q);
    } finally {
      setLoading(false);
    }
  };

  const startVoiceSearch = () => {
    if (!hasRecognition) {
      setError("Voice search is not supported in this browser. Type your dish name instead.");
      return;
    }
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
    recognition.onstart = () => {
      setVoiceActive(true);
      setError("");
    };
    recognition.onend = () => setVoiceActive(false);
    recognition.onerror = () => {
      setVoiceActive(false);
      setError("Voice search is unavailable right now.");
    };
    recognition.onresult = (event) => {
      const result = event.results?.[0]?.[0];
      const text = result?.transcript?.trim() || "";
      const confidence = typeof result?.confidence === "number" ? result.confidence : 1;
      if (!text) return;
      if (confidence && confidence < MIN_CONFIDENCE) {
        setError("I did not catch that clearly. Please try again or type your search.");
        return;
      }
      setQuery(text);
      runSearch(text);
    };
    recognition.start();
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel hero-glow rounded-[2rem] p-5 md:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-sky-300">Global Search</p>
          <h3 className="mt-2 font-display text-2xl text-slate-100">Search dishes, styles, and regional variations</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Type, speak, or misspell a dish name. SmartChefAI will try to recover the right recipe intent.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-[1.8rem] border border-slate-700 bg-slate-950/80 p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") runSearch(query);
            }}
            placeholder="Search dishes like chicken biryani, paneer curry, dosa..."
            className="min-w-0 flex-1 bg-transparent px-3 py-3 text-lg text-slate-100 outline-none placeholder:text-slate-500"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startVoiceSearch}
              className={`rounded-full px-4 py-3 text-sm font-semibold transition active:scale-[0.98] ${voiceActive ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-100 hover:bg-slate-700"}`}
            >
              {hasRecognition ? (voiceActive ? "Listening..." : "Voice Search") : "Type Search"}
            </button>
            <button
              type="button"
              onClick={() => runSearch(query)}
              className="rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? "Searching..." : "Search Recipes"}
            </button>
          </div>
        </div>
      </div>

      {!hasRecognition ? <p className="mt-4 text-sm text-slate-400">Voice search is not available in this browser, so SmartChefAI will fall back to typed search.</p> : null}

      {didYouMean && didYouMean.toLowerCase() !== query.trim().toLowerCase() ? (
        <p className="mt-4 text-sm text-slate-300">
          Did you mean{" "}
          <button
            type="button"
            onClick={() => {
              setQuery(didYouMean);
              runSearch(didYouMean);
            }}
            className="font-semibold text-sky-300 hover:text-sky-200"
          >
            {didYouMean}
          </button>
          ?
        </p>
      ) : null}

      {error ? <p className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}

      {suggestions.length ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                setQuery(suggestion);
                runSearch(suggestion);
              }}
              className="flex items-center gap-3 rounded-[1.4rem] border border-slate-700 bg-slate-900/75 p-3 text-left transition hover:border-sky-400/50 hover:bg-slate-900"
            >
              <FoodImage query={suggestion} seed={`search-${suggestion}`} alt={suggestion} className="h-16 w-16 rounded-2xl" loading="lazy" />
              <div>
                <p className="font-medium text-slate-100">{suggestion}</p>
                <p className="text-xs text-slate-400">Tap to search instantly</p>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </motion.section>
  );
}
