import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Home from "./pages/Home";
import Recipes from "./pages/Recipes";
import { authService } from "./services/authService";

export default function App() {
  const [user, setUser] = useState(null);
  const handleLogin = async () => {
    try {
      await authService.loginWithGoogle();
    } catch (error) {
      // eslint-disable-next-line no-alert
      alert(error.message || "Login failed");
    }
  };

  useEffect(() => {
    const unsub = authService.onAuthStateChanged(async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        const token = await nextUser.getIdToken();
        window.localStorage.setItem("smartchefai_token", token);
      }
    });
    return () => unsub();
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#0f172a_0%,_#0b1224_45%,_#020617_100%)] font-body text-slate-100">
        <Navbar user={user} onLogin={handleLogin} onLogout={authService.logout} authEnabled={authService.isConfigured} />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/recipes" element={<Recipes user={user} />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
