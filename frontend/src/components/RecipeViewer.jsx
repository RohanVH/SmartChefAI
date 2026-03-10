import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { recipeService } from "../services/recipeService";
import StepCard from "./StepCard";
import AIChat from "./AIChat";
import CookingMode from "./CookingMode";
import RecipeVideoGuide from "./RecipeVideoGuide";

export default function RecipeViewer({ recipe, language = "English" }) {
  const [isCookingMode, setIsCookingMode] = useState(false);
  const [rating, setRating] = useState(0);
  const [status, setStatus] = useState("");
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const lastLoggedRecipeRef = useRef("");

  useEffect(() => {
    if (!recipe?.name) return;
    if (lastLoggedRecipeRef.current === recipe.name) return;
    lastLoggedRecipeRef.current = recipe.name;
    recipeService.addHistory({
      recipeName: recipe.name,
      action: "viewed",
      cookedAt: new Date().toISOString(),
    });
  }, [recipe?.name]);

  useEffect(() => {
    setActiveStepIndex(0);
  }, [recipe?.id, recipe?.name]);

  if (!recipe) return null;

  const saveRecipe = async () => {
    const saveResult = await recipeService.saveRecipe(recipe);
    await recipeService.addHistory({ recipeName: recipe.name, action: "saved", cookedAt: new Date().toISOString() });
    setStatus(saveResult.source === "remote" ? "Saved to your cloud recipe list." : "Saved locally (offline fallback).");
  };

  const submitRating = async (value) => {
    setRating(value);
    const rateResult = await recipeService.rateRecipe(recipe.name, value);
    setStatus(
      rateResult.source === "remote"
        ? `You rated this recipe ${value}/5.`
        : `You rated this recipe ${value}/5 (local fallback).`
    );
  };

  return (
    <>
      {isCookingMode && <CookingMode recipe={recipe} language={language} onClose={() => setIsCookingMode(false)} />}
      <motion.section
        key={recipe.id || recipe.name}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4 rounded-3xl border border-slate-700 bg-slate-800/80 p-5 shadow-xl shadow-slate-950/30 backdrop-blur"
      >
        <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-start">
          <div className="text-center md:text-left">
            <h2 className="font-display text-3xl text-slate-100">{recipe.name}</h2>
            <p className="text-sm text-slate-300">
              {recipe.cuisine} {recipe.regionalStyle ? `- ${recipe.regionalStyle}` : ""}
            </p>
          </div>
          <p className="text-sm font-semibold text-sky-300">Cooking Time: {recipe.cookTimeMinutes} minutes</p>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Stat label="Calories" value={recipe.nutrition?.calories ?? "-"} />
          <Stat label="Protein" value={recipe.nutrition?.protein ?? "-"} />
          <Stat label="Carbs" value={recipe.nutrition?.carbs ?? "-"} />
          <Stat label="Fat" value={recipe.nutrition?.fat ?? "-"} />
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
          <h4 className="font-display text-base text-slate-100">Ingredients</h4>
          <ul className="mt-2 grid gap-1 text-sm text-slate-300 md:grid-cols-2">
            {(recipe.ingredients || []).map((item, idx) => (
              <li key={`${item.name || item}-${idx}`}>
                {item.name || item}: {item.quantity || "as needed"}
              </li>
            ))}
          </ul>
        </div>

        <RecipeVideoGuide recipe={recipe} activeStepIndex={activeStepIndex} />

        <div className="space-y-3">
          {recipe.steps.map((step, idx) => (
            <StepCard
              key={`${step.stepNumber || idx + 1}-${step.title}-${idx}`}
              step={step}
              index={idx}
              isActive={activeStepIndex === idx}
              onSelect={() => setActiveStepIndex(idx)}
            />
          ))}
        </div>

        <p className="rounded-xl bg-slate-900 p-3 text-sm text-slate-200">{recipe.summary}</p>

        <div className="rounded-xl border border-slate-700 p-3">
          <h4 className="font-display text-base text-slate-100">Ingredient Substitutions</h4>
          {Object.entries(recipe.substitutions || {}).map(([name, options]) => (
            <p key={name} className="mt-1 text-sm text-slate-300">
              {name}: {options.join(", ")}
            </p>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={async () => {
              await recipeService.addHistory({
                recipeName: recipe.name,
                action: "started_cooking",
                cookedAt: new Date().toISOString(),
              });
              setIsCookingMode(true);
            }}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110"
          >
            Start Cooking
          </button>
          <button onClick={saveRecipe} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-slate-100 hover:bg-slate-700">
            Save Recipe
          </button>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                onClick={() => submitRating(v)}
                className={`rounded-md px-1 text-2xl leading-none transition ${rating >= v ? "text-amber-400" : "text-slate-500 hover:text-amber-300"}`}
                aria-label={`Rate ${v} stars`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-400">Community: 4.5 rating, 120 people cooked this recipe.</p>
        {status ? <p className="text-xs text-emerald-300">{status}</p> : null}
        <AIChat recipe={recipe} />
      </motion.section>
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-center">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-lg text-slate-100">{value}</p>
    </div>
  );
}
