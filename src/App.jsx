import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import { authService } from "./services/authService";

const Home = lazy(() => import("./pages/Home"));
const Recipes = lazy(() => import("./pages/Recipes"));
const RecipeDetail = lazy(() => import("./pages/RecipeDetail"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));

function RouteFallback() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="glass-panel hero-glow rounded-[2rem] p-8">
        <div className="h-5 w-40 animate-pulse rounded bg-slate-800" />
        <div className="mt-4 h-10 w-2/3 animate-pulse rounded bg-slate-800" />
        <div className="mt-6 h-28 animate-pulse rounded-[1.5rem] bg-slate-900" />
      </div>
    </main>
  );
}

function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[8%] top-[10%] h-64 w-64 rounded-full bg-emerald-500/12 blur-3xl" />
        <div className="absolute right-[12%] top-[18%] h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute bottom-[-4rem] left-[34%] h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel hero-glow relative rounded-[2rem] px-10 py-9 text-center">
        <p className="text-xs uppercase tracking-[0.34em] text-emerald-300">SmartChefAI</p>
        <h1 className="mt-3 font-display text-4xl text-slate-100">Warming up your kitchen assistant</h1>
        <div className="mt-6 flex items-end justify-center gap-2">{Array.from({ length: 5 }).map((_, idx) => <motion.span key={idx} className="inline-block w-2 rounded-full bg-emerald-400" animate={{ height: [8, 26, 10] }} transition={{ duration: 0.8, repeat: Infinity, delay: idx * 0.08 }} />)}</div>
      </motion.div>
    </div>
  );
}

function AppLayout({ user, onLogin }) {
  const location = useLocation();
  const routes = useMemo(() => ({ user, onLogin }), [user, onLogin]);

  return (
    <div className="min-h-screen text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[6%] top-0 h-64 w-64 rounded-full bg-emerald-500/14 blur-3xl" />
        <div className="absolute right-[10%] top-[12%] h-72 w-72 rounded-full bg-sky-500/12 blur-3xl" />
        <div className="absolute bottom-[-4rem] left-[32%] h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <Navbar user={user} onLogin={onLogin} onLogout={authService.logout} authEnabled={authService.isConfigured} />

      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
        >
          <Suspense fallback={<RouteFallback />}>
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/recipes" element={<Recipes user={routes.user} />} />
              <Route path="/recipe/:recipeId" element={<RecipeDetail />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
            </Routes>
          </Suspense>
        </motion.div>
      </AnimatePresence>

      <Footer />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [appReady, setAppReady] = useState(false);

  const handleLogin = async () => {
    try {
      await authService.loginWithGoogle();
    } catch (error) {
      // eslint-disable-next-line no-alert
      alert(error.message || "Login failed");
    }
  };

  useEffect(() => {
    let mounted = true;
    const splashTimer = window.setTimeout(() => {
      if (mounted) setAppReady(true);
    }, 650);

    const unsub = authService.onAuthStateChanged(async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        const token = await nextUser.getIdToken();
        window.localStorage.setItem("smartchefai_token", token);
      } else {
        window.localStorage.removeItem("smartchefai_token");
      }
      if (mounted) setAppReady(true);
    });

    return () => {
      mounted = false;
      window.clearTimeout(splashTimer);
      unsub();
    };
  }, []);

  return (
    <BrowserRouter>
      {!appReady ? <SplashScreen /> : null}
      <AppLayout user={user} onLogin={handleLogin} />
    </BrowserRouter>
  );
}
