import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import FoodImage from "./FoodImage";
import StepCard from "./StepCard";
import { recipeService } from "../services/recipeService";

const AIChat = lazy(() => import("./AIChat"));
const CookingMode = lazy(() => import("./CookingMode"));
const RecipeVideoGuide = lazy(() => import("./RecipeVideoGuide"));

function PanelFallback({ height = "h-64" }) {
  return <div className={`${height} animate-pulse rounded-[1.8rem] bg-slate-900/80`} />;
}

function RecipeViewerComponent({ recipe, language = "English" }) {
  const [currentRecipe, setCurrentRecipe] = useState(recipe);
  const [isCookingMode, setIsCookingMode] = useState(false);
  const [rating, setRating] = useState(0);
  const [status, setStatus] = useState("");
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const lastLoggedRecipeRef = useRef("");
  const activeStep = currentRecipe?.steps?.[activeStepIndex] || null;
  const cookingSession = useMemo(() => recipeService.getCookingSession(), [currentRecipe?.id, currentRecipe?.name]);
  const canResume = cookingSession?.recipe?.name === currentRecipe?.name && Number.isFinite(cookingSession?.stepIndex) && cookingSession.stepIndex > 0;

  useEffect(() => {
    setCurrentRecipe(recipe);
  }, [recipe]);

  useEffect(() => {
    if (!currentRecipe?.name) return;
    if (lastLoggedRecipeRef.current === currentRecipe.name) return;
    lastLoggedRecipeRef.current = currentRecipe.name;
    recipeService.addHistory({
      recipeName: currentRecipe.name,
      action: "viewed",
      cookedAt: new Date().toISOString(),
    });
  }, [currentRecipe?.name]);

  useEffect(() => {
    if (canResume) {
      setActiveStepIndex(Math.min(cookingSession.stepIndex, Math.max((currentRecipe.steps?.length || 1) - 1, 0)));
      return;
    }
    setActiveStepIndex(0);
  }, [currentRecipe?.id, currentRecipe?.name, canResume, cookingSession?.stepIndex, currentRecipe?.steps?.length]);

  useEffect(() => {
    if (!currentRecipe) return;
    recipeService.saveCookingSession({ recipe: currentRecipe, stepIndex: activeStepIndex, language });
  }, [currentRecipe, activeStepIndex, language]);

  const saveRecipe = useCallback(async () => {
    const saveResult = await recipeService.saveRecipe(currentRecipe);
    await recipeService.addHistory({ recipeName: currentRecipe.name, action: "saved", cookedAt: new Date().toISOString() });
    setStatus(saveResult.source === "remote" ? "Saved to your cloud recipe list." : "Saved locally for offline access.");
  }, [currentRecipe]);

  const submitRating = useCallback(async (value) => {
    setRating(value);
    const rateResult = await recipeService.rateRecipe(currentRecipe.name, value);
    setStatus(rateResult.source === "remote" ? `You rated this recipe ${value}/5.` : `Rating stored locally as ${value}/5.`);
  }, [currentRecipe?.name]);

  const openCookingMode = useCallback(async () => {
    await recipeService.addHistory({
      recipeName: currentRecipe.name,
      action: "started_cooking",
      cookedAt: new Date().toISOString(),
    });
    setIsCookingMode(true);
  }, [currentRecipe]);

  const resumeCooking = useCallback(() => {
    if (canResume) {
      setActiveStepIndex(cookingSession.stepIndex);
      setIsCookingMode(true);
    }
  }, [canResume, cookingSession?.stepIndex]);

  const selectStep = useCallback((idx) => setActiveStepIndex(idx), []);
  const handleRecipeUpdate = useCallback((nextRecipe) => setCurrentRecipe(nextRecipe), []);

  if (!currentRecipe) return null;

  return (
    <>
      {isCookingMode ? (
        <Suspense fallback={<PanelFallback height="h-[80vh]" />}>
          <CookingMode recipe={currentRecipe} language={language} initialStepIndex={activeStepIndex} onClose={() => setIsCookingMode(false)} onRecipeUpdate={handleRecipeUpdate} />
        </Suspense>
      ) : null}
      <motion.section key={currentRecipe.id || currentRecipe.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="glass-panel hero-glow overflow-hidden rounded-[2.2rem]">
          <div className="grid gap-0 xl:grid-cols-[1.05fr_0.95fr]">
            <FoodImage query={currentRecipe.imagePrompt || currentRecipe.name} seed={currentRecipe.id || currentRecipe.name} alt={currentRecipe.name} className="h-full min-h-[22rem]" sizes="(max-width: 1280px) 100vw, 48vw" />
            <div className="p-6 md:p-8">
              <p className="text-xs uppercase tracking-[0.32em] text-emerald-300">Recipe Overview</p>
              <h2 className="mt-3 font-display text-4xl leading-tight text-slate-100 md:text-5xl">{currentRecipe.name}</h2>
              <p className="mt-3 text-base leading-8 text-slate-300">
                {currentRecipe.description || `${currentRecipe.cuisine} recipe with guided cooking, AI assistance, and step-by-step support.`}
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-sm">
                <span className="rounded-full bg-slate-950/80 px-3 py-2 text-sky-200">{currentRecipe.cuisine}</span>
                {currentRecipe.regionalStyle ? <span className="rounded-full bg-slate-950/80 px-3 py-2 text-slate-200">{currentRecipe.regionalStyle}</span> : null}
                <span className="rounded-full bg-emerald-500/12 px-3 py-2 text-emerald-200">{currentRecipe.cookTimeMinutes} min</span>
                <span className="rounded-full bg-sky-500/12 px-3 py-2 text-sky-200">{currentRecipe.difficulty}</span>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Stat label="Calories" value={currentRecipe.nutrition?.calories ?? "-"} />
                <Stat label="Protein" value={currentRecipe.nutrition?.protein ?? "-"} />
                <Stat label="Carbs" value={currentRecipe.nutrition?.carbs ?? "-"} />
                <Stat label="Fat" value={currentRecipe.nutrition?.fat ?? "-"} />
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={openCookingMode} className="rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 px-5 py-3 font-semibold text-slate-950 transition hover:brightness-110 active:scale-[0.98]">
                  Start Cooking Mode
                </button>
                {canResume ? (
                  <button type="button" onClick={resumeCooking} className="rounded-full border border-emerald-400/50 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-200 transition hover:border-emerald-300 active:scale-[0.98]">
                    Resume Cooking
                  </button>
                ) : null}
                <button type="button" onClick={saveRecipe} className="rounded-full border border-slate-700 bg-slate-950/70 px-5 py-3 text-sm text-slate-100 transition hover:border-sky-400 active:scale-[0.98]">
                  Save Recipe
                </button>
              </div>

              {status ? <p className="mt-4 text-sm text-emerald-300">{status}</p> : null}
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
          <div className="glass-panel rounded-[2rem] p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-sky-300">Ingredients</p>
            <h3 className="mt-2 font-display text-2xl text-slate-100">Everything you need</h3>
            <ul className="mt-5 space-y-3">
              {(currentRecipe.ingredients || []).map((item, idx) => (
                <li key={`${item.name || item}-${idx}`} className="flex items-center justify-between gap-4 rounded-[1.3rem] border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-200">
                  <span>{item.name || item}</span>
                  <span className="text-slate-400">{item.quantity || "as needed"}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-4">
              <h4 className="font-display text-lg text-slate-100">Ingredient substitutions</h4>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                {Object.entries(currentRecipe.substitutions || {}).length ? Object.entries(currentRecipe.substitutions || {}).map(([name, options]) => (
                  <p key={name}><span className="font-semibold text-white">{name}:</span> {options.join(", ")}</p>
                )) : <p>No substitutions available for this recipe yet.</p>}
              </div>
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-4">
              <p className="font-display text-lg text-slate-100">Community rating</p>
              <div className="mt-3 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button key={v} type="button" onClick={() => submitRating(v)} className={`rounded-md px-1 text-2xl leading-none transition ${rating >= v ? "text-amber-400" : "text-slate-500 hover:text-amber-300"}`} aria-label={`Rate ${v} stars`}>
                    ★
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-400">Rate this recipe after cooking to personalize future suggestions.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1fr_0.92fr]">
              <div className="glass-panel rounded-[2rem] p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-emerald-300">Active Step</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-emerald-500/12 px-3 py-1 text-sm text-emerald-200">Step {activeStepIndex + 1} / {currentRecipe.steps.length}</span>
                  <span className="rounded-full bg-slate-950/80 px-3 py-1 text-sm text-slate-300">{activeStep?.time || "4-6 minutes"}</span>
                  <span className="rounded-full bg-slate-950/80 px-3 py-1 text-sm text-slate-300">{activeStep?.heatLevel || "Medium"}</span>
                </div>
                <h3 className="mt-4 font-display text-2xl text-slate-100">{activeStep?.title || "Step details"}</h3>
                <p className="mt-4 text-base leading-8 text-slate-300">{activeStep?.instruction || activeStep?.text}</p>
                <div className="mt-5 rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
                  <p><span className="font-semibold text-white">Ingredients:</span> {activeStep?.ingredients || activeStep?.ingredient}</p>
                  <p className="mt-2"><span className="font-semibold text-white">Look for:</span> {activeStep?.lookFor || "Aromatic and cooked texture"}</p>
                </div>
              </div>
              <Suspense fallback={<PanelFallback />}>
                <RecipeVideoGuide recipe={currentRecipe} currentStep={activeStep} activeStepIndex={activeStepIndex} />
              </Suspense>
            </div>

            <div className="glass-panel rounded-[2rem] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-sky-300">Step-by-Step Instructions</p>
                  <h3 className="mt-2 font-display text-2xl text-slate-100">Follow the full guided sequence</h3>
                </div>
              </div>
              <div className="mt-5 space-y-4">
                {currentRecipe.steps.map((stepItem, idx) => (
                  <StepCard key={`${stepItem.stepNumber || idx + 1}-${stepItem.title}-${idx}`} step={stepItem} index={idx} isActive={activeStepIndex === idx} onSelect={() => selectStep(idx)} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[1.8rem] border border-slate-700 bg-slate-900/70 px-5 py-4 text-sm text-slate-200">{currentRecipe.summary}</div>

        <Suspense fallback={<PanelFallback />}>
          <AIChat recipe={currentRecipe} currentStepIndex={activeStepIndex} />
        </Suspense>
      </motion.section>
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-[1.3rem] border border-slate-800 bg-slate-950/70 p-4 text-center">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-100">{value}</p>
    </div>
  );
}

const RecipeViewer = memo(RecipeViewerComponent);
export default RecipeViewer;
