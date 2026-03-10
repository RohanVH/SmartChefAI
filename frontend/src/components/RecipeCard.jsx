import { motion } from "framer-motion";
import FoodImage from "./FoodImage";
import { minutesLabel } from "../utils/helpers";

export default function RecipeCard({ recipe, onSelect, cardIndex = 0 }) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onSelect(recipe)}
      className="group overflow-hidden rounded-3xl border border-slate-700 bg-slate-800/90 text-left shadow-xl shadow-slate-950/40 transition-all hover:border-sky-400/60 hover:shadow-sky-900/20"
    >
      <FoodImage
        query={recipe.imagePrompt || recipe.name}
        seed={`${recipe.id || recipe.name}-${cardIndex}`}
        alt={recipe.name}
        className="h-36 w-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />
      <div className="space-y-1 p-4">
        <h3 className="font-display text-lg text-slate-100">{recipe.name}</h3>
        <p className="text-sm text-slate-300">{recipe.cuisine}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-slate-900 px-2 py-1 text-sky-300">{minutesLabel(recipe.cookTimeMinutes)}</span>
          <span className="rounded-full bg-slate-900 px-2 py-1 text-emerald-300">{recipe.difficulty}</span>
        </div>
      </div>
    </motion.button>
  );
}
