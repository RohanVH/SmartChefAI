import { useState } from "react";
import { recipeService } from "../services/recipeService";

export default function AIChat({ recipe }) {
  const [q, setQ] = useState("");
  const [messages, setMessages] = useState([]);

  const ask = async () => {
    if (!q.trim()) return;
    const question = q.trim();
    setQ("");
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    const data = await recipeService.recipeChat({ question, recipe });
    setMessages((prev) => [...prev, { role: "assistant", text: data.answer }]);
  };

  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
      <h3 className="font-display text-lg text-slate-100">AI Cooking Assistant</h3>
      <div className="mt-3 max-h-48 space-y-2 overflow-auto">
        {messages.map((m, idx) => (
          <p key={`${m.role}-${idx}`} className={`rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-sky-500/20 text-sky-100" : "bg-slate-800 text-slate-300"}`}>
            {m.text}
          </p>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about this recipe..." className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
        <button onClick={ask} className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:brightness-110">
          Ask
        </button>
      </div>
    </section>
  );
}
