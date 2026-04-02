export function SectionHeading({ eyebrow, title, subtitle, align = "left" }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      {eyebrow ? <p className="text-xs uppercase tracking-[0.32em] text-sky-300">{eyebrow}</p> : null}
      <h2 className="mt-2 font-display text-3xl leading-tight text-slate-100 md:text-4xl">{title}</h2>
      {subtitle ? <p className="mt-3 text-base leading-7 text-slate-300">{subtitle}</p> : null}
    </div>
  );
}
