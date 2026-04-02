import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CuisineSelector from "../components/CuisineSelector";
import IngredientInput from "../components/IngredientInput";
import RecipeCard from "../components/RecipeCard";
import RecipeSearchBar from "../components/RecipeSearchBar";
import { SectionHeading } from "../components/SectionHeading";
import { useIngredients } from "../hooks/useIngredients";
import { useRecipes } from "../hooks/useRecipes";
import { recipeService } from "../services/recipeService";
import { getRecipeRouteId, saveActiveRecipe } from "../utils/recipeSession";

const CUISINES = [
  { value: "Indian", label: "Indian", icon: "🍛", description: "Regional masalas, layered gravies, and comfort-forward dishes." },
  { value: "Italian", label: "Italian", icon: "🍝", description: "Herb-heavy, balanced, and weeknight-friendly plates." },
  { value: "Chinese", label: "Chinese", icon: "🥢", description: "Fast wok cooking, aromatics, and savory finishes." },
  { value: "Mexican", label: "Mexican", icon: "🌮", description: "Bold spices, citrus lift, and skillet comfort." },
  { value: "Thai", label: "Thai", icon: "🥥", description: "Fragrant herbs, layered heat, and bright sauces." },
];

const HERO_SLIDES = [
  {
    title: "Real-time help while your pan is already hot",
    description: "Ask for substitutions, timing cues, and rescue guidance without losing your flow.",
    image: "https://www.themealdb.com/images/media/meals/utxqpt1511639216.jpg",
  },
  {
    title: "Turn ingredients into polished meal ideas",
    description: "Generate chef-like recipes with smart substitutions and guided cooking support.",
    image: "https://www.themealdb.com/images/media/meals/1520084413.jpg",
  },
  {
    title: "Cook with voice, visuals, and calm step guidance",
    description: "Move through each step with immersive cooking mode, video support, and an AI chef by your side.",
    image: "https://www.themealdb.com/images/media/meals/xqusqy1487348868.jpg",
  },
];

const INDIAN_REGIONS = ["Karnataka", "Kerala", "Tamil Nadu", "Andhra Pradesh", "Maharashtra", "Punjab"];
const TIME_OPTIONS = [10, 20, 30, 45, 60];
const DIFFICULTY_OPTIONS = ["Easy", "Balanced", "Challenging"];
const SPICE_OPTIONS = ["Mild", "Medium", "Hot"];
const DIET_OPTIONS = ["Flexible", "Vegetarian", "Non-Vegetarian", "Eggetarian"];
const SKILL_OPTIONS = ["Beginner", "Home Cook", "Advanced"];
const TOOL_OPTIONS = ["Kadai", "Pressure Cooker", "Oven", "Air Fryer", "Mixer", "Tawa"];

