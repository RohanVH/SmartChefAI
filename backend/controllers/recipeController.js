import { generateRecipes } from "../services/aiService.js";
import { findRecipeVideo } from "../services/videoService.js";
import { db } from "../utils/firebaseAdmin.js";

const NON_CHOPPABLE = [
  "rice",
  "curd",
  "yogurt",
  "oil",
  "milk",
  "water",
  "ghee",
  "turmeric",
  "chili powder",
  "coriander powder",
  "garam masala",
  "salt",
];
const MIN_STEPS = 8;
const MAX_STEPS = 12;
const MIN_RECIPES = 6;
const MAX_RECIPES = 8;
const DISH_CATALOG = [
  "Chicken Biryani",
  "Chicken Fry",
  "Chicken Curry",
  "Chicken Kebab",
  "Chicken Masala",
  "Lemon Chicken",
  "Curd Chicken Roast",
  "Paneer Butter Masala",
  "Paneer Tikka",
  "Veg Biryani",
  "Mutton Curry",
  "Fish Fry",
  "Egg Curry",
  "Veg Pulao",
  "Tomato Rice",
  "Curd Rice",
  "Dal Tadka",
  "Sambar",
  "Rasam",
  "Aloo Gobi",
];
const DISH_QUERY_ALIASES = new Map([
  ["biriyani", "biryani"],
  ["briyani", "biryani"],
  ["biryani", "biryani"],
  ["chiken", "chicken"],
  ["chikn", "chicken"],
  ["panir", "paneer"],
  ["panner", "paneer"],
  ["pulav", "pulao"],
  ["pulaav", "pulao"],
  ["curdrice", "curd rice"],
  ["friedrice", "fried rice"],
  ["chicken65", "chicken 65"],
]);

function normalizeDishQuery(value = "") {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return "";

  const compact = normalized.replace(/\s+/g, "");
  return DISH_QUERY_ALIASES.get(compact) || DISH_QUERY_ALIASES.get(normalized) || normalized;
}

function normalizeIngredientName(name = "") {
  return name.trim().toLowerCase();
}

function hasIngredient(ingredients, target) {
  return ingredients.some((item) => normalizeIngredientName(item).includes(target));
}

