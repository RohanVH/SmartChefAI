import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import IngredientImage from "./IngredientImage";
import { recipeService } from "../services/recipeService";

const LANGUAGE_TO_RECOGNITION = {
  English: "en-IN",
  Kannada: "kn-IN",
  Hindi: "hi-IN",
  Tamil: "ta-IN",
  Telugu: "te-IN",
};

const SCRIPT_LANGUAGE_PATTERNS = [
  { language: "Kannada", regex: /[\u0C80-\u0CFF]/ },
  { language: "Hindi", regex: /[\u0900-\u097F]/ },
  { language: "Tamil", regex: /[\u0B80-\u0BFF]/ },
  { language: "Telugu", regex: /[\u0C00-\u0C7F]/ },
];

function detectTranscriptLanguage(text, fallbackLanguage) {
  for (const pattern of SCRIPT_LANGUAGE_PATTERNS) {
    if (pattern.regex.test(text)) return pattern.language;
  }
  return fallbackLanguage || "English";
}

export default function CookingMode({ recipe, language = "English", onClose }) {
  const [index, setIndex] = useState(0);
  const [handsFree, setHandsFree] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("Idle");
  const [voiceText, setVoiceText] = useState("");
  const [speakingStepIndex, setSpeakingStepIndex] = useState(null);
  const [assistantLanguage, setAssistantLanguage] = useState(language || "English");
  const [micError, setMicError] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [isTurnInFlight, setIsTurnInFlight] = useState(false);
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);
  const listenRestartTimerRef = useRef(null);
  const manualStopRef = useRef(false);
  const mountedRef = useRef(true);
  const handsFreeRef = useRef(false);
  const pausedRef = useRef(false);
  const turnInFlightRef = useRef(false);
  const step = recipe.steps[index] || {};
  const detail = useMemo(() => buildDetailedStep(recipe, step, index), [recipe, step, index]);
  const progress = Math.round(((index + 1) / Math.max(recipe.steps.length, 1)) * 100);
  const hasRecognition = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [index]);

  useEffect(() => {
    handsFreeRef.current = handsFree;
  }, [handsFree]);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    turnInFlightRef.current = isTurnInFlight;
  }, [isTurnInFlight]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanupVoiceSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearRestartTimer = () => {
    if (listenRestartTimerRef.current) {
      window.clearTimeout(listenRestartTimerRef.current);
      listenRestartTimerRef.current = null;
    }
  };

  const stopRecognition = () => {
    manualStopRef.current = true;
    clearRestartTimer();
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
  };

  const cleanupVoiceSession = () => {
    stopRecognition();
    window.speechSynthesis.cancel();
  };

  const speak = (text, opts = {}) => new Promise((resolve) => {
    const { resumeListening = true, speakingForStep = null } = opts;
    if (!mountedRef.current) return resolve();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANGUAGE_TO_RECOGNITION[assistantLanguage] || "en-IN";
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onstart = () => {
      setVoiceStatus("Speaking");
      if (typeof speakingForStep === "number") setSpeakingStepIndex(speakingForStep);
    };
    utterance.onend = () => {
      setSpeakingStepIndex(null);
      if (handsFreeRef.current && resumeListening && !pausedRef.current) {
        scheduleListeningRestart();
      } else {
        setVoiceStatus("Idle");
      }
      resolve();
    };
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });

  const scheduleListeningRestart = () => {
    if (!handsFreeRef.current || pausedRef.current || turnInFlightRef.current) return;
    clearRestartTimer();
    listenRestartTimerRef.current = window.setTimeout(() => {
      startListening();
    }, 160);
  };

  const speakFriendlyCurrentStep = async () => {
    const currentStep = recipe.steps[index];
    if (!currentStep) return;
    const friendly = `Alright, now ${currentStep.instruction || currentStep.text || "follow this step carefully"}`;
    await speak(friendly, { resumeListening: true, speakingForStep: index });
  };

  const speakFriendlyStepAt = async (targetIndex) => {
    const currentStep = recipe.steps[targetIndex];
    if (!currentStep) return;
    const friendly = `Now, ${currentStep.instruction || currentStep.text || "follow this step carefully"}`;
    await speak(friendly, { resumeListening: true, speakingForStep: targetIndex });
  };

  const applyAction = (action, stepDelta) => {
    if (action === "next" && stepDelta === 1) {
      setIndex((v) => Math.min(v + 1, recipe.steps.length - 1));
      return;
    }
    if (action === "previous" && stepDelta === -1) {
      setIndex((v) => Math.max(v - 1, 0));
      return;
    }
    if (action === "repeat") {
      speakFriendlyCurrentStep();
      return;
    }
    if (action === "pause") {
      setIsPaused(true);
      window.speechSynthesis.pause();
      setVoiceStatus("Paused");
      stopRecognition();
      return;
    }
    if (action === "resume") {
      setIsPaused(false);
      window.speechSynthesis.resume();
      setVoiceStatus("Idle");
      scheduleListeningRestart();
      return;
    }
    if (action === "stop") {
      disableHandsFree();
    }
  };

  const parseLocalCommand = (text) => {
    const normalized = String(text || "").toLowerCase().trim();
    if (!normalized) return null;
    if (/\b(done|finished|next step|what'?s next|go next)\b/.test(normalized)) return "next";
    if (/\b(previous|back|last step)\b/.test(normalized)) return "previous";
    if (/\b(repeat|say again)\b/.test(normalized)) return "repeat";
    if (/\b(pause|wait)\b/.test(normalized)) return "pause";
    if (/\b(resume|continue)\b/.test(normalized)) return "resume";
    if (/\b(stop cooking|stop)\b/.test(normalized)) return "stop";
    return null;
  };

  const processAssistantTurn = async (userUtterance) => {
    if (!handsFreeRef.current || turnInFlightRef.current) return;
    const localAction = parseLocalCommand(userUtterance);
    if (localAction) {
      if (localAction === "next") {
        const target = Math.min(index + 1, recipe.steps.length - 1);
        setIndex(target);
        await speak("Great. Let's move to the next step.", { resumeListening: false });
        await speakFriendlyStepAt(target);
        return;
      }
      if (localAction === "previous") {
        const target = Math.max(index - 1, 0);
        setIndex(target);
        await speak("Sure, going back one step.", { resumeListening: false });
        await speakFriendlyStepAt(target);
        return;
      }
      if (localAction === "repeat") {
        await speak("Sure, I will repeat this step.", { resumeListening: false });
        await speakFriendlyCurrentStep();
        return;
      }
      if (localAction === "pause") {
        applyAction("pause");
        await speak("Okay, pausing now. Say resume when you are ready.", { resumeListening: false });
        return;
      }
      if (localAction === "resume") {
        applyAction("resume");
        await speak("Great, we are back. Let's continue.", { resumeListening: true });
        return;
      }
      if (localAction === "stop") {
        await speak("Stopping hands-free cooking mode now.", { resumeListening: false });
        disableHandsFree();
        return;
      }
    }

    setIsTurnInFlight(true);
    try {
      const detectedLanguage = detectTranscriptLanguage(userUtterance, assistantLanguage || language);
      setAssistantLanguage(detectedLanguage);
      const payload = {
        userUtterance,
        recipe: {
          ...recipe,
          currentStepNumber: index + 1,
          currentStepTitle: step.title || `Step ${index + 1}`,
          currentStepInstruction: step.instruction || step.text || "",
        },
        currentStepIndex: index,
        totalSteps: recipe.steps.length,
        language: detectedLanguage,
      };
      const result = await recipeService.cookingAssistantTurn(payload);
      const reply = result.reply || "I can help with this recipe while we're cooking.";
      if (result.action === "stop") {
        await speak(reply, { resumeListening: false });
        disableHandsFree();
        return;
      }

      if (result.action === "repeat") {
        await speak(reply, { resumeListening: false });
        await speakFriendlyCurrentStep();
        return;
      }

      if (result.action === "next" && result.stepDelta === 1) {
        const target = Math.min(index + 1, recipe.steps.length - 1);
        setIndex(target);
        await speak(reply, { resumeListening: false });
        await speakFriendlyStepAt(target);
        return;
      }

      if (result.action === "previous" && result.stepDelta === -1) {
        const target = Math.max(index - 1, 0);
        setIndex(target);
        await speak(reply, { resumeListening: false });
        await speakFriendlyStepAt(target);
        return;
      }

      applyAction(result.action, result.stepDelta);
      await speak(reply, { resumeListening: result.action !== "pause" });
    } catch {
      await speak("I can help with this recipe while we're cooking.", { resumeListening: true });
    } finally {
      if (mountedRef.current) setIsTurnInFlight(false);
    }
  };

  const startListening = () => {
    if (!handsFreeRef.current || !hasRecognition || pausedRef.current || turnInFlightRef.current) return;
    stopRecognition();
    manualStopRef.current = false;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = LANGUAGE_TO_RECOGNITION[assistantLanguage] || "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;
    recognition.onstart = () => {
      setMicError("");
      setVoiceStatus("Listening");
    };
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim() || "";
      if (!transcript) return;
      setVoiceText(transcript);
      processAssistantTurn(transcript);
    };
    recognition.onerror = () => {
      setVoiceStatus("Idle");
      setMicError("Microphone error. Please check permission and retry.");
    };
    recognition.onend = () => {
      if (handsFreeRef.current && !manualStopRef.current && !pausedRef.current && !window.speechSynthesis.speaking && !turnInFlightRef.current) {
        scheduleListeningRestart();
      } else if (!handsFreeRef.current) {
        setVoiceStatus("Idle");
      }
    };
    try {
      recognition.start();
    } catch {
      setMicError("Unable to start microphone.");
      setVoiceStatus("Idle");
    }
  };

  const disableHandsFree = () => {
    handsFreeRef.current = false;
    setHandsFree(false);
    setVoiceStatus("Idle");
    setVoiceText("");
    setSpeakingStepIndex(null);
    setIsPaused(false);
    setMicError("");
    cleanupVoiceSession();
  };

  const enableHandsFree = async () => {
    if (!hasRecognition) {
      setVoiceStatus("Voice unavailable");
      setMicError("This browser does not support speech recognition.");
      return;
    }
    handsFreeRef.current = true;
    setHandsFree(true);
    setVoiceText("");
    setMicError("");
    setIsPaused(false);
    await speak(`Hi! I am your cooking assistant. Let's start cooking ${recipe.name}.`, { resumeListening: false });
    await speakFriendlyCurrentStep();
  };

  const exitCooking = () => {
    disableHandsFree();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 p-4 md:p-6">
      <div className="mx-auto flex h-full max-w-5xl flex-col">
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/90 px-4 py-3">
          <h2 className="font-display text-2xl text-slate-100 md:text-3xl">{recipe.name}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handsFree ? disableHandsFree : enableHandsFree}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${handsFree ? "bg-emerald-500 text-slate-950" : "bg-slate-700 text-slate-100 hover:bg-slate-600"}`}
            >
              {handsFree ? "Hands-Free On" : "Hands-Free Mode"}
            </button>
            <button onClick={exitCooking} className="rounded-lg border border-slate-600 px-4 py-2 text-slate-100 hover:border-sky-400">
              Exit
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-auto rounded-3xl border border-slate-700 bg-slate-900 p-4 md:p-8">
          <div className="sticky top-0 z-10 mb-6 rounded-xl border border-slate-700 bg-slate-900/95 p-4 backdrop-blur">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-300">Guided Cooking Assistant</p>
              <p className="text-sm text-slate-300">
                <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${voiceStatus === "Listening" ? "animate-pulse bg-emerald-400" : voiceStatus === "Speaking" ? "bg-sky-400" : "bg-slate-500"}`} />
                {voiceStatus}
              </p>
            </div>
            <div className="mt-2 flex items-end justify-between">
              <p className="text-2xl font-semibold text-slate-100 md:text-3xl">
                Step {index + 1}
                <span className="ml-2 text-base text-slate-400">/ {recipe.steps.length}</span>
              </p>
              <p className="text-sm text-slate-400">{progress}% complete</p>
            </div>
            <p className="mt-1 text-xs text-slate-400">Language: {assistantLanguage}</p>
            {handsFree && voiceText ? <p className="mt-1 text-xs text-sky-300">Heard: "{voiceText}"</p> : null}
            {micError ? <p className="mt-1 text-xs text-rose-300">{micError}</p> : null}
            {handsFree ? (
              <div className="mt-2 flex items-end gap-1">
                {Array.from({ length: 9 }).map((_, i) => (
                  <motion.span
                    key={i}
                    className={`inline-block w-1.5 rounded-full ${voiceStatus === "Listening" ? "bg-emerald-400" : "bg-sky-400"}`}
                    animate={{ height: voiceStatus === "Idle" ? 4 : [4, 14, 6, 12, 5] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.06 }}
                  />
                ))}
              </div>
            ) : null}
            <div className="mt-3 h-2 w-full overflow-hidden rounded bg-slate-700">
              <motion.div className="h-full bg-emerald-500" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.35 }} />
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${step.stepNumber || index + 1}-${step.title}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className={speakingStepIndex === index ? "rounded-2xl border border-emerald-500/70 p-3 shadow-lg shadow-emerald-900/20" : ""}
            >
              <h3 className="text-3xl leading-tight text-slate-100 md:text-4xl">{step.title || `Step ${index + 1}`}</h3>
              <p className="mt-4 text-lg leading-relaxed text-slate-200">{detail.mainInstruction}</p>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                <DetailCard label="Ingredients" value={detail.ingredients} />
                <DetailCard label="Approx Time" value={detail.timeHint} />
                <DetailCard label="Heat Level" value={detail.heatHint} />
                <DetailCard label="Look For" value={detail.visualCue} />
              </div>

              {detail.stepIngredients.length ? (
                <div className="mt-5 rounded-xl border border-slate-700 bg-slate-800 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Ingredients For This Step</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {detail.stepIngredients.map((item, idx) => (
                      <div key={`${item.name}-${idx}`} className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 p-2">
                        <IngredientImage
                          name={item.name}
                          alt={item.name}
                          className="h-10 w-10 rounded-md object-cover"
                          loading="lazy"
                        />
                        <div>
                          <p className="text-sm text-slate-100">{item.name}</p>
                          <p className="text-xs text-slate-400">{item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <p className="mt-5 rounded-xl bg-slate-800 p-3 text-sm text-slate-200">Safety Tip: {detail.safetyTip}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button onClick={() => setIndex((v) => Math.max(v - 1, 0))} className="rounded-lg bg-slate-800 px-4 py-2 text-slate-100 disabled:opacity-40" disabled={index === 0}>
            Previous
          </button>
          <button onClick={() => setIndex((v) => Math.min(v + 1, recipe.steps.length - 1))} className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-40" disabled={index === recipe.steps.length - 1}>
            Next
          </button>
          <button onClick={() => speakFriendlyCurrentStep()} className="rounded-lg border border-sky-500 px-4 py-2 text-sky-300">Read</button>
          <button
            onClick={() => {
              setIsPaused(true);
              window.speechSynthesis.pause();
              stopRecognition();
              setVoiceStatus("Paused");
            }}
            className="rounded-lg border border-slate-500 px-4 py-2 text-slate-200"
          >
            Pause
          </button>
          <button
            onClick={() => {
              setIsPaused(false);
              window.speechSynthesis.resume();
              setVoiceStatus("Idle");
              if (handsFree) scheduleListeningRestart();
            }}
            className="rounded-lg border border-slate-500 px-4 py-2 text-slate-200"
          >
            Resume
          </button>
        </div>
      </div>
    </div>
  );
}

function buildDetailedStep(recipe, step, stepIndex) {
  const stepIngredientText = step.ingredients || step.ingredient || "";
  const ingredientMatches = (recipe.ingredients || []).filter((item) =>
    stepIngredientText ? stepIngredientText.toLowerCase().includes((item.name || "").toLowerCase()) : true
  );
  const baseIngredients = ingredientMatches.length ? ingredientMatches : (recipe.ingredients || []).slice(0, 3);
  const ingredientText = stepIngredientText || baseIngredients.map((item) => `${item.name} (${item.quantity || "as needed"})`).join(", ");
  const lowerText = (step.instruction || step.text || "").toLowerCase();

  return {
    mainInstruction: step.instruction || step.text || "Follow the current cooking step carefully.",
    ingredients: ingredientText || "Use available recipe ingredients",
    stepIngredients: baseIngredients.map((item) => ({
      name: item.name,
      quantity: item.quantity || "as needed",
    })),
    heatHint: step.heatLevel || "Medium",
    timeHint: step.time || "4-6 minutes",
    visualCue: step.lookFor || "Aroma should deepen and color should brighten",
    safetyTip: lowerText.includes("egg") || lowerText.includes("chicken") || lowerText.includes("fish")
      ? "Cook proteins fully before serving."
      : "Keep flame controlled and avoid overcrowding the pan.",
    readText: `Step ${stepIndex + 1}. ${step.title || "Cooking step"}. ${step.instruction || step.text || ""}`,
  };
}

function DetailCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm text-slate-100">{value}</p>
    </div>
  );
}
