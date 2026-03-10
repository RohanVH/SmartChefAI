import { motion } from "framer-motion";
import IngredientImage from "./IngredientImage";

export default function StepCard({ step, index, isActive = false, onSelect }) {
  const ingredientText = step.ingredients || step.ingredient || "Mixed ingredients";
  const instructionText = step.instruction || step.text || "Follow the recipe instruction.";

  return (
    <motion.button
      whileTap={{ scale: 0.995 }}
      onClick={onSelect}
      className={`grid w-full gap-3 rounded-2xl border p-4 text-left md:grid-cols-[110px_1fr] ${
        isActive ? "border-emerald-400 bg-slate-900/95 shadow-lg shadow-emerald-900/20" : "border-slate-700 bg-slate-900/70"
      }`}
    >
      <IngredientImage
        name={ingredientText.split(",")[0] || ingredientText}
        alt={ingredientText}
        className="h-24 w-full rounded-lg object-cover md:h-full"
        loading="lazy"
      />
      <div>
        <h4 className="font-display text-base text-sky-300">Step {index + 1}: {step.title}</h4>
        <p className="mt-2 text-sm text-slate-200"><span className="font-semibold">Ingredients:</span> {ingredientText}</p>
        <p className="mt-1 text-sm leading-6 text-slate-300">{instructionText}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
          <span className="rounded bg-slate-800 px-2 py-1">Time: {step.time || "4-6 minutes"}</span>
          <span className="rounded bg-slate-800 px-2 py-1">Heat: {step.heatLevel || "Medium"}</span>
          <span className="rounded bg-slate-800 px-2 py-1">Look For: {step.lookFor || "Aromatic and cooked texture"}</span>
        </div>
      </div>
    </motion.button>
  );
}
