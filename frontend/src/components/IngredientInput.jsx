import { useEffect, useRef, useState } from "react";
import IngredientImage from "./IngredientImage";
import { recipeService } from "../services/recipeService";
import { readFileAsDataUrl } from "../utils/helpers";

export default function IngredientInput({ ingredients, addIngredient, removeIngredient, setIngredients }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loadingDetect, setLoadingDetect] = useState(false);
  const [inputError, setInputError] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [liveDetected, setLiveDetected] = useState([]);
  const [cameraBusy, setCameraBusy] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);
  const normalizedQuery = query.trim();

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (query.trim().length < 2) return setSuggestions([]);
      try {
        const data = await recipeService.autocomplete(query);
        if (active) setSuggestions(data.suggestions || []);
      } catch {
        if (active) setSuggestions([]);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [query]);

  useEffect(() => () => stopLiveScan(), []);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoadingDetect(true);
    setInputError("");
    try {
      const imageBase64 = await readFileAsDataUrl(file);
      const data = await recipeService.detectIngredients(imageBase64);
      const detected = (data.ingredients || []).map((v) => v.trim()).filter(Boolean);
      setIngredients((prev) => [...new Set([...prev, ...detected])]);
      if (!detected.length) setInputError("No ingredients were detected from this image.");
    } catch {
      setInputError("Ingredient scan failed. Try another image.");
    } finally {
      setLoadingDetect(false);
    }
  };

  const addFromQuery = () => {
    if (!normalizedQuery) return;
    addIngredient(normalizedQuery);
    setQuery("");
    setSuggestions([]);
  };

  const stopLiveScan = () => {
    if (scanTimerRef.current) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
    setCameraBusy(false);
  };

  const captureAndDetect = async () => {
    if (!videoRef.current || !canvasRef.current || cameraBusy) return;
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) return;
    setCameraBusy(true);
    try {
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageBase64 = canvas.toDataURL("image/jpeg", 0.8);
      const data = await recipeService.detectIngredients(imageBase64);
      const detected = (data.ingredients || []).map((v) => v.trim()).filter(Boolean);
      if (detected.length) {
        setLiveDetected((prev) => [...new Set([...prev, ...detected])].slice(0, 20));
      }
    } catch {
      // ignore intermittent scan errors while stream runs
    } finally {
      setCameraBusy(false);
    }
  };

  const startLiveScan = async () => {
    setInputError("");
    setLiveDetected([]);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      await captureAndDetect();
      scanTimerRef.current = window.setInterval(captureAndDetect, 2500);
    } catch {
      setInputError("Camera access failed. Allow camera permission and try again.");
      stopLiveScan();
    }
  };

  const finishScan = () => {
    setIngredients((prev) => [...new Set([...prev, ...liveDetected])]);
    stopLiveScan();
  };

  return (
    <section className="space-y-4 rounded-3xl border border-slate-700 bg-slate-800/70 p-5 shadow-xl shadow-slate-950/30 backdrop-blur">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {ingredients.map((item) => (
          <div key={item} className="group flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 p-2">
            <IngredientImage name={item} alt={item} className="h-10 w-10 rounded-lg object-cover" loading="lazy" />
            <span className="flex-1 text-sm text-slate-100">{item}</span>
            <button onClick={() => removeIngredient(item)} aria-label={`Remove ${item}`} className="rounded px-2 py-1 text-xs text-rose-300 opacity-80 transition hover:bg-slate-800 hover:opacity-100">
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="grid gap-3">
        <div>
          <label className="mb-1 block text-sm text-slate-300">Manual ingredient entry</label>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addFromQuery();
                }
              }}
              placeholder="Type ingredients (e.g., lemon)"
              className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-sky-400 focus:ring-2"
            />
            <button onClick={addFromQuery} className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110">
              Add
            </button>
          </div>
          {suggestions.length > 0 && (
            <div className="mt-2 max-h-48 overflow-auto rounded-xl border border-slate-600 bg-slate-900">
              {suggestions.map((s) => (
                <button
                  key={s.name}
                  onClick={() => {
                    addIngredient(s.name);
                    setQuery("");
                    setSuggestions([]);
                  }}
                  className="flex w-full items-center gap-3 border-b border-slate-700 px-3 py-2 text-left hover:bg-slate-800"
                >
                  <IngredientImage
                    name={s.name}
                    alt={s.name}
                    className="h-8 w-8 rounded object-cover"
                    loading="lazy"
                  />
                  <span className="text-sm text-slate-100">{s.name}</span>
                </button>
              ))}
            </div>
          )}
          {normalizedQuery && suggestions.length === 0 && (
            <button onClick={addFromQuery} className="mt-2 rounded-lg border border-slate-600 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700">
              Add "{normalizedQuery}"
            </button>
          )}
        </div>

        <div className="space-y-2">
          <label className="mb-1 block text-sm text-slate-300">Scan ingredients</label>
          <div className="flex flex-wrap gap-2">
            {!cameraOpen ? (
              <button onClick={startLiveScan} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:brightness-110">
                <span>Camera</span>
                Open Camera
              </button>
            ) : (
              <>
                <button onClick={finishScan} className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950">
                  Finish Scan
                </button>
                <button onClick={stopLiveScan} className="rounded-xl border border-slate-600 px-3 py-2 text-sm text-slate-200">
                  Stop
                </button>
              </>
            )}
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-slate-100 hover:bg-slate-800">
            <span>Optional</span>
            Upload Image
            <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          </label>
          <p className="text-xs text-slate-400">{loadingDetect ? "Detecting ingredients..." : "Live camera is primary. Image upload is optional fallback."}</p>
        </div>
      </div>

      {cameraOpen ? (
        <div className="grid gap-4 rounded-2xl border border-slate-700 bg-slate-900 p-4 md:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-200">Live Camera Feed</p>
            <video ref={videoRef} className="h-64 w-full rounded-xl bg-black object-cover" playsInline muted />
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-200">Detected Ingredients</p>
            <div className="max-h-64 space-y-2 overflow-auto">
              {liveDetected.map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-lg bg-slate-800 p-2">
                  <IngredientImage name={item} alt={item} className="h-8 w-8 rounded object-cover" loading="lazy" />
                  <span className="text-sm text-slate-200">{item}</span>
                </div>
              ))}
              {!liveDetected.length ? <p className="text-xs text-slate-400">Scanning... keep ingredients in frame.</p> : null}
            </div>
          </div>
        </div>
      ) : null}

      {inputError ? <p className="text-xs text-rose-300">{inputError}</p> : null}
    </section>
  );
}
