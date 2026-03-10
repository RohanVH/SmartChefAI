import { Link, NavLink } from "react-router-dom";

export default function Navbar({ user, onLogin, onLogout, authEnabled = true }) {
  const linkClass = ({ isActive }) =>
    `px-3 py-2 rounded-lg text-sm transition ${
      isActive ? "bg-emerald-500 text-slate-950 shadow-sm" : "text-slate-300 hover:bg-slate-700/80 hover:text-slate-100"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-700/70 bg-slate-900/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-semibold text-slate-100">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-sky-400 text-slate-950">S</span>
          SmartChefAI
        </Link>
        <div className="hidden items-center gap-2 md:flex">
          <NavLink className={linkClass} to="/">
            Home
          </NavLink>
          <NavLink className={linkClass} to="/recipes">
            Recipes
          </NavLink>
          <NavLink className={linkClass} to="/about">
            About
          </NavLink>
          <NavLink className={linkClass} to="/contact">
            Contact
          </NavLink>
        </div>
        <div>
          {user ? (
            <button onClick={onLogout} className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-100 transition hover:bg-slate-700">
              Logout
            </button>
          ) : (
            <button
              onClick={onLogin}
              title={authEnabled ? "Login with Google" : "Configure Firebase env vars to enable login"}
              className="rounded-lg bg-gradient-to-r from-sky-400 to-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:brightness-110 active:scale-[0.98]"
            >
              Login
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
