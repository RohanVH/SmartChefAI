import { memo } from "react";
import { motion } from "framer-motion";
import FoodImage from "./FoodImage";
import { minutesLabel } from "../utils/helpers";

function RecipeCardComponent({ recipe, onOpen, cardIndex = 0 }) {
  return (
    <motion.button
      layout
      type="button"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onOpen(recipe)}
      className="group overflow-hidden rounded-[1.85rem] border border-slate-700 bg-slate-900/80 text-left shadow-[0_18px_60px_rgba(2,6,23,0.45)] transition-all hover:border-sky-400/60 hover:shadow-[0_22px_70px_rgba(34,197,94,0.12)]"
    >
      <div className="relative">
        <FoodImage
          query={recipe.imagePrompt || recipe.name}
          seed={`${recipe.id || recipe.name}-${cardIndex}`}
          alt={recipe.name}
          className="h-52 w-full"
          loading="lazy"
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
        />
        <div className="absolute left-4 top-4 inline-flex rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-sky-200 backdrop-blur">
          {recipe.cuisine}
        </div>
      </div>
      <div className="space-y-3 p-5">
        <div>
          <h3 className="font-display text-xl leading-tight text-slate-100">{recipe.name}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">{recipe.description || "AI-crafted recipe with guided cooking support."}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-emerald-500/12 px-3 py-1 text-emerald-200">{minutesLabel(recipe.cookTimeMinutes)}</span>
          <span className="rounded-full bg-sky-500/12 px-3 py-1 text-sky-200">{recipe.difficulty}</span>
          {recipe.regionalStyle ? <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-300">{recipe.regionalStyle}</span> : null}
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Open detail experience</span>
          <span className="font-semibold text-sky-300 transition group-hover:text-sky-200">View recipe</span>
        </div>
      </div>
    </motion.button>
  );
}

const RecipeCard = memo(RecipeCardComponent);
export default RecipeCard;
