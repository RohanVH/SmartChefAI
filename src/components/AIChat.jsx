import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { getApiErrorMessage } from "../services/api";
import { recipeService } from "../services/recipeService";

const MIN_CONFIDENCE = 0.55;
const DEFAULT_MESSAGES = [
  {
    role: "assistant",
    text: "Ask me about heat, substitutions, timing, texture, or rescue tips for this recipe.",
  },
];

function chunkSpeech(text = "") {
  return String(text)
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part) => {
      if (part.length <= 140) return [part];
      return part.match(/.{1,140}(?:\s|$)/g)?.map((item) => item.trim()).filter(Boolean) || [part];
    });
}

function AIChatComponent({ recipe, currentStepIndex = 0 }) {
  const currentStep = useMemo(() => recipe?.steps?.[currentStepIndex] || null, [recipe?.steps, currentStepIndex]);
  const [q, setQ] = useState("");
  const [messages, setMessages] = useState(() => recipeService.getChatHistory(recipe)?.length ? recipeService.getChatHistory(recipe) : DEFAULT_MESSAGES);
  const [loading, setLoading] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState("");
  const [continuousListening, setContinuousListening] = useState(false);
  const recognitionRef = useRef(null);
  const shouldRestartRef = useRef(false);
  const scrollRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const speechTokenRef = useRef(0);
  const hasRecognition = useMemo(() => typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition), []);

  useEffect(() => {
    const stored = recipeService.getChatHistory(recipe);
    setMessages(stored?.length ? stored : DEFAULT_MESSAGES);
  }, [recipe?.id, recipe?.name]);

  useEffect(() => {
    recipeService.saveChatHistory(recipe, messages);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, recipe]);

  const stopSpeaking = useCallback(() => {
    speechTokenRef.current += 1;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const scheduleRecognitionRestart = useCallback(() => {
    if (!shouldRestartRef.current || !hasRecognition) return;
    window.setTimeout(() => {
      if (!recognitionRef.current && shouldRestartRef.current) {
        startVoiceInput({ keepListening: true });
      }
    }, 180);
  }, [hasRecognition]);

  const speak = useCallback(async (text) => {
    if (typeof window === "undefined" || !text) return;
    stopSpeaking();
    const token = speechTokenRef.current;
    const parts = chunkSpeech(text);
    for (let idx = 0; idx < parts.length; idx += 1) {
      const part = parts[idx];
      await new Promise((resolve) => {
        if (speechTokenRef.current !== token) return resolve();
        const utterance = new SpeechSynthesisUtterance(part);
        utterance.lang = "en-IN";
        utterance.rate = 1;
        utterance.onstart = () => setSpeaking(true);
        utterance.onend = () => {
          scheduleRecognitionRestart();
          window.setTimeout(resolve, 80);
        };
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
      });
      if (speechTokenRef.current !== token) break;
    }
    if (speechTokenRef.current === token) {
      setSpeaking(false);
      scheduleRecognitionRestart();
    }
  }, [scheduleRecognitionRestart, stopSpeaking]);

  const stopRecognition = useCallback(() => {
    window.clearTimeout(silenceTimerRef.current);
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
      console.log("[AIChat] mic stopped");
    }
    setVoiceActive(false);
  }, []);

  useEffect(() => () => {
    shouldRestartRef.current = false;
    stopRecognition();
    stopSpeaking();
  }, [stopRecognition, stopSpeaking]);

  const ask = useCallback(async (questionOverride) => {
    const question = (questionOverride || q).trim();
    if (!question || loading) return;
    setQ("");
    setError("");
    setLoading(true);
    const nextMessages = [...messages, { role: "user", text: question }];
    setMessages(nextMessages);

    try {
      const data = await recipeService.recipeChat({
        question,
        previousMessages: nextMessages.slice(-10),
        recipe: {
          ...recipe,
          currentStepIndex,
          currentStep,
        },
      });
      const answer = data.answer || "I can help with this recipe while you're cooking.";
      console.log("[AIChat] ai responded", answer);
      setMessages((prev) => [...prev, { role: "assistant", text: answer }]);
      await speak(answer);
    } catch (nextError) {
      const message = getApiErrorMessage(nextError, "The AI chef is unavailable right now.");
      setError(message);
      setMessages((prev) => [...prev, { role: "assistant", text: message }]);
    } finally {
      setLoading(false);
      if (shouldRestartRef.current) {
        scheduleRecognitionRestart();
      }
    }
  }, [q, loading, messages, recipe, currentStepIndex, currentStep, scheduleRecognitionRestart, speak]);

  const startVoiceInput = useCallback(({ keepListening = false } = {}) => {
    if (!hasRecognition) {
      setError("Voice input is not supported in this browser. You can keep chatting with text.");
      return;
    }

    stopSpeaking();
    shouldRestartRef.current = keepListening;
    setContinuousListening(keepListening);

    if (recognitionRef.current) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = true;

    recognition.onstart = () => {
      console.log("[AIChat] mic started");
      stopSpeaking();
      setVoiceActive(true);
      setError("");
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = window.setTimeout(() => {
        try {
          recognition.stop();
        } catch {
          // ignore
        }
      }, 7000);
    };

    recognition.onerror = () => {
      console.log("[AIChat] mic error");
      setVoiceActive(false);
      window.clearTimeout(silenceTimerRef.current);
      recognitionRef.current = null;
      if (shouldRestartRef.current) {
        scheduleRecognitionRestart();
      } else {
        setError("Voice input is unavailable right now.");
      }
    };

    recognition.onresult = (event) => {
      window.clearTimeout(silenceTimerRef.current);
      const result = event.results?.[event.results.length - 1]?.[0];
      const transcript = result?.transcript?.trim() || "";
      const confidence = typeof result?.confidence === "number" ? result.confidence : 1;
      if (!transcript) return;
      if (confidence && confidence < MIN_CONFIDENCE) {
        setError("I did not catch that clearly. Please try again or type your question.");
        scheduleRecognitionRestart();
        return;
      }
      stopSpeaking();
      stopRecognition();
      setQ(transcript);
      ask(transcript);
    };

    recognition.onend = () => {
      console.log("[AIChat] mic ended");
      recognitionRef.current = null;
      setVoiceActive(false);
      window.clearTimeout(silenceTimerRef.current);
      if (shouldRestartRef.current) {
        scheduleRecognitionRestart();
      }
    };

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setError("Unable to start microphone.");
    }
  }, [ask, hasRecognition, scheduleRecognitionRestart, stopRecognition, stopSpeaking]);

  const stopVoiceLoop = useCallback(() => {
    shouldRestartRef.current = false;
    setContinuousListening(false);
    stopRecognition();
  }, [stopRecognition]);

  return (
    <section className="glass-panel rounded-[1.8rem] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className={`relative flex h-14 w-14 items-center justify-center rounded-full border ${speaking ? "border-emerald-400 bg-emerald-500/15" : voiceActive ? "border-sky-400 bg-sky-500/10" : "border-slate-700 bg-slate-900"}`}>
            {(speaking || voiceActive) ? <span className="absolute inset-0 rounded-full animate-ping bg-emerald-400/10" /> : null}
            <span className="relative text-lg font-display text-slate-100">Chef</span>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-emerald-300">AI Cooking Assistant</p>
            <h3 className="mt-1 font-display text-2xl text-slate-100">Talk to a friendly chef while you cook</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">Current focus: {currentStep ? `Step ${currentStepIndex + 1} - ${currentStep.title}` : "General recipe guidance"}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasRecognition ? (
            <>
              <button type="button" onClick={() => startVoiceInput({ keepListening: false })} className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 transition hover:border-sky-400 active:scale-[0.98]">
                {voiceActive ? "Listening..." : "Ask by Voice"}
              </button>
              <button type="button" onClick={() => (continuousListening ? stopVoiceLoop() : startVoiceInput({ keepListening: true }))} className={`rounded-full px-4 py-2 text-sm font-semibold transition active:scale-[0.98] ${continuousListening ? "bg-emerald-500 text-slate-950" : "bg-sky-500 text-slate-950 hover:brightness-110"}`}>
                {continuousListening ? "Auto Listen On" : "Auto Listen"}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {!hasRecognition ? <p className="mt-4 text-sm text-slate-400">Voice input is not available in this browser, so SmartChefAI will stay in text chat mode.</p> : null}

      <div ref={scrollRef} className="mt-5 max-h-80 space-y-3 overflow-auto rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-4">
        {messages.map((m, idx) => (
          <motion.div key={`${m.role}-${idx}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`max-w-[85%] rounded-[1.35rem] px-4 py-3 text-sm leading-6 ${m.role === "user" ? "ml-auto bg-sky-500/15 text-sky-100" : "bg-slate-900 text-slate-200"}`}>
            {m.text}
          </motion.div>
        ))}
        {loading ? <div className="w-40 animate-pulse rounded-[1.2rem] bg-slate-800 px-4 py-3 text-sm text-slate-400">Chef is thinking...</div> : null}
      </div>

      {error ? <p className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}

      <div className="mt-4 flex flex-col gap-3 lg:flex-row">
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") ask(); }} placeholder="Try: How much oil should I use? Can I replace garlic? It's burning." className="min-w-0 flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 placeholder:text-slate-500" />
        <button type="button" onClick={() => ask()} disabled={loading} className="rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 px-5 py-3 font-semibold text-slate-950 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60">Ask Chef</button>
      </div>
    </section>
  );
}

const AIChat = memo(AIChatComponent);
export default AIChat;
