import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import IngredientInput from "../components/IngredientInput";
import FoodImage from "../components/FoodImage";
import RecipeCard from "../components/RecipeCard";
import RecipeSearchBar from "../components/RecipeSearchBar";
import RecipeViewer from "../components/RecipeViewer";
import { useIngredients } from "../hooks/useIngredients";
import { useRecipes } from "../hooks/useRecipes";
import { foodFallbackIcon } from "../utils/helpers";

const cuisines = ["Indian", "Italian", "Chinese", "Mexican", "Thai"];
const indianRegions = ["Karnataka", "Kerala", "Tamil Nadu", "Andhra Pradesh", "Maharashtra", "Punjab"];
const timeOptions = [5, 10, 20, 30];
const popular = [
  {
    name: "pasta",
    image: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=1200&q=80",
  },  
  {
    name: "biryani",
    image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?q=80&w=1974&auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "grilled chicken",
    image: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "fried rice",
    image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "soup",
    image: "https://images.unsplash.com/photo-1665594051407-7385d281ad76?q=80&w=686&auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "paneer curry",
    image: "https://images.unsplash.com/photo-1701579231378-3726490a407b?q=80&w=687&auto=format&fit=crop&w=1200&q=80",
  },
];

export default function Home() {
  const { ingredients, addIngredient, removeIngredient, setIngredients } = useIngredients();
  const { recipes, setRecipes, loadRecipes, loading, error } = useRecipes();
  const [selectedRecipeId, setSelectedRecipeId] = useState(null);
  const [cuisine, setCuisine] = useState("Indian");
  const [regionalStyle, setRegionalStyle] = useState("Karnataka");
  const [maxTime, setMaxTime] = useState(20);
  const [language, setLanguage] = useState("English");
  const [instructionStyle, setInstructionStyle] = useState("Simple");
  const [leftoverInput, setLeftoverInput] = useState("");
  const [searchHint, setSearchHint] = useState("");

  const payload = useMemo(
    () => ({ ingredients, cuisine, regionalStyle: cuisine === "Indian" ? regionalStyle : null, maxTime, language, instructionStyle }),
    [ingredients, cuisine, regionalStyle, maxTime, language, instructionStyle]
  );

  useEffect(() => {
    setSelectedRecipeId(recipes.length ? (recipes[0].id || recipes[0].name) : null);
  }, [recipes]);

  const selectedRecipe = useMemo(
    () => recipes.find((recipe) => (recipe.id || recipe.name) === selectedRecipeId) || null,
    [recipes, selectedRecipeId]
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <Hero
        onStart={() => loadRecipes(payload, "generate")}
        onScan={() => window.scrollTo({ top: 560, behavior: "smooth" })}
      />

      <section className="mt-10">
        <IngredientInput ingredients={ingredients} addIngredient={addIngredient} removeIngredient={removeIngredient} setIngredients={setIngredients} />
      </section>

      <section className="mt-12">
        <SectionTitle title="AI Features" subtitle="Smart tools designed for fast, confident home cooking." />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { title: "Ingredient Intelligence", desc: "Turn random pantry items into complete, realistic recipes." },
            { title: "Hands-Free Cooking", desc: "Voice-first cooking assistant that guides step-by-step in real time." },
            { title: "Multi-Style Recipes", desc: "Get multiple regional and cuisine variations from one dish search." },
          ].map((item) => (
            <motion.div
              key={item.title}
              whileHover={{ y: -4 }}
              className="rounded-2xl border border-slate-700 bg-slate-800/80 p-5 shadow-lg shadow-black/20"
            >
              <h3 className="font-display text-lg text-slate-100">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-300">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <SectionTitle title="Recipe Discovery" subtitle="Search directly or generate from your ingredients." />
        <RecipeSearchBar
          cuisine={cuisine}
          regionalStyle={regionalStyle}
          onResults={(resultRecipes, didYouMean, searchText) => {
            setSearchHint(
              resultRecipes.length
                ? didYouMean
                  ? `Showing results for ${didYouMean}`
                  : `Showing results for ${searchText}`
                : "No recipes found for your search."
            );
            setRecipes(resultRecipes);
            setSelectedRecipeId(resultRecipes.length ? (resultRecipes[0].id || resultRecipes[0].name) : null);
          }}
        />
        {searchHint ? <p className="mt-2 text-center text-sm text-sky-300">{searchHint}</p> : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Picker label="Cuisine" options={cuisines} value={cuisine} setValue={setCuisine} />
          {cuisine === "Indian" ? <Picker label="Regional Style" options={indianRegions} value={regionalStyle} setValue={setRegionalStyle} /> : <div />}
          <Picker label="Cooking Time" options={timeOptions.map((v) => `${v} minutes`)} value={`${maxTime} minutes`} setValue={(v) => setMaxTime(Number(v.split(" ")[0]))} />
          <Picker label="Language" options={["English", "Kannada", "Hindi", "Tamil", "Telugu"]} value={language} setValue={setLanguage} />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto_auto]">
          <Picker label="Instruction Style" options={["Simple", "Standard"]} value={instructionStyle} setValue={setInstructionStyle} />
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => loadRecipes(payload, "generate")}
            className="rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 px-6 py-3 font-semibold text-slate-950 shadow-lg shadow-emerald-900/20 transition hover:brightness-110 disabled:opacity-50"
            disabled={ingredients.length === 0 || loading}
          >
            {loading ? "Generating..." : "Generate Recipes"}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => loadRecipes(payload, "surprise")}
            className="rounded-xl bg-gradient-to-r from-sky-400 to-sky-500 px-6 py-3 font-semibold text-slate-950 shadow-lg shadow-sky-900/20 transition hover:brightness-110"
          >
            Surprise Me
          </motion.button>
        </div>

        <div className="mt-4 rounded-3xl border border-slate-700 bg-slate-800/70 p-4 shadow-xl shadow-black/20">
          <h3 className="font-display text-lg text-slate-100">Leftover Saver</h3>
          <div className="mt-2 flex gap-2">
            <input
              value={leftoverInput}
              onChange={(e) => setLeftoverInput(e.target.value)}
              placeholder="e.g., rice, egg"
              className="flex-1 rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
            />
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                loadRecipes(
                  {
                    leftovers: leftoverInput
                      .split(",")
                      .map((v) => v.trim())
                      .filter(Boolean),
                    cuisine,
                    maxTime,
                  },
                  "leftover"
                );
              }}
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110"
            >
              Find Leftover Recipes
            </motion.button>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <SectionTitle title="Popular Recipes" subtitle="Trending dishes users are cooking right now." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {popular.map((item) => (
            <motion.div key={item.name} whileHover={{ y: -4 }} className="overflow-hidden rounded-3xl border border-slate-700 bg-slate-800/80">
              <img
                src={item.image}
                alt={item.name}
                className="h-40 w-full object-cover"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = foodFallbackIcon(800, 600);
                }}
              />
              <div className="p-4">
                <p className="font-display text-lg text-slate-100">{item.name.replace(/\b\w/g, (c) => c.toUpperCase())}</p>
                <p className="mt-1 text-sm text-slate-300">Community favorite • quick to make</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <SectionTitle title="How It Works" subtitle="Three simple steps to your next meal." />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            "Add ingredients manually or scan with camera.",
            "Generate or search recipes instantly.",
            "Cook with guided steps and voice assistant.",
          ].map((item, idx) => (
            <motion.div
              key={item}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.08 }}
              className="rounded-2xl border border-slate-700 bg-slate-800/80 p-5"
            >
              <p className="text-sm font-semibold text-emerald-300">Step {idx + 1}</p>
              <p className="mt-2 text-sm text-slate-300">{item}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <SectionTitle title="Recipes" subtitle="Choose a recipe card to open full instructions." />
        {loading ? (
          <div className="space-y-4">
            <p className="text-center text-sm text-sky-300">
              SmartChefAI is generating your recipes
              <span className="inline-block animate-pulse">...</span>
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <RecipeSkeleton key={idx} />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe, idx) => (
              <RecipeCard
                key={recipe.id || `${recipe.name}-${idx}`}
                recipe={recipe}
                cardIndex={idx}
                onSelect={(next) => setSelectedRecipeId(next.id || next.name)}
              />
            ))}
          </div>
        )}
        {error && <p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-900/20 p-3 text-sm text-rose-200">{error}</p>}
      </section>

      <section className="mt-10">
        <RecipeViewer key={selectedRecipe?.id || selectedRecipe?.name || "empty"} recipe={selectedRecipe} language={language} />
      </section>
    </main>
  );
}

