import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { recipeService } from "../services/recipeService";
import { getRecipeRouteId, saveActiveRecipe } from "../utils/recipeSession";

export default function Recipes({ user }) {
  const [saved, setSaved] = useState([]);
  const [history, setHistory] = useState([]);

  const loadData = () =>
    Promise.all([recipeService.getSavedRecipes(), recipeService.getHistory()])
      .then(([savedData, historyData]) => {
        setSaved(savedData.recipes || []);
        setHistory(historyData.history || []);
      })
      .catch(() => {
        setSaved([]);
        setHistory([]);
      });

  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener("smartchefai:data-changed", handler);
    return () => window.removeEventListener("smartchefai:data-changed", handler);
  }, [user]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <section className="glass-panel hero-glow rounded-[2rem] p-8">
        <p className="text-xs uppercase tracking-[0.32em] text-sky-300">Recipe Library</p>
        <h1 className="mt-3 font-display text-4xl text-slate-100">Your saved dishes and cooking history</h1>
        <p className="mt-3 max-w-3xl text-slate-300">
          {user
            ? "Your authenticated recipe activity is synced here when cloud storage is available."
            : "Firebase is not active, so SmartChefAI is showing the local fallback library stored in this browser."}
        </p>
      </section>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <LibrarySection title="Saved Recipes" items={saved} empty="No saved recipes yet." type="saved" />
        <LibrarySection title="Cooking History" items={history} empty="No cooking history yet." type="history" />
      </div>
    </main>
  );
}

function LibrarySection({ title, items, empty, type }) {
  return (
    <section className="glass-panel rounded-[2rem] p-5">
      <h2 className="font-display text-2xl text-slate-100">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.length ? items.map((item, index) => {
          const recipeName = type === "saved" ? item.name : item.recipeName;
          const routeId = getRecipeRouteId(item);
          return (
            <div key={item.id || `${recipeName}-${index}`} className="flex items-center justify-between gap-4 rounded-[1.4rem] border border-slate-800 bg-slate-950/70 px-4 py-4">
              <div>
                <p className="font-medium text-slate-100">{recipeName}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{type === "saved" ? "Saved recipe" : item.action || "Viewed"}</p>
              </div>
              {type === "saved" ? (
                <Link
                  to={`/recipe/${routeId}`}
                  onClick={() => saveActiveRecipe(item)}
                  className="rounded-full border border-slate-700 px-4 py-2 text-sm text-sky-300 transition hover:border-sky-400 hover:text-sky-200"
                >
                  Open
                </Link>
              ) : null}
            </div>
          );
        }) : <p className="rounded-[1.4rem] border border-dashed border-slate-800 bg-slate-950/60 px-4 py-5 text-sm text-slate-500">{empty}</p>}
      </div>
    </section>
  );
}