export default function Home() {
  const navigate = useNavigate();
  const { ingredients, addIngredient, removeIngredient, setIngredients } = useIngredients();
  const { recipes, setRecipes, loadRecipes, loading, error } = useRecipes();
  const [cuisine, setCuisine] = useState("Indian");
  const [regionalStyle, setRegionalStyle] = useState("Karnataka");
  const [maxTime, setMaxTime] = useState(20);
  const [language, setLanguage] = useState("English");
  const [instructionStyle, setInstructionStyle] = useState("Simple");
  const [difficultyPreference, setDifficultyPreference] = useState("Balanced");
  const [spiceLevel, setSpiceLevel] = useState("Medium");
  const [dietPreference, setDietPreference] = useState("Flexible");
  const [skillLevel, setSkillLevel] = useState("Home Cook");
  const [availableTools, setAvailableTools] = useState(["Kadai", "Tawa"]);
  const [leftoverInput, setLeftoverInput] = useState("");
  const [searchHint, setSearchHint] = useState("");
  const cookingSession = useMemo(() => recipeService.getCookingSession(), []);

  const payload = useMemo(
    () => ({
      ingredients,
      cuisine,
      regionalStyle: cuisine === "Indian" ? regionalStyle : null,
      maxTime,
      language,
      instructionStyle,
      difficultyPreference,
      spiceLevel,
      dietPreference,
      skillLevel,
      availableTools,
    }),
    [ingredients, cuisine, regionalStyle, maxTime, language, instructionStyle, difficultyPreference, spiceLevel, dietPreference, skillLevel, availableTools]
  );

  const openRecipe = (recipe) => {
    saveActiveRecipe(recipe);
    navigate(`/recipe/${getRecipeRouteId(recipe)}`, { state: { recipe } });
  };

  const resumeSession = () => {
    if (!cookingSession?.recipe) return;
    saveActiveRecipe(cookingSession.recipe);
    navigate(`/recipe/${getRecipeRouteId(cookingSession.recipe)}`, { state: { recipe: cookingSession.recipe } });
  };

  const toggleTool = (tool) => {
    setAvailableTools((prev) => prev.includes(tool) ? prev.filter((item) => item !== tool) : [...prev, tool]);
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:py-10">
      <Hero ingredientsCount={ingredients.length} onGenerate={() => loadRecipes(payload, "generate")} generating={loading} />

      {cookingSession?.recipe ? (
        <section className="mt-6 glass-panel rounded-[1.8rem] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-emerald-300">Resume Cooking</p>
              <p className="mt-2 text-sm text-slate-300">Pick up {cookingSession.recipe.name} from step {Number(cookingSession.stepIndex || 0) + 1}.</p>
            </div>
            <button type="button" onClick={resumeSession} className="rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 px-5 py-3 font-semibold text-slate-950 transition hover:brightness-110 active:scale-[0.98]">Resume Session</button>
          </div>
        </section>
      ) : null}

      <section className="mt-10">
        <IngredientInput ingredients={ingredients} addIngredient={addIngredient} removeIngredient={removeIngredient} setIngredients={setIngredients} />
      </section>

      <section className="mt-12 glass-panel hero-glow rounded-[2rem] p-5 md:p-6">
        <SectionHeading eyebrow="Cuisine Builder" title="Choose a cooking direction that matches your mood" subtitle="Select cuisine, timing, difficulty, spice profile, and tool setup before asking the AI chef to generate recipes." />
        <div className="mt-6"><CuisineSelector options={CUISINES} value={cuisine} onChange={setCuisine} /></div>
        <div className="mt-6 grid gap-4 lg:grid-cols-5">
          <Selector label="Regional Style" value={regionalStyle} onChange={setRegionalStyle} options={INDIAN_REGIONS} disabled={cuisine !== "Indian"} />
          <Selector label="Cook Time" value={String(maxTime)} onChange={(value) => setMaxTime(Number(value))} options={TIME_OPTIONS.map(String)} suffix=" min" />
          <Selector label="Difficulty" value={difficultyPreference} onChange={setDifficultyPreference} options={DIFFICULTY_OPTIONS} />
          <Selector label="Language" value={language} onChange={setLanguage} options={["English", "Hindi", "Kannada", "Tamil", "Telugu"]} />
          <Selector label="Instruction Style" value={instructionStyle} onChange={setInstructionStyle} options={["Simple", "Standard"]} />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Selector label="Spice Level" value={spiceLevel} onChange={setSpiceLevel} options={SPICE_OPTIONS} />
          <Selector label="Diet" value={dietPreference} onChange={setDietPreference} options={DIET_OPTIONS} />
          <Selector label="Skill Level" value={skillLevel} onChange={setSkillLevel} options={SKILL_OPTIONS} />
        </div>
        <div className="mt-4 rounded-[1.6rem] border border-slate-700 bg-slate-950/75 p-4">
          <p className="text-sm font-medium text-slate-200">Available tools</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {TOOL_OPTIONS.map((tool) => (
              <button
                key={tool}
                type="button"
                onClick={() => toggleTool(tool)}
                className={`rounded-full px-4 py-2 text-sm transition active:scale-[0.98] ${availableTools.includes(tool) ? "bg-emerald-500 text-slate-950" : "border border-slate-700 bg-slate-900 text-slate-200 hover:border-sky-400"}`}
              >
                {tool}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="rounded-[1.5rem] border border-slate-700 bg-slate-950/70 px-4 py-4 text-sm text-slate-300 xl:max-w-3xl">SmartChefAI will use your ingredients, cuisine profile, spice comfort, skill level, and available tools to generate 6 to 8 realistic recipes with guided steps, substitutions, and cooking support.</div>
          <div className="flex flex-wrap gap-3">
            <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={() => loadRecipes(payload, "generate")} className="rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 px-6 py-3 font-semibold text-slate-950 shadow-lg shadow-emerald-900/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60" disabled={!ingredients.length || loading}>{loading ? "Generating..." : "Generate Recipes"}</motion.button>
            <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={() => loadRecipes(payload, "surprise")} className="rounded-full bg-gradient-to-r from-sky-400 to-cyan-400 px-6 py-3 font-semibold text-slate-950 transition hover:brightness-110">Surprise Me</motion.button>
          </div>
        </div>
        <div className="mt-6 rounded-[1.7rem] border border-slate-700 bg-slate-950/75 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="lg:max-w-xs"><p className="font-display text-lg text-slate-100">Leftover Saver</p><p className="mt-1 text-sm text-slate-400">Turn leftovers into useful suggestions before anything goes to waste.</p></div>
            <input value={leftoverInput} onChange={(e) => setLeftoverInput(e.target.value)} placeholder="e.g. cooked rice, egg, spinach" className="min-w-0 flex-1 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 placeholder:text-slate-500" />
            <button type="button" onClick={() => loadRecipes({ leftovers: leftoverInput.split(",").map((v) => v.trim()).filter(Boolean), cuisine, maxTime, difficultyPreference, spiceLevel, dietPreference, skillLevel, availableTools }, "leftover")} className="rounded-full border border-sky-400/50 px-5 py-3 font-semibold text-sky-200 transition hover:bg-sky-500/10 active:scale-[0.98]">Find Leftover Recipes</button>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <RecipeSearchBar cuisine={cuisine} regionalStyle={regionalStyle} onResults={(resultRecipes, didYouMean, searchText) => { setSearchHint(resultRecipes.length ? didYouMean ? `Showing results for ${didYouMean}` : `Showing results for ${searchText}` : "No recipes found for your search."); setRecipes(resultRecipes); }} />
      </section>

      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading eyebrow="Recipe Results" title="Premium recipe recommendations, ready for guided cooking" subtitle="Open any card to view a rich recipe detail page with video guidance, AI assistance, and cooking mode." />
          {searchHint ? <p className="text-sm text-sky-300">{searchHint}</p> : null}
        </div>
        {error ? <p className="mt-5 rounded-[1.6rem] border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">{error}</p> : null}
        <div className="mt-6">
          {loading ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, idx) => <RecipeSkeleton key={idx} />)}</div> : recipes.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{recipes.map((recipe, idx) => <RecipeCard key={recipe.id || `${recipe.name}-${idx}`} recipe={recipe} cardIndex={idx} onOpen={openRecipe} />)}</div> : <EmptyState />}
        </div>
      </section>
    </main>
  );
}