function Hero({ onStart, onScan }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-700 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 shadow-2xl shadow-black/40">
      <div className="pointer-events-none absolute -right-12 -top-20 h-52 w-52 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-14 left-8 h-44 w-44 rounded-full bg-sky-500/20 blur-3xl" />
      <div className="grid items-center gap-8 lg:grid-cols-2">
        <div>
          <h1 className="font-display text-4xl leading-tight text-slate-100 md:text-5xl">Cook Amazing Dishes With What You Have</h1>
          <p className="mt-4 max-w-xl text-slate-300">
            SmartChefAI analyzes your ingredients and generates delicious recipes instantly.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <motion.button whileTap={{ scale: 0.98 }} onClick={onStart} className="rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 px-5 py-3 font-semibold text-slate-950 shadow-lg shadow-emerald-900/20">
              Start Cooking
            </motion.button>
            <motion.button whileTap={{ scale: 0.98 }} onClick={onScan} className="rounded-xl border border-sky-400/60 bg-slate-900 px-5 py-3 font-semibold text-sky-300">
              Scan My Fridge
            </motion.button>
          </div>
        </div>
        <div className="relative hidden min-h-[280px] lg:block">
          {[
            { q: "pasta bowl", cls: "left-4 top-2 w-44" },
            { q: "grilled chicken", cls: "right-10 top-10 w-52" },
            { q: "fresh salad", cls: "left-24 bottom-6 w-48" },
          ].map((item, idx) => (
            <motion.div
              key={item.q}
              className={`absolute rounded-2xl border border-slate-700 shadow-xl ${item.cls}`}
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3 + idx, repeat: Infinity, ease: "easeInOut" }}
            >
              <FoodImage
                query={item.q}
                seed={`hero-${idx}-${item.q}`}
                alt={item.q}
                className="h-36 w-full rounded-2xl object-cover"
                loading="lazy"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <div className="mb-4">
      <h2 className="font-display text-2xl text-slate-100">{title}</h2>
      <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
    </div>
  );
}

function RecipeSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-3xl border border-slate-700 bg-slate-800/80">
      <div className="h-36 w-full bg-slate-700" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-2/3 rounded bg-slate-700" />
        <div className="h-3 w-1/2 rounded bg-slate-700" />
        <div className="h-3 w-1/3 rounded bg-slate-700" />
      </div>
    </div>
  );
}

function Picker({ label, options, value, setValue }) {
  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-800/70 p-3 shadow-xl shadow-black/20">
      <label className="mb-2 block text-sm text-slate-300">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => setValue(option)}
            className={`rounded-lg px-3 py-2 text-sm transition ${
              value === option ? "bg-emerald-500 text-slate-950" : "bg-slate-900 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