function normalizeIngredientsList(ingredients = []) {
  return ingredients
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function uniqueByName(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    const key = normalizeIngredientName(item.name || item.recipeName || "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function classifyIngredient(name = "") {
  const n = normalizeIngredientName(name);
  if (/(chicken|fish|prawn|egg|mutton|paneer|tofu|rajma|lentil|chickpea)/.test(n)) return "protein";
  if (/(rice|pasta|noodle|flour|maida|oats|poha|semolina|bread)/.test(n)) return "starch";
  if (/(onion|tomato|ginger|garlic|chili|capsicum|lemon|lime|coriander|mint)/.test(n)) return "aromatic";
  return "produce";
}

function pickFocusIngredients(ingredients = []) {
  const normalized = normalizeIngredientsList(ingredients);
  const proteins = normalized.filter((item) => classifyIngredient(item) === "protein");
  const starches = normalized.filter((item) => classifyIngredient(item) === "starch");
  const aromatics = normalized.filter((item) => classifyIngredient(item) === "aromatic");
  const produce = normalized.filter((item) => classifyIngredient(item) === "produce");
  const primary = proteins[0] || starches[0] || produce[0] || "Vegetable";
  const secondary = aromatics[0] || proteins[1] || starches[1] || produce[1] || normalized[1] || "Onion";
  const tertiary = aromatics[1] || produce[2] || normalized[2] || "Lemon";
  return { primary, secondary, tertiary };
}

function levenshtein(a = "", b = "") {
  const s = a.toLowerCase();
  const t = b.toLowerCase();
  const dp = Array.from({ length: s.length + 1 }, () => Array(t.length + 1).fill(0));
  for (let i = 0; i <= s.length; i += 1) dp[i][0] = i;
  for (let j = 0; j <= t.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= s.length; i += 1) {
    for (let j = 1; j <= t.length; j += 1) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[s.length][t.length];
}

function bestDishMatch(query = "") {
  const q = normalizeDishQuery(query);
  if (!q) return null;
  const direct = DISH_CATALOG.filter((dish) => normalizeDishQuery(dish).includes(q));
  if (direct.length) return { best: direct[0], suggestions: direct.slice(0, 8), didYouMean: null };

  const ranked = DISH_CATALOG
    .map((dish) => ({ dish, score: levenshtein(q, normalizeDishQuery(dish)) }))
    .sort((a, b) => a.score - b.score);
  const best = ranked[0]?.dish || null;
  const didYouMean = ranked[0]?.score <= Math.max(2, Math.floor(q.length / 4)) ? best : null;
  return {
    best,
    suggestions: ranked.slice(0, 8).map((v) => v.dish),
    didYouMean,
  };
}

function dishToIngredients(dish = "") {
  const tokenMap = {
    chicken: "Chicken",
    mutton: "Mutton",
    fish: "Fish",
    egg: "Egg",
    paneer: "Paneer",
    biryani: "Rice",
    pulao: "Rice",
    rice: "Rice",
    lemon: "Lemon",
    curd: "Curd",
    masala: "Onion",
    dal: "Lentils",
    sambar: "Lentils",
    rasam: "Tomato",
    veg: "Mixed Vegetables",
  };
  const found = Object.entries(tokenMap)
    .filter(([token]) => dish.toLowerCase().includes(token))
    .map(([, ingredient]) => ingredient);
  return [...new Set([...found, "Onion", "Tomato", "Garlic", "Ginger"])].slice(0, 8);
}

function validateDishFeasibility(ingredients) {
  const names = (ingredients || []).map(normalizeIngredientName);
  if (!names.length) {
    return { valid: false, message: "No suitable recipe can be prepared with these ingredients." };
  }

  if (names.length <= 2 && hasIngredient(names, "rice") && (hasIngredient(names, "curd") || hasIngredient(names, "yogurt"))) {
    return { valid: false, suggestedDish: "Curd Rice", message: "No suitable recipe can be prepared with these ingredients. Suggested dish: Curd Rice." };
  }

  return { valid: true };
}

function cleanImpossibleActions(text = "", ingredientHint = "") {
  let cleaned = text;
  const lowerIngredient = ingredientHint.toLowerCase();
  const shouldAvoidChop = NON_CHOPPABLE.some((item) => lowerIngredient.includes(item));
  if (shouldAvoidChop) {
    cleaned = cleaned
      .replace(/\bchop(ped|ping)?\b/gi, "prepare")
      .replace(/\bslice(d|ing)?\b/gi, "measure and add");
  }
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleaned;
}

function sentenceCount(text = "") {
  return text
    .split(/[.!?]+/)
    .map((v) => v.trim())
    .filter(Boolean).length;
}

function ensureDetailedInstruction(text = "", ingredientHint = "", timeHint = "4-6 minutes", heatLevel = "Medium", lookFor = "Aromatic and properly cooked texture") {
  const cleaned = cleanImpossibleActions(text, ingredientHint);
  if (sentenceCount(cleaned) >= 2) return cleaned;
  const base = cleaned || `Cook ${ingredientHint || "the ingredients"} carefully.`;
  return `${base} Maintain ${heatLevel.toLowerCase()} heat for about ${timeHint}. Watch for this cue: ${lookFor}.`;
}

function normalizeHeatLevel(value = "") {
  const v = value.toLowerCase();
  if (v.includes("high")) return "High";
  if (v.includes("low") && v.includes("medium")) return "Low-Medium";
  if (v.includes("medium") && v.includes("high")) return "Medium-High";
  if (v.includes("low")) return "Low";
  return "Medium";
}

function canonicalizeStep(step, idx) {
  const ingredientText = step.ingredient || step.ingredients || "mixed ingredients";
  const time = step.time || "4-6 minutes";
  const heatLevel = normalizeHeatLevel(step.heatLevel || "Medium");
  const lookFor = step.lookFor || "Aromatic and properly cooked texture";
  const instruction = ensureDetailedInstruction(step.text || step.instruction || "", ingredientText, time, heatLevel, lookFor);
  return {
    stepNumber: Number(step.stepNumber) || idx + 1,
    title: step.title || `Step ${idx + 1}`,
    ingredients: ingredientText,
    ingredient: ingredientText,
    instruction,
    text: instruction,
    time,
    heatLevel,
    lookFor,
  };
}

function prepActionForIngredient(name = "") {
  const n = normalizeIngredientName(name);
  if (!n) return "prepare";
  if (NON_CHOPPABLE.some((item) => n.includes(item))) {
    if (n.includes("rice")) return "cook and cool";
    if (n.includes("curd") || n.includes("yogurt")) return "whisk";
    if (n.includes("milk") || n.includes("oil") || n.includes("water") || n.includes("ghee")) return "measure";
    return "measure";
  }
  if (n.includes("tomato")) return "dice";
  if (n.includes("onion")) return "slice";
  return "chop";
}

function inferQuantity(name = "", index = 0) {
  const n = normalizeIngredientName(name);
  if (/(chicken|mutton|fish|prawn|paneer|tofu)/.test(n)) return "250 grams";
  if (/(rice|pasta|noodle|lentil|rajma|chickpea)/.test(n)) return "1 cup";
  if (/(onion|tomato|potato|carrot|capsicum|cabbage|cauliflower|broccoli|beetroot|cucumber|mushroom)/.test(n)) return "1 cup chopped";
  if (/(ginger|garlic)/.test(n)) return "1 tablespoon";
  if (/(lemon|lime)/.test(n)) return "1 piece";
  if (/(curd|yogurt|milk)/.test(n)) return "1/2 cup";
  if (/(oil|ghee|butter)/.test(n)) return "2 tablespoons";
  if (/(salt)/.test(n)) return "3/4 teaspoon";
  if (/(turmeric|chili|coriander powder|garam masala|cumin|mustard)/.test(n)) return "1 teaspoon";
  return index % 2 === 0 ? "1 cup" : "2 tablespoons";
}

function addPantryMeasuredIngredients(list = []) {
  const pantryMeasured = [
    { name: "Oil", quantity: "2 tablespoons" },
    { name: "Salt", quantity: "3/4 teaspoon (or to taste)" },
    { name: "Water", quantity: "1/2 cup" },
    { name: "Turmeric powder", quantity: "1/2 teaspoon" },
    { name: "Red chili powder", quantity: "1 teaspoon" },
    { name: "Coriander powder", quantity: "1 teaspoon" },
    { name: "Garam masala", quantity: "1/2 teaspoon" },
  ];
  const merged = [...list];
  for (const item of pantryMeasured) {
    if (!merged.some((v) => normalizeIngredientName(v.name) === normalizeIngredientName(item.name))) {
      merged.push(item);
    }
  }
  return merged;
}

function buildMeasuredIngredientList(ingredients = []) {
  const measured = normalizeIngredientsList(ingredients).map((name, idx) => ({
    name,
    quantity: inferQuantity(name, idx),
  }));
  return addPantryMeasuredIngredients(measured);
}

function buildCuisineProfiles(cuisine, ingredientSet, maxTime) {
  const { primary, secondary, tertiary } = ingredientSet;
  const shortTime = Math.min(10, maxTime);
  const midTime = Math.min(20, Math.max(15, maxTime));
  const fullTime = Math.max(20, maxTime);
  const fastTime = Math.min(15, Math.max(8, maxTime));

  const map = {
    Indian: [
      { name: `${primary} ${secondary} Masala`, method: "tempered spice saute", time: fullTime, difficulty: "Easy" },
      { name: `${tertiary} ${primary} Fry`, method: "high-heat tawa roast", time: shortTime, difficulty: "Easy" },
      { name: `${primary} Curd Roast`, method: "yogurt-based pan roast", time: midTime, difficulty: "Medium" },
      { name: `${primary} Home Curry`, method: "slow masala simmer", time: fullTime, difficulty: "Medium" },
      { name: `${secondary} ${primary} Pepper Toss`, method: "quick kadai toss", time: fastTime, difficulty: "Easy" },
      { name: `${primary} Regional Style Saute`, method: "regional spice saute", time: midTime, difficulty: "Medium" },
      { name: `${primary} One-Pan Gravy`, method: "one-pan gravy reduction", time: fullTime, difficulty: "Medium" },
      { name: `${tertiary} ${primary} Finish`, method: "final citrus glaze finish", time: shortTime, difficulty: "Easy" },
    ],
    Italian: [
      { name: `${primary} Herb Saute`, method: "garlic-herb pan toss", time: fullTime, difficulty: "Medium" },
      { name: `${primary} ${secondary} Skillet`, method: "olive-oil skillet saute", time: shortTime, difficulty: "Easy" },
      { name: `${primary} Rustic ${tertiary}`, method: "slow reduction", time: midTime, difficulty: "Easy" },
      { name: `${primary} Pan Roast`, method: "hot pan roast", time: fastTime, difficulty: "Easy" },
      { name: `${secondary} ${primary} Bowl`, method: "stovetop bowl finish", time: shortTime, difficulty: "Easy" },
      { name: `${primary} Weeknight Plate`, method: "one-pan weeknight cook", time: midTime, difficulty: "Medium" },
      { name: `${primary} Savory Toss`, method: "fast toss and glaze", time: shortTime, difficulty: "Easy" },
      { name: `${tertiary} Zest ${primary}`, method: "zesty skillet finish", time: shortTime, difficulty: "Easy" },
    ],
    Chinese: [
      { name: `${primary} Soy Stir Fry`, method: "wok toss", time: shortTime, difficulty: "Easy" },
      { name: `${primary} ${secondary} Wok Bowl`, method: "high-heat wok technique", time: midTime, difficulty: "Medium" },
      { name: `${tertiary} Garlic ${primary}`, method: "garlic wok sear", time: fastTime, difficulty: "Easy" },
      { name: `${primary} Quick Pepper Toss`, method: "pepper wok toss", time: shortTime, difficulty: "Easy" },
      { name: `${primary} One-Wok Meal`, method: "single wok build", time: fullTime, difficulty: "Medium" },
      { name: `${secondary} ${primary} Stir`, method: "aromatic stir", time: shortTime, difficulty: "Easy" },
      { name: `${primary} Savory Finish`, method: "sauce reduction finish", time: midTime, difficulty: "Medium" },
      { name: `${tertiary} Crispy ${primary}`, method: "high-heat crisp", time: shortTime, difficulty: "Easy" },
    ],
    Mexican: [
      { name: `${primary} Taco Skillet`, method: "spiced skillet cook", time: midTime, difficulty: "Easy" },
      { name: `${primary} Fiesta Bowl`, method: "quick saute and finish", time: shortTime, difficulty: "Easy" },
      { name: `${secondary} ${primary} Plate`, method: "gentle simmer", time: fullTime, difficulty: "Medium" },
      { name: `${tertiary} Lime ${primary}`, method: "zesty pan finish", time: shortTime, difficulty: "Easy" },
      { name: `${primary} Street-Style Saute`, method: "street-style sear", time: fastTime, difficulty: "Easy" },
      { name: `${primary} Smoky Mix`, method: "smoky skillet cook", time: midTime, difficulty: "Medium" },
      { name: `${secondary} Pepper ${primary}`, method: "pepper saute", time: shortTime, difficulty: "Easy" },
      { name: `${primary} Family Bowl`, method: "comfort pan simmer", time: fullTime, difficulty: "Medium" },
    ],
    Thai: [
      { name: `${primary} Basil Stir Fry`, method: "hot wok basil toss", time: shortTime, difficulty: "Easy" },
      { name: `${primary} Coconut-Style Curry`, method: "aromatic simmer", time: fullTime, difficulty: "Medium" },
      { name: `${secondary} ${primary} Bowl`, method: "sweet-spicy pan reduction", time: midTime, difficulty: "Easy" },
      { name: `${tertiary} Zing ${primary}`, method: "citrus wok finish", time: shortTime, difficulty: "Easy" },
      { name: `${primary} Quick Pan Curry`, method: "quick curry method", time: fastTime, difficulty: "Medium" },
      { name: `${primary} Weeknight Toss`, method: "rapid wok toss", time: shortTime, difficulty: "Easy" },
      { name: `${secondary} Aromatic ${primary}`, method: "fragrant pan reduction", time: midTime, difficulty: "Medium" },
      { name: `${primary} Home Stir`, method: "home-style stir", time: shortTime, difficulty: "Easy" },
    ],
  };

  return map[cuisine] || [
    { name: `${primary} ${secondary} Stir Fry`, method: "quick skillet saute", time: shortTime, difficulty: "Easy" },
    { name: `${primary} ${tertiary} Bowl`, method: "one-pan toss", time: midTime, difficulty: "Easy" },
    { name: `${primary} Home Curry`, method: "slow simmer", time: fullTime, difficulty: "Medium" },
    { name: `${secondary} ${primary} Saute`, method: "fast saute", time: fastTime, difficulty: "Easy" },
    { name: `${tertiary} Glazed ${primary}`, method: "glaze finish", time: shortTime, difficulty: "Easy" },
    { name: `${primary} Family Pan`, method: "family-style pan cook", time: midTime, difficulty: "Medium" },
    { name: `${primary} Rustic Cook`, method: "rustic simmer", time: fullTime, difficulty: "Medium" },
    { name: `${primary} Express Toss`, method: "express toss", time: shortTime, difficulty: "Easy" },
  ];
}

function buildSteps(entry, ingredients, primary, secondary) {
  const all = ingredients.length ? ingredients.join(", ") : "vegetables";
  const primaryPrep = prepActionForIngredient(primary);
  const secondaryPrep = prepActionForIngredient(secondary);
  const hasOnion = hasIngredient(ingredients, "onion");
  const aromatic = hasOnion ? "onion" : (hasIngredient(ingredients, "ginger") ? "ginger" : "available aromatics");
  return [
    {
      title: "Prep Ingredients",
      text: `Wash ${all} thoroughly. ${primaryPrep[0].toUpperCase() + primaryPrep.slice(1)} ${primary} and ${secondaryPrep} ${secondary} as needed, then measure all spices before turning on the stove.`,
      ingredient: primary,
      time: "8-10 minutes",
      heatLevel: "Low",
      lookFor: "Ingredients uniformly cut and prep complete",
    },
    {
      title: "Measure and Organize",
      text: `Measure salt, spice powders, and oil into small bowls before heating the pan. Keep ${primary} and ${secondary} within reach so you can cook without delays.`,
      ingredient: "salt, spices, oil",
      time: "2-3 minutes",
      heatLevel: "Low",
      lookFor: "All ingredients are portioned and ready near the stove",
    },
    {
      title: "Heat Oil and Temper",
      text: "Heat 2 tablespoons oil on medium flame. Add 1 teaspoon cumin seeds and let them crackle for 20-30 seconds until aromatic.",
      ingredient: "oil, cumin seeds",
      time: "1-2 minutes",
      heatLevel: "Medium",
      lookFor: "Cumin crackles and aroma rises",
    },
    {
      title: "Saute Aromatics",
      text: `Add 1 cup ${aromatic} and cook on medium flame for 3-5 minutes until aromatic. Add 1/2 cup ${secondary} and cook 2 more minutes so the base absorbs flavor.`,
      ingredient: `1 cup ${aromatic}, 1/2 cup ${secondary}`,
      time: "6-7 minutes",
      heatLevel: "Medium",
      lookFor: "Onion turns light golden and smells sweet",
    },
    {
      title: "Add Spices",
      text: "Add 1/2 teaspoon turmeric, 1 teaspoon chili powder, and 1 teaspoon coriander powder. Mix continuously for 1-2 minutes on low flame so spices do not burn.",
      ingredient: "turmeric, chili powder, coriander powder",
      time: "1-2 minutes",
      heatLevel: "Low",
      lookFor: "Spices smell roasted without darkening",
    },
    {
      title: "Add Moisture",
      text: `Add 1/4 to 1/2 cup water and stir well to lift browned bits from the pan. Simmer on medium-low heat for 2-3 minutes so the masala becomes smooth and coats ${primary}.`,
      ingredient: "water",
      time: "2-3 minutes",
      heatLevel: "Low-Medium",
      lookFor: "Masala becomes glossy and no dry spice pockets remain",
    },
    {
      title: "Main Cooking",
      text: `Add 250 grams ${primary} and remaining ingredients, then cook using ${entry.method} on medium flame for 6-8 minutes. Stir every minute until color deepens and aroma becomes rich.`,
      ingredient: `250 grams ${primary}`,
      time: "6-8 minutes",
      heatLevel: "Medium",
      lookFor: "Mixture thickens and oil lightly separates",
    },
    {
      title: "Finish and Rest",
      text: "Adjust salt, add 1/2 teaspoon garam masala, and cook 1 minute on low flame. Turn off heat and rest for 2 minutes before serving.",
      ingredient: primary,
      time: "3 minutes",
      heatLevel: "Low",
      lookFor: "Balanced flavor and glossy finish",
    },
    {
      title: "Final Taste Check",
      text: `Taste a spoonful and adjust salt or spice with small pinches only. Stir for 30-60 seconds on low heat to integrate adjustments before plating.`,
      ingredient: "salt, spice mix",
      time: "1-2 minutes",
      heatLevel: "Low",
      lookFor: "Flavor is balanced without raw spice taste",
    },
    {
      title: "Serve",
      text: "Transfer to a serving bowl and garnish with fresh coriander and lemon juice if needed. Serve immediately while hot for best flavor.",
      ingredient: "coriander, lemon",
      time: "1 minute",
      heatLevel: "Low",
      lookFor: "Fresh garnish and steaming hot finish",
    },
  ];
}

function buildCurdRiceRecipe(params) {
  return {
    id: `curd-rice-${Date.now()}`,
    name: "Curd Rice",
    description: "Comforting South Indian style curd rice from simple ingredients.",
    cuisine: params.cuisine || "Indian",
    regionalStyle: params.regionalStyle || "South Indian",
    cookTimeMinutes: 15,
    difficulty: "Easy",
    imagePrompt: "Curd Rice homemade",
    nutrition: { calories: 280, protein: 9, carbs: 44, fat: 8 },
    ingredients: [
      { name: "Cooked rice", quantity: "2 cups" },
      { name: "Curd (yogurt)", quantity: "1.5 cups" },
      { name: "Milk", quantity: "1/4 cup (optional)" },
      { name: "Salt", quantity: "3/4 teaspoon" },
      { name: "Oil or ghee", quantity: "1 tablespoon" },
      { name: "Mustard seeds", quantity: "1/2 teaspoon" },
      { name: "Cumin seeds", quantity: "1/2 teaspoon" },
      { name: "Curry leaves", quantity: "8-10 leaves" },
      { name: "Green chili", quantity: "1 finely chopped (optional)" },
    ],
    steps: [
      {
        title: "Prepare Base",
        ingredient: "Cooked rice",
        text: "Use 2 cups cooked rice that is soft and slightly cooled. Mash lightly with the back of a spoon so curd mixes evenly.",
        time: "2-3 minutes",
        heatLevel: "Low",
        lookFor: "Rice should be soft but not pasty",
      },
      {
        title: "Set Rice Texture",
        ingredient: "Cooked rice, water",
        text: "If rice is too thick, sprinkle 2-3 tablespoons water and mix gently. Keep texture soft so the curd can coat each grain evenly.",
        time: "1 minute",
        heatLevel: "Low",
        lookFor: "Rice loosens but still holds shape",
      },
      {
        title: "Whisk Curd",
        ingredient: "Curd",
        text: "Whisk 1.5 cups curd until smooth with no lumps. Add 1/4 cup milk if you want a creamier texture and mix well.",
        time: "1-2 minutes",
        heatLevel: "Low",
        lookFor: "Smooth creamy curd mixture",
      },
      {
        title: "Combine Rice and Curd",
        ingredient: "Rice, curd, salt",
        text: "Add whisked curd to the rice and mix gently. Add 3/4 teaspoon salt and combine until every grain is coated.",
        time: "2 minutes",
        heatLevel: "Low",
        lookFor: "Rice looks creamy and evenly mixed",
      },
      {
        title: "Prepare Tempering",
        ingredient: "Oil, mustard, cumin",
        text: "Heat 1 tablespoon oil or ghee in a small pan on medium flame. Add mustard seeds and cumin seeds; let them crackle for 20-30 seconds.",
        time: "1 minute",
        heatLevel: "Medium",
        lookFor: "Seeds crackle and aroma rises",
      },
      {
        title: "Add Aromatics",
        ingredient: "Curry leaves, green chili",
        text: "Add curry leaves and chopped green chili to the tempering. Saute for 30-40 seconds until fragrant.",
        time: "1 minute",
        heatLevel: "Medium",
        lookFor: "Curry leaves crisp and aromatic",
      },
      {
        title: "Finish Curd Rice",
        ingredient: "Tempering and curd-rice mixture",
        text: "Pour hot tempering over curd rice and mix immediately. Taste and adjust salt; add 1-2 tablespoons water if too thick.",
        time: "1-2 minutes",
        heatLevel: "Low",
        lookFor: "Tempering evenly distributed",
      },
      {
        title: "Balance Flavor",
        ingredient: "Curd rice, salt",
        text: "Taste and add a pinch of salt if required after resting for 1 minute. Mix gently so the rice remains creamy and not broken.",
        time: "1-2 minutes",
        heatLevel: "Low",
        lookFor: "Mild tang and balanced saltiness",
      },
      {
        title: "Rest and Serve",
        ingredient: "Curd rice",
        text: "Rest for 3 minutes so flavors settle. Serve at room temperature or slightly chilled.",
        time: "3 minutes",
        heatLevel: "Low",
        lookFor: "Creamy, mildly tangy finish",
      },
    ].map((step, idx) => canonicalizeStep(step, idx)),
    summary: "Your Curd Rice is ready. Serve with pickle or papad.",
    substitutions: {
      curd: ["Greek yogurt", "plain yogurt"],
    },
  };
}

function scoreRecipe(recipe, params) {
  const selected = normalizeIngredientsList(params.ingredients).map(normalizeIngredientName);
  const ingredientNames = (recipe.ingredients || []).map((it) => normalizeIngredientName(it.name || it));
  const matchCount = selected.reduce(
    (acc, item) => (ingredientNames.some((name) => name.includes(item) || item.includes(name)) ? acc + 1 : acc),
    0
  );
  const ingredientScore = selected.length ? matchCount / selected.length : 0;
  const cuisineScore = recipe.cuisine === (params.cuisine || "Global") ? 1 : 0.2;
  const difficultyMap = { Easy: 1, Medium: 0.7, Hard: 0.4 };
  const difficultyScore = difficultyMap[recipe.difficulty] || 0.7;
  return ingredientScore * 0.6 + cuisineScore * 0.25 + difficultyScore * 0.15;
}

function withFallbackRecipes(params) {
  const ingredients = normalizeIngredientsList(params.ingredients);
  const ingredientSet = pickFocusIngredients(ingredients);
  const { primary, secondary } = ingredientSet;
  const cuisine = params.cuisine || "Global";
  const regionalStyle = params.regionalStyle || null;
  const maxTime = Number(params.maxTime) || 20;
  const profiles = buildCuisineProfiles(cuisine, ingredientSet, maxTime);
  const ordered = params.surprise ? [...profiles].sort(() => Math.random() - 0.5) : profiles;

  return {
    recipes: ordered.slice(0, MAX_RECIPES).map((entry, idx) => ({
      id: `fallback-${Date.now()}-${idx}`,
      name: entry.name,
      description: `Home-style ${cuisine} recipe prepared with ${entry.method}.`,
      cuisine,
      regionalStyle,
      cookTimeMinutes: entry.time,
      difficulty: entry.difficulty,
      imagePrompt: `${entry.name} homemade`,
      nutrition: { calories: 320 + idx * 25, protein: 12 + idx, carbs: 35 + idx * 2, fat: 14 + idx },
      ingredients: buildMeasuredIngredientList(ingredients),
      steps: buildSteps(entry, ingredients, primary, secondary),
      summary: `Your ${cuisine}${regionalStyle ? ` - ${regionalStyle}` : ""} style ${entry.name} is ready. Serve hot.`,
      substitutions: {
        onion: ["shallots", "leek"],
        garlic: ["ginger", "garlic powder"],
      },
    })).map((recipe) => ({
      ...recipe,
      steps: (recipe.steps || []).map((step, idx) => canonicalizeStep(step, idx)),
    })).sort((a, b) => scoreRecipe(b, params) - scoreRecipe(a, params)),
  };
}

function sanitizeRecipes(recipes, params) {
  const fallback = withFallbackRecipes(params).recipes;
  const normalizedInput = Array.isArray(recipes) ? recipes : [];
  const sanitized = normalizedInput.map((recipe, index) => {
    const f = fallback[index % fallback.length];
    return {
      id: recipe.id || `ai-${Date.now()}-${index}`,
      name: recipe.name || recipe.recipeName || f.name,
      description: recipe.description || f.description,
      cuisine: recipe.cuisine || f.cuisine,
      regionalStyle: recipe.regionalStyle ?? f.regionalStyle,
      cookTimeMinutes: Number(recipe.cookTimeMinutes) || Number.parseInt(recipe.cookingTime, 10) || f.cookTimeMinutes,
      difficulty: recipe.difficulty || f.difficulty,
      imagePrompt: recipe.imagePrompt || recipe.name || recipe.recipeName || f.imagePrompt,
      nutrition: recipe.nutrition || f.nutrition,
      ingredients: Array.isArray(recipe.ingredients) && recipe.ingredients.length ? recipe.ingredients : f.ingredients,
      steps:
        Array.isArray(recipe.steps) && recipe.steps.length
          ? recipe.steps.slice(0, MAX_STEPS).map((step, idx) => canonicalizeStep(step, idx))
          : f.steps,
      summary: recipe.summary || `${recipe.tips || ""} ${recipe.serving || ""}`.trim() || f.summary,
      substitutions: recipe.substitutions || f.substitutions,
    };
  }).map((recipe, idx) => {
    const f = fallback[idx % fallback.length];
    if (!Array.isArray(recipe.steps) || recipe.steps.length < MIN_STEPS) {
      return { ...recipe, steps: f.steps.slice(0, MAX_STEPS) };
    }
    return {
      ...recipe,
      regionalStyle: params.cuisine === "Indian" && params.regionalStyle ? params.regionalStyle : recipe.regionalStyle,
    };
  });

  const merged = uniqueByName([...sanitized, ...fallback]).sort((a, b) => scoreRecipe(b, params) - scoreRecipe(a, params));
  if (merged.length >= MIN_RECIPES) return merged.slice(0, MAX_RECIPES);
  return fallback.slice(0, MAX_RECIPES);
}

export async function generateRecipeController(req, res) {
  const params = req.body;
  if (!params.ingredients?.length) {
    return res.json({ recipes: [], message: "No suitable recipe can be prepared with these ingredients." });
  }

  const feasibility = validateDishFeasibility(params.ingredients);
  if (!feasibility.valid) {
    if (feasibility.suggestedDish) {
      return res.json({
        recipes: [buildCurdRiceRecipe(params)],
        message: feasibility.message,
      });
    }
    return res.json({ recipes: [], message: feasibility.message });
  }

  try {
    const generated = await generateRecipes(params);
    const recipes = sanitizeRecipes(generated.recipes, params);
    return res.json({ recipes });
  } catch {
    return res.json(withFallbackRecipes(params));
  }
}

export async function surpriseMeController(req, res) {
  const params = { ...req.body, surprise: true };
  return generateRecipeController({ body: params }, res);
}

export async function leftoverSaverController(req, res) {
  const leftovers = req.body.leftovers || [];
  return generateRecipeController(
    {
      body: {
        ingredients: leftovers,
        cuisine: req.body.cuisine || "Global",
        maxTime: req.body.maxTime || 20,
        objective: "minimize food waste",
      },
    },
    res
  );
}

export async function searchRecipeSuggestionsController(req, res) {
  const query = String(req.query.q || "").trim();
  if (!query) return res.json({ suggestions: [], didYouMean: null });
  const match = bestDishMatch(query);
  return res.json({
    suggestions: (match?.suggestions || []).map((name) => ({ name })),
    didYouMean: match?.didYouMean || null,
  });
}

export async function searchRecipesController(req, res) {
  const query = String(req.body.query || "").trim();
  if (!query) return res.json({ recipes: [], didYouMean: null, message: "Please enter a dish name." });

  const cuisine = req.body.cuisine || "Indian";
  const regionalStyle = req.body.regionalStyle || (cuisine === "Indian" ? "Karnataka" : null);
  const match = bestDishMatch(query);
  const normalizedDish = match?.didYouMean || match?.best || query;
  const baseIngredients = dishToIngredients(normalizedDish);
  const generated = withFallbackRecipes({
    ingredients: baseIngredients,
    cuisine,
    regionalStyle,
    maxTime: req.body.maxTime || 30,
    surprise: false,
  }).recipes;

  const styles = cuisine === "Indian"
    ? ["Hyderabadi", "Karnataka Donne", "Malabar", "Andhra", "Home-Style", "Street-Style", "Classic", "Regional"]
    : ["Classic", "Home-Style", "Street-Style", "Chef Special", "Weeknight", "Rustic", "Spiced", "Regional"];

  const recipes = generated.slice(0, MAX_RECIPES).map((recipe, idx) => {
    const styleName = styles[idx % styles.length];
    return {
      ...recipe,
      id: `search-${Date.now()}-${idx}`,
      name: `${styleName} ${normalizedDish}`.replace(/\s+/g, " ").trim(),
      description: `${styleName} variation of ${normalizedDish} in ${cuisine} style.`,
      imagePrompt: `${styleName} ${normalizedDish}`,
      regionalStyle: cuisine === "Indian" ? (regionalStyle || styleName) : recipe.regionalStyle,
    };
  });

  return res.json({
    recipes,
    didYouMean:
      match?.didYouMean && normalizeDishQuery(match.didYouMean) !== normalizeDishQuery(query) ? match.didYouMean : null,
  });
}

export async function saveRecipeController(req, res) {
  if (!db) return res.status(503).json({ error: "Firestore is not configured" });
  const recipe = req.body.recipe;
  const uid = req.user.uid;
  const ref = await db.collection("users").doc(uid).collection("savedRecipes").add({
    ...recipe,
    uid,
    createdAt: new Date().toISOString(),
  });
  return res.json({ id: ref.id });
}

export async function addHistoryController(req, res) {
  if (!db) return res.status(503).json({ error: "Firestore is not configured" });
  const uid = req.user.uid;
  const history = req.body.history;
  const ref = await db.collection("users").doc(uid).collection("history").add({
    ...history,
    uid,
    createdAt: new Date().toISOString(),
  });
  return res.json({ id: ref.id });
}

export async function rateRecipeController(req, res) {
  if (!db) return res.status(503).json({ error: "Firestore is not configured" });
  const uid = req.user.uid;
  const { recipeId, rating } = req.body;
  await db.collection("recipeRatings").add({
    uid,
    recipeId,
    rating,
    createdAt: new Date().toISOString(),
  });
  return res.json({ success: true });
}

export async function getSavedRecipesController(req, res) {
  if (!db) return res.status(503).json({ error: "Firestore is not configured" });
  const uid = req.user.uid;
  const snapshot = await db.collection("users").doc(uid).collection("savedRecipes").orderBy("createdAt", "desc").get();
  return res.json({ recipes: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) });
}

export async function getHistoryController(req, res) {
  if (!db) return res.status(503).json({ error: "Firestore is not configured" });
  const uid = req.user.uid;
  const snapshot = await db.collection("users").doc(uid).collection("history").orderBy("createdAt", "desc").get();
  return res.json({ history: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) });
}

export async function recipeVideoGuideController(req, res) {
  const query = String(req.query.q || "").trim();
  if (!query) {
    return res.status(400).json({ error: "q is required" });
  }
  try {
    const video = await findRecipeVideo(query);
    if (!video) {
      return res.json({ video: null, message: "No video guide found for this recipe." });
    }
    return res.json({ video });
  } catch {
    return res.json({ video: null, message: "Video guide unavailable right now." });
  }
}
