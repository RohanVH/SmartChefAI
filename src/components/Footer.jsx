export default function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-800/80 bg-slate-950/50 py-12">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 md:grid-cols-[1.2fr_0.9fr_0.9fr]">
        <div>
          <p className="font-display text-2xl text-slate-100">SmartChefAI</p>
          <p className="mt-3 max-w-md text-sm leading-7 text-slate-400">
            A premium AI cooking assistant for ingredient discovery, guided recipes, conversational help, and step-aware kitchen support.
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-sky-300">Platform</p>
          <p className="mt-3 text-sm text-slate-300">AI Recipe Generator</p>
          <p className="mt-2 text-sm text-slate-300">Live Ingredient Scanner</p>
          <p className="mt-2 text-sm text-slate-300">Guided Cooking Mode</p>
        </div>
        <div className="md:text-right">
          <p className="text-xs uppercase tracking-[0.28em] text-emerald-300">Kitchen Ready</p>
          <p className="mt-3 text-sm text-slate-300">Responsive across mobile, tablet, and desktop.</p>
          <p className="mt-2 text-sm text-slate-500">© {new Date().getFullYear()} SmartChefAI</p>
        </div>
      </div>
    </footer>
  );
}
