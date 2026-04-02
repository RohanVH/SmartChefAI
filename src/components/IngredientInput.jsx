import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import IngredientImage from "./IngredientImage";
import { recipeService } from "../services/recipeService";
import { readFileAsDataUrl, toTitleCase } from "../utils/helpers";

function getCameraErrorMessage(error) {
  if (!error) return "Camera access failed. Allow camera permission and try again.";
  if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
    return "Camera permission was denied. You can allow access in browser settings or use image upload instead.";
  }
  if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
    return "No camera was found on this device. You can still upload a kitchen image instead.";
  }
  if (error.name === "NotReadableError" || error.name === "TrackStartError") {
    return "This camera is already in use by another app. Close it there and try again.";
  }
  if (error.name === "OverconstrainedError") {
    return "The selected camera is not available right now. Try switching devices.";
  }
  return "Camera access failed. Allow camera permission and try again.";
}

export default function IngredientInput({ ingredients, addIngredient, removeIngredient, setIngredients }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loadingDetect, setLoadingDetect] = useState(false);
  const [inputError, setInputError] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [liveDetected, setLiveDetected] = useState([]);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraDevices, setCameraDevices] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [cameraSupport, setCameraSupport] = useState(() => typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);
  const normalizedQuery = query.trim();
  const canSwitchCamera = cameraDevices.length > 1;

  const stopLiveScan = useCallback(() => {
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
  }, []);

  const refreshCameraDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setCameraDevices([]);
      return;
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((device) => device.kind === "videoinput");
      setCameraDevices(videoInputs);
      if (!selectedCameraId && videoInputs[0]?.deviceId) {
        setSelectedCameraId(videoInputs[0].deviceId);
      }
    } catch {
      setCameraDevices([]);
    }
  }, [selectedCameraId]);

  useEffect(() => {
    let active = true;
    const handle = window.setTimeout(async () => {
      if (normalizedQuery.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const data = await recipeService.autocomplete(normalizedQuery);
        if (active) setSuggestions(data.suggestions || []);
      } catch {
        if (active) setSuggestions([]);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(handle);
    };
  }, [normalizedQuery]);

  useEffect(() => {
    refreshCameraDevices();
    return () => stopLiveScan();
  }, [refreshCameraDevices, stopLiveScan]);

  useEffect(() => {
    if (!cameraOpen || !selectedCameraId) return;
    startLiveScan(selectedCameraId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCameraId]);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoadingDetect(true);
    setInputError("");
    try {
      const imageBase64 = await readFileAsDataUrl(file);
      const data = await recipeService.detectIngredients(imageBase64);
      const detected = (data.ingredients || []).map((v) => toTitleCase(v.trim())).filter(Boolean);
      setIngredients((prev) => [...new Set([...prev, ...detected])]);
      if (!detected.length) setInputError("No ingredients were detected from this image.");
    } catch {
      setInputError("Ingredient scan failed. Try another image.");
    } finally {
      setLoadingDetect(false);
      event.target.value = "";
    }
  };

  const addFromQuery = () => {
    if (!normalizedQuery) return;
    addIngredient(normalizedQuery);
    setQuery("");
    setSuggestions([]);
  };

  const captureAndDetect = async () => {
    if (!videoRef.current || !canvasRef.current || cameraBusy) return;
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) return;
    setCameraBusy(true);
    try {
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageBase64 = canvas.toDataURL("image/jpeg", 0.82);
      const data = await recipeService.detectIngredients(imageBase64);
      const detected = (data.ingredients || []).map((v) => toTitleCase(v.trim())).filter(Boolean);
      if (detected.length) {
        setLiveDetected((prev) => [...new Set([...prev, ...detected])].slice(0, 24));
      }
    } catch {
      // ignore intermittent scan errors while stream runs
    } finally {
      setCameraBusy(false);
    }
  };

  async function startLiveScan(cameraIdOverride = selectedCameraId) {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraSupport(false);
      setInputError("This browser does not support live camera scanning. Use image upload instead.");
      return;
    }

    stopLiveScan();
    setInputError("");
    setLiveDetected([]);
    try {
      const constraints = cameraIdOverride
        ? { video: { deviceId: { exact: cameraIdOverride } }, audio: false }
        : { video: { facingMode: { ideal: "environment" } }, audio: false };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setCameraOpen(true);
      setCameraSupport(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      await refreshCameraDevices();
      await captureAndDetect();
      scanTimerRef.current = window.setInterval(captureAndDetect, 2600);
    } catch (error) {
      setInputError(getCameraErrorMessage(error));
      stopLiveScan();
    }
  }

  const finishScan = () => {
    setIngredients((prev) => [...new Set([...prev, ...liveDetected])]);
    stopLiveScan();
  };

  const cameraStatus = useMemo(() => {
    if (!cameraSupport) return "Live camera scanning is unavailable in this browser.";
    if (cameraBusy) return "Analyzing frame...";
    if (!liveDetected.length) return "No live detections yet. Keep ingredients visible in frame.";
    return "Ingredients detected from the live camera feed.";
  }, [cameraBusy, cameraSupport, liveDetected.length]);

  return (
    <section className="glass-panel hero-glow rounded-[2rem] p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-emerald-300">Ingredient Studio</p>
          <h3 className="mt-2 font-display text-2xl text-slate-100">Build your pantry in seconds</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Type ingredients, tap suggestions with visual cues, or scan your kitchen live.
          </p>
        </div>
        <div className="rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm text-slate-300">
          {ingredients.length} ingredient{ingredients.length === 1 ? "" : "s"} selected
        </div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">Manual entry</label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addFromQuery();
                    }
                  }}
                  placeholder="Type ingredients like tomato, paneer, basil..."
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 placeholder:text-slate-500"
                />
                <AnimatePresence>
                  {suggestions.length > 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/95 shadow-2xl shadow-slate-950/40"
                    >
                      {suggestions.map((s) => (
                        <button
                          key={s.name}
                          type="button"
                          onClick={() => {
                            addIngredient(s.name);
                            setQuery("");
                            setSuggestions([]);
                          }}
                          className="flex w-full items-center gap-3 border-b border-slate-800 px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-900"
                        >
                          <IngredientImage name={s.name} alt={s.name} className="h-10 w-10 rounded-xl object-cover" loading="lazy" />
                          <div>
                            <p className="text-sm font-medium text-slate-100">{toTitleCase(s.name)}</p>
                            <p className="text-xs text-slate-400">Spoonacular ingredient match</p>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
              <button
                type="button"
                onClick={addFromQuery}
                className="rounded-2xl bg-gradient-to-r from-sky-400 to-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:brightness-110 active:scale-[0.98]"
              >
                Add Ingredient
              </button>
            </div>
            {normalizedQuery && suggestions.length === 0 ? (
              <button type="button" onClick={addFromQuery} className="mt-3 text-sm text-sky-300 hover:text-sky-200">
                Add "{normalizedQuery}" directly
              </button>
            ) : null}
          </div>

          <div>
            <p className="mb-3 text-sm font-medium text-slate-200">Selected ingredients</p>
            <div className="flex min-h-[5rem] flex-wrap gap-3 rounded-[1.5rem] border border-dashed border-slate-700 bg-slate-950/60 p-4">
              <AnimatePresence>
                {ingredients.map((item) => (
                  <motion.div
                    key={item}
                    layout
                    initial={{ opacity: 0, scale: 0.86, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.86, y: -8 }}
                    className="flex items-center gap-3 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 shadow-[0_10px_30px_rgba(34,197,94,0.08)]"
                  >
                    <IngredientImage name={item} alt={item} className="h-9 w-9 rounded-full object-cover" loading="lazy" />
                    <span className="text-sm font-medium text-slate-100">{item}</span>
                    <button type="button" onClick={() => removeIngredient(item)} className="text-xs text-rose-300 transition hover:text-rose-200">
                      Remove
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {!ingredients.length ? <p className="self-center text-sm text-slate-500">No ingredients yet. Start typing or scan your kitchen.</p> : null}
            </div>
          </div>
        </div>

        <div className="rounded-[1.7rem] border border-slate-700 bg-slate-950/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-slate-100">Live camera scanner</p>
              <p className="text-xs text-slate-400">Detect ingredients in real time and add them in one tap.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!cameraOpen ? (
                <button type="button" onClick={() => startLiveScan()} className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110 active:scale-[0.98]" disabled={!cameraSupport}>
                  Open Camera
                </button>
              ) : (
                <>
                  <button type="button" onClick={finishScan} className="rounded-full bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110 active:scale-[0.98]">
                    Finish Scan
                  </button>
                  <button type="button" onClick={stopLiveScan} className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 transition active:scale-[0.98]">
                    Stop
                  </button>
                </>
              )}
            </div>
          </div>

          {cameraDevices.length ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="text-xs uppercase tracking-[0.24em] text-slate-400">Camera</label>
              <select value={selectedCameraId} onChange={(e) => setSelectedCameraId(e.target.value)} className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100" disabled={!canSwitchCamera && cameraOpen}>
                {cameraDevices.map((device, idx) => <option key={device.deviceId || idx} value={device.deviceId}>{device.label || `Camera ${idx + 1}`}</option>)}
              </select>
              {canSwitchCamera ? <p className="text-xs text-slate-500">Switch between front and rear cameras if detection is clearer on another lens.</p> : null}
            </div>
          ) : null}

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="overflow-hidden rounded-[1.5rem] border border-slate-800 bg-slate-900">
              {cameraOpen ? (
                <video ref={videoRef} className="h-72 w-full bg-black object-cover" playsInline muted />
              ) : (
                <div className="flex h-72 items-center justify-center bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.14),_transparent_42%)] px-6 text-center text-sm text-slate-400">
                  {cameraSupport ? "Open the camera to scan your fridge, countertop, or prep area." : "This browser does not support live scanning. Use upload fallback instead."}
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="rounded-[1.5rem] border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-sm font-medium text-slate-100">Detected ingredients</p>
              <div className="mt-3 max-h-64 space-y-2 overflow-auto">
                {liveDetected.length ? liveDetected.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2">
                    <IngredientImage name={item} alt={item} className="h-10 w-10 rounded-xl object-cover" loading="lazy" />
                    <span className="text-sm text-slate-200">{item}</span>
                  </div>
                )) : (
                  <p className="text-sm text-slate-500">{cameraStatus}</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm text-slate-200 transition hover:border-sky-400">
              Upload fallback image
              <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
            </label>
            <p className="text-xs text-slate-400">
              {loadingDetect ? "Detecting ingredients from upload..." : "If camera access is unavailable, upload a kitchen image instead."}
            </p>
          </div>
        </div>
      </div>

      {inputError ? <p className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{inputError}</p> : null}
    </section>
  );
}
