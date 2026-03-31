import { motion } from "framer-motion";

export default function CuisineSelector({ options, value, onChange }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {options.map((item, index) => {
        const active = value === item.value;
        return (
          <motion.button
            key={item.value}
            type="button"
            whileHover={{ y: -4, scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            onClick={() => onChange(item.value)}
            className={`relative overflow-hidden rounded-[1.6rem] border p-4 text-left transition ${
              active
                ? "border-emerald-400/80 bg-emerald-500/14 shadow-[0_14px_40px_rgba(34,197,94,0.18)]"
                : "border-slate-700/80 bg-slate-900/60 hover:border-sky-400/40 hover:bg-slate-900/80"
            }`}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.14),_transparent_38%)]" />
            <div className="relative">
              <div className="text-2xl">{item.icon}</div>
              <p className="mt-4 font-display text-lg text-slate-100">{item.label}</p>
              <p className="mt-1 text-sm leading-6 text-slate-400">{item.description}</p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
