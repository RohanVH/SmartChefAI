import { motion } from "framer-motion";
import IngredientImage from "./IngredientImage";

export default function StepCard({ step, index, isActive = false, onSelect }) {
  const ingredientText = step.ingredients || step.ingredient || "Mixed ingredients";
  const instructionText = step.instruction || step.text || "Follow the recipe instruction.";

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.995 }}
      onClick={onSelect}
      className={`grid w-full gap-4 rounded-[1.6rem] border p-4 text-left transition md:grid-cols-[120px_1fr] ${
        isActive
          ? "border-emerald-400/70 bg-emerald-500/8 shadow-[0_16px_50px_rgba(34,197,94,0.10)]"
          : "border-slate-700 bg-slate-900/65 hover:border-sky-400/35"
      }`}
    >
      <IngredientImage
        name={ingredientText.split(",")[0] || ingredientText}
        alt={ingredientText}
        className="h-24 w-full rounded-[1.2rem] object-cover md:h-full"
        loading="lazy"
      />
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-950/80 px-3 py-1 text-xs uppercase tracking-[0.2em] text-sky-200">Step {index + 1}</span>
          <h4 className="font-display text-lg text-slate-100">{step.title}</h4>
        </div>
        <p className="mt-3 text-sm text-slate-200"><span className="font-semibold">Ingredients:</span> {ingredientText}</p>
        <p className="mt-2 text-sm leading-7 text-slate-300">{instructionText}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
          <span className="rounded-full bg-slate-950/80 px-3 py-1">Time: {step.time || "4-6 minutes"}</span>
          <span className="rounded-full bg-slate-950/80 px-3 py-1">Heat: {step.heatLevel || "Medium"}</span>
          <span className="rounded-full bg-slate-950/80 px-3 py-1">Look For: {step.lookFor || "Aromatic and cooked texture"}</span>
        </div>
      </div>
    </motion.button>
  );
}