function Hero({ ingredientsCount, onGenerate, generating }) {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="hero-glow glass-panel relative overflow-hidden rounded-[2.4rem] px-6 py-10 md:px-10 md:py-14">
      <div className="pointer-events-none absolute -right-20 top-[-3rem] h-64 w-64 rounded-full bg-emerald-500/18 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-4rem] left-[20%] h-72 w-72 rounded-full bg-sky-500/14 blur-3xl" />
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_1fr]">
        <div className="relative z-10">
          <p className="text-xs uppercase tracking-[0.34em] text-emerald-300">AI Kitchen Companion</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight text-gradient md:text-6xl">From pantry chaos to confident cooking, in real time.</h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">Generate chef-like recipes from the ingredients you already have, get contextual help while cooking, and follow step-guided video support that feels purpose-built for your kitchen.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button type="button" onClick={onGenerate} className="rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 px-6 py-3 font-semibold text-slate-950 transition hover:brightness-110 active:scale-[0.98]">{generating ? "Generating..." : "Start AI Cooking"}</button>
            <div className="rounded-full border border-slate-700 bg-slate-900/60 px-5 py-3 text-sm text-slate-200">{ingredientsCount} ingredient{ingredientsCount === 1 ? "" : "s"} ready</div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/60 shadow-[0_30px_80px_rgba(15,23,42,0.55)]">
          <div className="relative aspect-[4/3] overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div key={activeSlide} initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.6 }} className="absolute inset-0">
                <img src={HERO_SLIDES[activeSlide].image} alt={HERO_SLIDES[activeSlide].title} className="h-full w-full object-cover" loading="eager" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <p className="text-xs uppercase tracking-[0.28em] text-emerald-300">Featured Experience</p>
                  <h2 className="mt-3 max-w-lg font-display text-3xl leading-tight text-white">{HERO_SLIDES[activeSlide].title}</h2>
                  <p className="mt-3 max-w-md text-sm leading-6 text-slate-200">{HERO_SLIDES[activeSlide].description}</p>
                  <button type="button" onClick={onGenerate} className="mt-5 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/16 active:scale-[0.98]">Create Recipes Now</button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-white/10 bg-slate-950/80 px-5 py-4 backdrop-blur">
            <div className="flex gap-2">
              {HERO_SLIDES.map((slide, idx) => (
                <button key={slide.title} type="button" aria-label={`Go to slide ${idx + 1}`} onClick={() => setActiveSlide(idx)} className={`h-2.5 rounded-full transition ${activeSlide === idx ? "w-10 bg-emerald-400" : "w-2.5 bg-slate-600"}`} />
              ))}
            </div>
            {/* <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Auto-updating hero carousel</p> */}
          </div>
        </div>
      </div>
    </section>
  );
}

