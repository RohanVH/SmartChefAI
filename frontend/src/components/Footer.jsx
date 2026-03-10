export default function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-700/80 bg-slate-900/40 py-10">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 text-sm text-slate-400 md:grid-cols-3">
        <div>
          <p className="font-display text-lg text-slate-100">SmartChefAI</p>
          <p className="mt-2">Cook amazing dishes with what you have.</p>
        </div>
        <div>
          <p className="font-semibold text-slate-200">Product</p>
          <p className="mt-2">AI Recipe Generator</p>
          <p>Hands-Free Cooking Assistant</p>
        </div>
        <div className="md:text-right">
          <p className="font-semibold text-slate-200">Built for modern kitchens</p>
          <p className="mt-2">© {new Date().getFullYear()} SmartChefAI</p>
        </div>
      </div>
    </footer>
  );
}
