import { useEffect, useState } from "react";
import { recipeService } from "../services/recipeService";

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
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-3xl text-slate-100">Recipes</h1>
      {!user ? <p className="mt-2 text-sm text-slate-400">Not logged in: showing local saved/history fallback.</p> : null}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
          <h2 className="font-display text-xl text-slate-100">Saved Recipes</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            {saved.map((r) => (
              <li key={r.id} className="rounded-lg bg-slate-900 p-2">{r.name}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
          <h2 className="font-display text-xl text-slate-100">Cooking History</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            {history.map((h) => (
              <li key={h.id} className="rounded-lg bg-slate-900 p-2">{h.recipeName}</li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