function Selector({ label, value, onChange, options, suffix = "", disabled = false }) {
  return <label className={`rounded-[1.5rem] border border-slate-700 bg-slate-950/70 p-4 ${disabled ? "opacity-60" : ""}`}><span className="mb-2 block text-sm font-medium text-slate-300">{label}</span><select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-slate-100">{options.map((option) => <option key={option} value={option}>{option}{suffix}</option>)}</select></label>;
}

function RecipeSkeleton() {
  return <div className="overflow-hidden rounded-[1.85rem] border border-slate-700 bg-slate-900/70"><div className="h-52 animate-pulse bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900" /><div className="space-y-3 p-5"><div className="h-5 w-2/3 animate-pulse rounded bg-slate-800" /><div className="h-4 w-full animate-pulse rounded bg-slate-800" /><div className="h-4 w-4/5 animate-pulse rounded bg-slate-800" /><div className="flex gap-2"><div className="h-8 w-24 animate-pulse rounded-full bg-slate-800" /><div className="h-8 w-24 animate-pulse rounded-full bg-slate-800" /></div></div></div>;
}

function EmptyState() {
  return <div className="glass-panel rounded-[2rem] px-6 py-10 text-center"><p className="text-xs uppercase tracking-[0.32em] text-sky-300">Awaiting Recipes</p><h3 className="mt-3 font-display text-3xl text-slate-100">Your next dish starts here</h3><p className="mx-auto mt-3 max-w-2xl text-slate-300">Add ingredients, scan your kitchen, or search for a dish to generate a curated set of AI-assisted cooking ideas.</p></div>;
}
