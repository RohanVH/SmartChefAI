import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import IngredientImage from "./IngredientImage";
import { recipeService } from "../services/recipeService";

const LANGUAGE_TO_RECOGNITION = {
  English: "en-IN",
  Kannada: "kn-IN",
  Hindi: "hi-IN",
  Tamil: "ta-IN",
  Telugu: "te-IN",
};

const MIN_CONFIDENCE = 0.55;

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

function chunkSpeech(text = "") {
  return String(text)
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part) => {
      if (part.length <= 150) return [part];
      return part.match(/.{1,150}(?:\s|$)/g)?.map((item) => item.trim()).filter(Boolean) || [part];
    });
}


function normalizeSpeech(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isLikelyEcho(transcript = "", spokenText = "") {
  const heard = normalizeSpeech(transcript);
  const spoken = normalizeSpeech(spokenText);
  if (!heard || !spoken) return false;
  if (heard === spoken) return true;
  return heard.length > 8 && (spoken.includes(heard) || heard.includes(spoken));
}
function isHeatSensitiveStep(step = {}) {
  const text = `${step.title || ""} ${step.instruction || step.text || ""} ${step.lookFor || ""}`.toLowerCase();
  return /(heat|oil|saute|fry|temper|boil|simmer|steam|brown|sear|roast)/.test(text);
}

function buildProactiveCue(recipe, stepIndex) {
  const step = recipe?.steps?.[stepIndex] || {};
  const nextStep = recipe?.steps?.[stepIndex + 1] || null;
  const actionText = step.instruction || step.text || "Follow the current step carefully.";
  if (isHeatSensitiveStep(step)) {
    return `Stay close here. ${step.lookFor || "Watch for a gentle shimmer and a richer aroma"}. ${nextStep ? `Once that happens, you can move into ${nextStep.title || "the next step"}.` : ""}`.trim();
  }
  return `You are on step ${stepIndex + 1}. ${actionText.split(".")[0] || actionText} ${nextStep ? `After that, you can move into ${nextStep.title || "the next step"}.` : ""}`.trim();
}

export default function CookingMode({ recipe, language = "English", initialStepIndex = 0, onClose, onRecipeUpdate }) {
  const [liveRecipe, setLiveRecipe] = useState(recipe);
  const [index, setIndex] = useState(initialStepIndex);
  const [handsFree, setHandsFree] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [speakingStepIndex, setSpeakingStepIndex] = useState(null);
  const [assistantLanguage, setAssistantLanguage] = useState(language || "English");
  const [micError, setMicError] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [isTurnInFlight, setIsTurnInFlight] = useState(false);
  const [proactiveHint, setProactiveHint] = useState(() => buildProactiveCue(recipe, initialStepIndex));
  const [conversation, setConversation] = useState([]);
  const [adaptInput, setAdaptInput] = useState("");
  const [adaptStatus, setAdaptStatus] = useState("");
  const [adapting, setAdapting] = useState(false);
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);
  const listenRestartTimerRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const idlePromptTimerRef = useRef(null);
  const heatPromptTimerRef = useRef(null);
  const mountedRef = useRef(true);
  const handsFreeRef = useRef(false);
  const pausedRef = useRef(false);
  const turnInFlightRef = useRef(false);
  const listeningRef = useRef(false);
  const speakingRef = useRef(false);
  const speechTokenRef = useRef(0);
  const proactiveSpeechRef = useRef(false);
  const currentSpeechTextRef = useRef("");
  const conversationRef = useRef([]);
  const liveRecipeRef = useRef(recipe);
  const indexRef = useRef(initialStepIndex);
  const startListeningRef = useRef(() => {});
  const step = liveRecipe.steps[index] || {};
  const detail = useMemo(() => buildDetailedStep(liveRecipe, step, index), [liveRecipe, step, index]);
  const progress = Math.round(((index + 1) / Math.max(liveRecipe.steps.length, 1)) * 100);
  const hasRecognition = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    setLiveRecipe(recipe);
  }, [recipe]);

  useEffect(() => {
    liveRecipeRef.current = liveRecipe;
    setProactiveHint(buildProactiveCue(liveRecipe, index));
  }, [liveRecipe, index]);

  useEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);

  useEffect(() => {
    indexRef.current = index;
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [index]);

  useEffect(() => {
    recipeService.saveCookingSession({ recipe: liveRecipe, stepIndex: index, language: assistantLanguage, conversation });
  }, [liveRecipe, index, assistantLanguage, conversation]);

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
    listeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    speakingRef.current = isSpeaking;
  }, [isSpeaking]);

  const clearAssistantTimers = useCallback(() => {
    window.clearTimeout(listenRestartTimerRef.current);
    window.clearTimeout(silenceTimerRef.current);
    window.clearTimeout(idlePromptTimerRef.current);
    window.clearTimeout(heatPromptTimerRef.current);
  }, []);

  const shouldKeepListening = useCallback(() => {
    return handsFreeRef.current && !pausedRef.current && !turnInFlightRef.current && mountedRef.current;
  }, []);

  const stopRecognition = useCallback(({ manual = true } = {}) => {
    if (manual) {
      window.clearTimeout(listenRestartTimerRef.current);
    }
    window.clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      const recognition = recognitionRef.current;
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
      try {
        recognition.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
      console.log("MIC STOPPED");
    }
    setIsListening(false);
  }, []);

  const stopSpeech = useCallback(() => {
    speechTokenRef.current += 1;
    currentSpeechTextRef.current = "";
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setSpeakingStepIndex(null);
  }, []);

  const scheduleListeningRestart = useCallback((delay = 180) => {
    window.clearTimeout(listenRestartTimerRef.current);
    if (!shouldKeepListening()) return;
    listenRestartTimerRef.current = window.setTimeout(() => {
      startListeningRef.current?.();
    }, delay);
  }, [shouldKeepListening]);

  const cleanupVoiceSession = useCallback(() => {
    stopRecognition();
    stopSpeech();
  }, [stopRecognition, stopSpeech]);

  useEffect(() => {
    mountedRef.current = true;
    document.body.style.overflow = "hidden";
    return () => {
      mountedRef.current = false;
      document.body.style.overflow = "auto";
      cleanupVoiceSession();
      clearAssistantTimers();
    };
  }, [cleanupVoiceSession, clearAssistantTimers]);

  const speak = useCallback(async (text, opts = {}) => {
    const { resumeListening = true, speakingForStep = null } = opts;
    if (!mountedRef.current || !text) return;
    stopSpeech();
    const token = speechTokenRef.current;
    const parts = chunkSpeech(text);
    for (let idx = 0; idx < parts.length; idx += 1) {
      const part = parts[idx];
      await new Promise((resolve) => {
        if (speechTokenRef.current !== token) return resolve();
        const utterance = new SpeechSynthesisUtterance(part);
        currentSpeechTextRef.current = part;
        utterance.lang = LANGUAGE_TO_RECOGNITION[assistantLanguage] || "en-IN";
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.onstart = () => {
          setIsSpeaking(true);
          if (typeof speakingForStep === "number") setSpeakingStepIndex(speakingForStep);
        };
        utterance.onend = () => {
          currentSpeechTextRef.current = "";
          window.setTimeout(resolve, 100 + Math.round(Math.random() * 140));
        };
        utterance.onerror = () => {
          currentSpeechTextRef.current = "";
          resolve();
        };
        window.speechSynthesis.speak(utterance);
      });
      if (speechTokenRef.current !== token) break;
    }
    if (speechTokenRef.current === token) {
      currentSpeechTextRef.current = "";
      setIsSpeaking(false);
      setSpeakingStepIndex(null);
      if (resumeListening && shouldKeepListening()) {
        scheduleListeningRestart(15);
      }
    }
  }, [assistantLanguage, scheduleListeningRestart, shouldKeepListening, stopSpeech]);

  const appendConversation = useCallback((entry) => {
    setConversation((prev) => [...prev.slice(-11), entry]);
  }, []);

  const goToStep = useCallback(async (targetIndex, { announce = false, intro = "" } = {}) => {
    const bounded = Math.max(0, Math.min(targetIndex, Math.max(liveRecipeRef.current.steps.length - 1, 0)));
    setIndex(bounded);
    setProactiveHint(buildProactiveCue(liveRecipeRef.current, bounded));
    if (announce) {
      const targetStep = liveRecipeRef.current.steps[bounded];
      const response = `${intro ? `${intro} ` : ""}${targetStep?.instruction || targetStep?.text || "Follow this step carefully."}`.trim();
      await speak(response, { resumeListening: true, speakingForStep: bounded });
    }
  }, [speak]);

  const speakFriendlyCurrentStep = useCallback(async () => {
    const currentStep = liveRecipeRef.current.steps[indexRef.current];
    if (!currentStep) return;
    const cue = buildProactiveCue(liveRecipeRef.current, indexRef.current);
    await speak(`Alright, ${currentStep.instruction || currentStep.text || "follow this step carefully"}. ${cue}`, { resumeListening: true, speakingForStep: indexRef.current });
  }, [speak]);

  const disableHandsFree = useCallback(() => {
    handsFreeRef.current = false;
    setHandsFree(false);
    setVoiceText("");
    setIsPaused(false);
    setMicError("");
    cleanupVoiceSession();
  }, [cleanupVoiceSession]);

  const executeAssistantAction = useCallback(async (action, parameters = {}, response = "") => {
    const currentIndex = indexRef.current;
    const totalSteps = liveRecipeRef.current.steps.length;

    if (action === "go_to_step" && Number.isFinite(Number(parameters?.step))) {
      const targetIndex = Math.max(0, Math.min(Number(parameters.step) - 1, totalSteps - 1));
      setIndex(targetIndex);
      setProactiveHint(buildProactiveCue(liveRecipeRef.current, targetIndex));
      await speak(response, { resumeListening: true, speakingForStep: targetIndex });
      return;
    }

    if (action === "next_step") {
      const targetIndex = Math.min(currentIndex + 1, totalSteps - 1);
      setIndex(targetIndex);
      setProactiveHint(buildProactiveCue(liveRecipeRef.current, targetIndex));
      await speak(response, { resumeListening: true, speakingForStep: targetIndex });
      return;
    }

    if (action === "previous_step") {
      const targetIndex = Math.max(currentIndex - 1, 0);
      setIndex(targetIndex);
      setProactiveHint(buildProactiveCue(liveRecipeRef.current, targetIndex));
      await speak(response, { resumeListening: true, speakingForStep: targetIndex });
      return;
    }

    if (action === "repeat") {
      setSpeakingStepIndex(currentIndex);
      await speak(response, { resumeListening: true, speakingForStep: currentIndex });
      return;
    }

    if (action === "stop") {
      await speak(response, { resumeListening: false, speakingForStep: currentIndex });
      disableHandsFree();
      return;
    }

    await speak(response, { resumeListening: true, speakingForStep: currentIndex });
  }, [disableHandsFree, speak]);

  const processAssistantTurn = useCallback(async (userUtterance) => {
    if (!handsFreeRef.current || turnInFlightRef.current) return;
    stopSpeech();
    appendConversation({ role: "user", text: userUtterance });
    setIsTurnInFlight(true);

    try {
      const detectedLanguage = detectTranscriptLanguage(userUtterance, assistantLanguage || language);
      setAssistantLanguage(detectedLanguage);
      const currentIndex = indexRef.current;
      const currentRecipe = liveRecipeRef.current;
      const currentStep = currentRecipe.steps[currentIndex] || {};
      const result = await recipeService.cookingAssistantTurn({
        userUtterance,
        recipe: {
          ...currentRecipe,
          currentStepNumber: currentIndex + 1,
          currentStepTitle: currentStep.title || `Step ${currentIndex + 1}`,
          currentStepInstruction: currentStep.instruction || currentStep.text || "",
          currentStep,
        },
        currentStepIndex: currentIndex,
        totalSteps: currentRecipe.steps.length,
        language: detectedLanguage,
        previousMessages: conversationRef.current.slice(-8),
      });

      const response = String(result?.response || result?.reply || "I can help with this recipe while we're cooking.").trim();
      const intent = result?.intent === "action" ? "action" : "answer";
      const action = result?.action || null;
      const parameters = result?.parameters || { step: null };
      console.log(`AI RESPONSE: ${response}`);
      appendConversation({ role: "assistant", text: response });

      if (intent === "action") {
        await executeAssistantAction(action, parameters, response);
      } else {
        await speak(response, { resumeListening: true, speakingForStep: currentIndex });
      }
    } catch (error) {
      const fallbackReply = "I can help with this recipe while we're cooking.";
      console.error("Assistant JSON/turn error", error);
      console.log(`AI RESPONSE: ${fallbackReply}`);
      appendConversation({ role: "assistant", text: fallbackReply });
      await speak(fallbackReply, { resumeListening: true, speakingForStep: indexRef.current });
    } finally {
      if (mountedRef.current) {
        setIsTurnInFlight(false);
      }
    }
  }, [appendConversation, assistantLanguage, executeAssistantAction, language, speak, stopSpeech]);

  const startListening = useCallback(() => {
    if (!hasRecognition || !shouldKeepListening() || recognitionRef.current) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = LANGUAGE_TO_RECOGNITION[assistantLanguage] || "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = true;

    recognition.onstart = () => {
      console.log("MIC STARTED");
      setMicError("");
      setIsListening(true);
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = window.setTimeout(() => {
        try {
          recognition.stop();
        } catch {
          // ignore
        }
      }, 20000);
    };

    recognition.onresult = (event) => {
      window.clearTimeout(silenceTimerRef.current);
      const result = event.results?.[event.results.length - 1]?.[0];
      const transcript = result?.transcript?.trim() || "";
      const confidence = typeof result?.confidence === "number" ? result.confidence : 1;
      if (!transcript) return;
      if (isLikelyEcho(transcript, currentSpeechTextRef.current)) {
        scheduleListeningRestart(15);
        return;
      }
      if (confidence && confidence < MIN_CONFIDENCE) {
        setMicError("I did not catch that clearly. Please repeat or use the on-screen controls.");
        scheduleListeningRestart(20);
        return;
      }
      console.log(`USER SAID: ${transcript}`);
      stopSpeech();
      stopRecognition();
      setVoiceText(transcript);
      processAssistantTurn(transcript);
    };

    recognition.onerror = (event) => {
      recognitionRef.current = null;
      setIsListening(false);
      console.log("MIC STOPPED");
      if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
        setMicError("Microphone permission was denied.");
        handsFreeRef.current = false;
        setHandsFree(false);
        return;
      }
      setMicError("Microphone error. Please check permission and retry.");
      if (!speakingRef.current) {
        scheduleListeningRestart(30);
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
      console.log("MIC STOPPED");
      window.clearTimeout(silenceTimerRef.current);
      if (!speakingRef.current) {
        scheduleListeningRestart(20);
      }
    };

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setMicError("Unable to start microphone.");
    }
  }, [assistantLanguage, hasRecognition, processAssistantTurn, scheduleListeningRestart, shouldKeepListening, stopRecognition, stopSpeech]);

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  const scheduleProactivePrompts = useCallback(() => {
    window.clearTimeout(idlePromptTimerRef.current);
    window.clearTimeout(heatPromptTimerRef.current);
    if (!handsFreeRef.current || pausedRef.current) return;
    const currentStep = liveRecipeRef.current.steps[indexRef.current] || {};
    if (isHeatSensitiveStep(currentStep)) {
      heatPromptTimerRef.current = window.setTimeout(() => {
        const hint = currentStep.lookFor || "Your oil should be shimmering now";
        const message = `${hint}. If that looks right, you can keep moving with ${currentStep.title || "this step"}.`;
        setProactiveHint(message);
        appendConversation({ role: "assistant", text: message });
        speak(message, { resumeListening: true, speakingForStep: indexRef.current });
      }, 28000);
    }
    idlePromptTimerRef.current = window.setTimeout(() => {
      const message = buildProactiveCue(liveRecipeRef.current, indexRef.current);
      setProactiveHint(message);
      appendConversation({ role: "assistant", text: message });
      speak(message, { resumeListening: true, speakingForStep: indexRef.current });
    }, 70000);
  }, [appendConversation, speak]);

  useEffect(() => {
    if (handsFree) scheduleProactivePrompts();
  }, [handsFree, index, liveRecipe, scheduleProactivePrompts]);

  const enableHandsFree = () => {
    if (!hasRecognition) {
      setMicError("This browser does not support speech recognition.");
      return;
    }
    handsFreeRef.current = true;
    setHandsFree(true);
    setIsPaused(false);
    setVoiceText("");
    setMicError("");
    setProactiveHint(buildProactiveCue(liveRecipeRef.current, indexRef.current));
    appendConversation({ role: "assistant", text: "Hands-free mode is live. Ask me anything about this step when you're ready." });
    startListeningRef.current?.();
  };

  const handleAdaptRecipe = async () => {
    const changeRequest = adaptInput.trim();
    if (!changeRequest || adapting) return;
    setAdapting(true);
    setAdaptStatus("");
    try {
      const result = await recipeService.adaptRecipe({
        recipe: liveRecipe,
        currentStepIndex: index,
        changeRequest,
        previousMessages: conversationRef.current.slice(-8),
      });
      const updatedRecipe = result.recipe || liveRecipe;
      setLiveRecipe(updatedRecipe);
      liveRecipeRef.current = updatedRecipe;
      onRecipeUpdate?.(updatedRecipe);
      recipeService.saveCookingSession({ recipe: updatedRecipe, stepIndex: index, language: assistantLanguage, conversation });
      const message = result.summary || "I updated the next steps so you can keep cooking with that change.";
      setAdaptStatus(message);
      setAdaptInput("");
      setProactiveHint(message);
      appendConversation({ role: "user", text: changeRequest });
      appendConversation({ role: "assistant", text: message });
      if (handsFreeRef.current) {
        await speak(message, { resumeListening: true, speakingForStep: index });
      }
    } catch {
      setAdaptStatus("I could not update the recipe right now, but you can continue by making small substitutions and tasting as you go.");
    } finally {
      setAdapting(false);
    }
  };

  const statusLabel = !handsFree ? "Mic Off" : isPaused ? "Paused" : isListening ? "Mic On" : isSpeaking ? "Speaking" : "Mic Off";

  const exitCooking = () => {
    disableHandsFree();
    recipeService.clearCookingSession();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex h-screen w-full flex-col bg-slate-950/98 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div className="absolute left-[-8rem] top-[-5rem] h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" animate={{ x: [0, 30, 0], y: [0, 20, 0] }} transition={{ duration: 18, repeat: Infinity }} />
        <motion.div className="absolute bottom-[-6rem] right-[-6rem] h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" animate={{ x: [0, -24, 0], y: [0, -20, 0] }} transition={{ duration: 20, repeat: Infinity }} />
      </div>

      <div className="relative flex h-full flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/80 px-3 py-3 backdrop-blur-xl md:px-6">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-900/90 px-4 py-3 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className={`relative flex h-11 w-11 items-center justify-center rounded-full border ${isListening ? "border-emerald-400 bg-emerald-500/15" : isSpeaking ? "border-sky-400 bg-sky-500/10" : "border-slate-700 bg-slate-900"}`}>
                {(isListening || isSpeaking) ? <span className="absolute inset-0 rounded-full animate-ping bg-emerald-400/10" /> : null}
                <span className="relative font-display text-sm text-slate-100">Chef</span>
              </div>
              <div>
                <h2 className="font-display text-2xl text-slate-100 md:text-3xl">{liveRecipe.name}</h2>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Immersive Cooking Mode</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handsFree ? disableHandsFree : enableHandsFree} className={`rounded-full px-4 py-2 text-sm font-semibold transition active:scale-[0.98] ${handsFree ? "bg-emerald-500 text-slate-950" : "bg-slate-700 text-slate-100 hover:bg-slate-600"}`}>{handsFree ? "Hands-Free On" : "Hands-Free Mode"}</button>
              <button onClick={exitCooking} className="rounded-full border border-slate-600 px-4 py-2 text-slate-100 transition hover:border-sky-400 active:scale-[0.98]">Exit</button>
            </div>
          </div>
        </header>

        <main ref={scrollRef} className="relative flex-1 overflow-y-auto overscroll-contain px-3 pb-6 pt-3 md:px-6 md:pb-8" style={{ WebkitOverflowScrolling: "touch", scrollBehavior: "smooth" }}>
          <div className="mx-auto grid w-full max-w-7xl gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <section className="rounded-[2rem] border border-slate-700 bg-slate-900/85 p-4 backdrop-blur md:p-8">
              <div className="sticky top-0 z-10 mb-6 rounded-2xl border border-slate-700 bg-slate-900/95 p-4 backdrop-blur">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-300">Guided Cooking Assistant</p>
                  <p className="text-sm text-slate-300"><span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${isListening ? "animate-pulse bg-emerald-400" : isSpeaking ? "bg-sky-400" : "bg-slate-500"}`} />{statusLabel}</p>
                </div>
                <div className="mt-2 flex items-end justify-between gap-4">
                  <p className="text-2xl font-semibold text-slate-100 md:text-5xl">Step {index + 1}<span className="ml-2 text-base text-slate-400">/ {liveRecipe.steps.length}</span></p>
                  <p className="text-sm text-slate-400">{progress}% complete</p>
                </div>
                <p className="mt-2 max-w-3xl text-sm text-emerald-200">{proactiveHint}</p>
                <p className="mt-1 text-xs text-slate-400">Language: {assistantLanguage}</p>
                {handsFree && voiceText ? <p className="mt-1 text-xs text-sky-300">Heard: "{voiceText}"</p> : null}
                {micError ? <p className="mt-1 text-xs text-rose-300">{micError}</p> : null}
                {!hasRecognition ? <p className="mt-1 text-xs text-slate-400">Hands-free voice is unavailable in this browser. You can still cook with tap controls and AI chat.</p> : null}
                {handsFree ? (
                  <div className="mt-3 flex items-end gap-1">{Array.from({ length: 9 }).map((_, i) => <motion.span key={i} className={`inline-block w-1.5 rounded-full ${isListening ? "bg-emerald-400" : isSpeaking ? "bg-sky-400" : "bg-slate-500"}`} animate={{ height: (!isListening && !isSpeaking) ? 4 : [4, 16, 7, 13, 5] }} transition={{ duration: 0.82, repeat: Infinity, delay: i * 0.06 }} />)}</div>
                ) : null}
                <div className="mt-3 h-2 w-full overflow-hidden rounded bg-slate-700"><motion.div className="h-full bg-gradient-to-r from-emerald-400 to-sky-400" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.35 }} /></div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={`${step.stepNumber || index + 1}-${step.title}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.24 }} className={`rounded-[2rem] border p-4 md:p-6 ${speakingStepIndex === index ? "border-emerald-500/70 shadow-[0_0_60px_rgba(34,197,94,0.12)]" : "border-slate-700"}`}>
                  <h3 className="text-3xl leading-tight text-slate-100 md:text-6xl">{step.title || `Step ${index + 1}`}</h3>
                  <p className="mt-5 text-xl leading-relaxed text-slate-200 md:text-3xl">{detail.mainInstruction}</p>
                  <div className="mt-6 grid gap-3 md:grid-cols-2">
                    <DetailCard label="Ingredients" value={detail.ingredients} />
                    <DetailCard label="Approx Time" value={detail.timeHint} />
                    <DetailCard label="Heat Level" value={detail.heatHint} />
                    <DetailCard label="Look For" value={detail.visualCue} />
                  </div>
                  {detail.stepIngredients.length ? (
                    <div className="mt-5 rounded-xl border border-slate-700 bg-slate-800 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-400">Ingredients For This Step</p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">{detail.stepIngredients.map((item, idx) => <div key={`${item.name}-${idx}`} className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 p-2"><IngredientImage name={item.name} alt={item.name} className="h-10 w-10 rounded-md object-cover" loading="lazy" /><div><p className="text-sm text-slate-100">{item.name}</p><p className="text-xs text-slate-400">{item.quantity}</p></div></div>)}</div>
                    </div>
                  ) : null}
                  <p className="mt-5 rounded-xl bg-slate-800 p-3 text-sm text-slate-200">Safety Tip: {detail.safetyTip}</p>
                </motion.div>
              </AnimatePresence>

              <div className="mt-5 flex flex-wrap gap-3">
                <button onClick={() => goToStep(index - 1)} className="rounded-full bg-slate-800 px-4 py-2 text-slate-100 transition active:scale-[0.98] disabled:opacity-40" disabled={index === 0}>Previous</button>
                <button onClick={() => goToStep(index + 1)} className="rounded-full bg-emerald-500 px-4 py-2 font-semibold text-slate-950 transition active:scale-[0.98] disabled:opacity-40" disabled={index === liveRecipe.steps.length - 1}>Next</button>
                <button onClick={() => speakFriendlyCurrentStep()} className="rounded-full border border-sky-500 px-4 py-2 text-sky-300 transition active:scale-[0.98]">Read</button>
                <button onClick={() => { setIsPaused(true); stopRecognition(); }} className="rounded-full border border-slate-500 px-4 py-2 text-slate-200 transition active:scale-[0.98]">Pause</button>
                <button onClick={() => { setIsPaused(false); if (handsFree) scheduleListeningRestart(60); }} className="rounded-full border border-slate-500 px-4 py-2 text-slate-200 transition active:scale-[0.98]">Resume</button>
              </div>
            </section>

            <aside className="flex flex-col gap-4 rounded-[2rem] border border-slate-700 bg-slate-900/85 p-4 backdrop-blur md:p-5">
              <div className="rounded-[1.6rem] border border-slate-700 bg-slate-950/70 p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-sky-300">Chef Guidance</p>
                <h3 className="mt-2 font-display text-2xl text-slate-100">Proactive assistant</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{proactiveHint}</p>
                {conversation.length ? <div className="mt-4 max-h-48 space-y-2 overflow-auto">{conversation.slice(-4).map((entry, idx) => <div key={`${entry.role}-${idx}-${entry.text.slice(0, 8)}`} className={`rounded-2xl px-3 py-2 text-sm ${entry.role === "assistant" ? "bg-slate-800 text-slate-200" : "bg-sky-500/10 text-sky-100"}`}>{entry.text}</div>)}</div> : null}
              </div>

              <div className="rounded-[1.6rem] border border-slate-700 bg-slate-950/70 p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-emerald-300">Adapt Mid-Cook</p>
                <h3 className="mt-2 font-display text-2xl text-slate-100">Change ingredient, keep cooking</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">Tell SmartChefAI what changed and it will update the remaining steps with substitutions and timing guidance.</p>
                <textarea value={adaptInput} onChange={(e) => setAdaptInput(e.target.value)} placeholder="Example: I don't have garlic. Replace it with ginger." className="mt-4 min-h-28 w-full rounded-[1.3rem] border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 placeholder:text-slate-500" />
                <button type="button" onClick={handleAdaptRecipe} disabled={adapting || !adaptInput.trim()} className="mt-3 rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 px-5 py-3 font-semibold text-slate-950 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60">{adapting ? "Updating recipe..." : "Update Remaining Steps"}</button>
                {adaptStatus ? <p className="mt-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{adaptStatus}</p> : null}
              </div>

              <div className="rounded-[1.6rem] border border-slate-700 bg-slate-950/70 p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Try Asking</p>
                <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2 xl:grid-cols-1">
                  {["Take me to step 3", "What should I do next?", "Repeat that step", "How much oil should I use?", "It is burning", "Stop hands-free mode"].map((prompt) => <div key={prompt} className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">{prompt}</div>)}
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

function buildDetailedStep(recipe, step, stepIndex) {
  const stepIngredientText = step.ingredients || step.ingredient || "";
  const ingredientMatches = (recipe.ingredients || []).filter((item) => stepIngredientText ? stepIngredientText.toLowerCase().includes((item.name || "").toLowerCase()) : true);
  const baseIngredients = ingredientMatches.length ? ingredientMatches : (recipe.ingredients || []).slice(0, 3);
  const ingredientText = stepIngredientText || baseIngredients.map((item) => `${item.name} (${item.quantity || "as needed"})`).join(", ");
  const lowerText = (step.instruction || step.text || "").toLowerCase();

  return {
    mainInstruction: step.instruction || step.text || "Follow the current cooking step carefully.",
    ingredients: ingredientText || "Use available recipe ingredients",
    stepIngredients: baseIngredients.map((item) => ({ name: item.name, quantity: item.quantity || "as needed" })),
    heatHint: step.heatLevel || "Medium",
    timeHint: step.time || "4-6 minutes",
    visualCue: step.lookFor || "Aroma should deepen and color should brighten",
    safetyTip: lowerText.includes("egg") || lowerText.includes("chicken") || lowerText.includes("fish") ? "Cook proteins fully before serving." : "Keep flame controlled and avoid overcrowding the pan.",
    readText: `Step ${stepIndex + 1}. ${step.title || "Cooking step"}. ${step.instruction || step.text || ""}`,
  };
}

function DetailCard({ label, value }) {
  return <div className="rounded-xl border border-slate-700 bg-slate-800 p-3"><p className="text-xs uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm text-slate-100">{value}</p></div>;
}


















