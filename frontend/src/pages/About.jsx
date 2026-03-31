export default function About() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <section className="glass-panel hero-glow overflow-hidden rounded-[2rem] p-8 md:p-10">
        <p className="text-xs uppercase tracking-[0.32em] text-emerald-300">About SmartChefAI</p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl leading-tight text-gradient md:text-5xl">
          Real-time culinary guidance designed for modern kitchens.
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
          SmartChefAI combines ingredient discovery, AI-generated recipes, guided cooking, voice interaction,
          and visual learning into a single premium cooking companion. It is built to help home cooks move
          from pantry chaos to confident plating with less friction and better decision support.
        </p>
      </section>
    </main>
  );
}
