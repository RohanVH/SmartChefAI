import { Link, useLocation, useParams } from "react-router-dom";
import RecipeViewer from "../components/RecipeViewer";
import { loadActiveRecipe } from "../utils/recipeSession";

export default function RecipeDetail() {
  const { recipeId } = useParams();
  const location = useLocation();
  const recipe = location.state?.recipe || loadActiveRecipe();

  if (!recipe) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="glass-panel rounded-[2rem] p-8 text-center hero-glow">
          <p className="text-sm uppercase tracking-[0.28em] text-sky-300">Recipe Unavailable</p>
          <h1 className="mt-3 font-display text-3xl text-slate-100">We couldn&apos;t restore that recipe.</h1>
          <p className="mt-3 text-slate-300">
            Generate or search for a recipe again, then open the detail page from the recipe card.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 px-5 py-3 font-semibold text-slate-950 transition hover:brightness-110"
          >
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-sky-300">Recipe Detail</p>
          <h1 className="mt-2 font-display text-3xl text-slate-100 md:text-4xl">
            {recipe.name}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Route id: <span className="text-slate-300">{recipeId}</span>
          </p>
        </div>
        <Link
          to="/"
          className="rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 transition hover:border-sky-400 hover:text-white"
        >
          Back to Discovery
        </Link>
      </div>
      <RecipeViewer recipe={recipe} language={recipe.language || "English"} />
    </main>
  );
}
