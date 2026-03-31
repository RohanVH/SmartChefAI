import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/recipes", label: "Library" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export default function Navbar({ user, onLogin, onLogout, authEnabled = true }) {
  const [open, setOpen] = useState(false);
  const linkClass = ({ isActive }) =>
    `rounded-full px-4 py-2 text-sm transition ${
      isActive ? "bg-emerald-500 text-slate-950 shadow-sm" : "text-slate-300 hover:bg-slate-800 hover:text-white"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/65 backdrop-blur-xl">
      <nav className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3 font-display text-xl font-semibold text-slate-100">
            <img src="/smartchef-logo.svg" alt="SmartChefAI logo" className="h-11 w-11 rounded-2xl shadow-[0_12px_30px_rgba(34,197,94,0.18)]" />
            <div>
              <p>SmartChefAI</p>
              <p className="text-xs font-body uppercase tracking-[0.24em] text-slate-400">Real-time cooking copilot</p>
            </div>
          </Link>

          <div className="hidden items-center gap-2 lg:flex">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.to} className={linkClass} to={link.to}>
                {link.label}
              </NavLink>
            ))}
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            {user ? (
              <button onClick={onLogout} className="rounded-full bg-slate-800 px-4 py-2 text-sm text-slate-100 transition hover:bg-slate-700 active:scale-[0.98]">
                Logout
              </button>
            ) : (
              <button
                onClick={onLogin}
                title={authEnabled ? "Login with Google" : "Configure Firebase env vars to enable login"}
                disabled={!authEnabled}
                className="rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:brightness-100"
              >
                {authEnabled ? "Login" : "Login Unavailable"}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm text-slate-200 lg:hidden"
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>

        {open ? (
          <div className="mt-4 rounded-[1.6rem] border border-slate-800 bg-slate-900/90 p-4 lg:hidden">
            <div className="grid gap-2">
              {NAV_LINKS.map((link) => (
                <NavLink key={link.to} className={linkClass} to={link.to} onClick={() => setOpen(false)}>
                  {link.label}
                </NavLink>
              ))}
            </div>
            <div className="mt-4 border-t border-slate-800 pt-4">
              {user ? (
                <button onClick={onLogout} className="w-full rounded-full bg-slate-800 px-4 py-2 text-sm text-slate-100 transition hover:bg-slate-700 active:scale-[0.98]">
                  Logout
                </button>
              ) : (
                <button
                  onClick={onLogin}
                  title={authEnabled ? "Login with Google" : "Configure Firebase env vars to enable login"}
                  disabled={!authEnabled}
                  className="w-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:brightness-100"
                >
                  {authEnabled ? "Login" : "Login Unavailable"}
                </button>
              )}
            </div>
          </div>
        ) : null}
      </nav>
    </header>
  );
}
