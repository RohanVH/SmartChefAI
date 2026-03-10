export function toTitleCase(value = "") {
  return value
    .split(" ")
    .filter(Boolean)
    .map((v) => v[0]?.toUpperCase() + v.slice(1).toLowerCase())
    .join(" ");
}

export function minutesLabel(minutes) {
  return `${minutes} minutes`;
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function placeholderImage(text, width = 800, height = 500) {
  const label = (text || "SmartChefAI").slice(0, 42);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='#FDBA74'/><stop offset='100%' stop-color='#FB923C'/></linearGradient></defs><rect width='100%' height='100%' fill='url(#g)'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#7C2D12' font-family='Arial, sans-serif' font-size='28'>${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function foodFallbackIcon(width = 120, height = 120) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 120 120'><rect width='120' height='120' rx='18' fill='#1e293b'/><circle cx='60' cy='60' r='28' fill='#334155'/><path d='M38 66c6-4 11-6 22-6s16 2 22 6' stroke='#22c55e' stroke-width='4' fill='none' stroke-linecap='round'/><circle cx='49' cy='50' r='4' fill='#38bdf8'/><circle cx='71' cy='50' r='4' fill='#38bdf8'/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function normalizeFoodQuery(value = "") {
  return String(value || "food dish")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+/g, ",");
}

// Spoonacular recipe image mapping for common Indian dishes
const SPOONACULAR_RECIPE_IMAGES = {
  "chicken-biryani": "https://spoonacular.com/recipeImages/716429-556x370.jpg",
  "chicken-fry": "https://spoonacular.com/recipeImages/715497-556x370.jpg",
  "chicken-curry": "https://spoonacular.com/recipeImages/715415-556x370.jpg",
  "butter-chicken": "https://spoonacular.com/recipeImages/716268-556x370.jpg",
  "paneer-butter-masala": "https://spoonacular.com/recipeImages/716426-556x370.jpg",
  "paneer-tikka": "https://spoonacular.com/recipeImages/715421-556x370.jpg",
  "veg-biryani": "https://spoonacular.com/recipeImages/716427-556x370.jpg",
  "mutton-curry": "https://spoonacular.com/recipeImages/716381-556x370.jpg",
  "fish-fry": "https://spoonacular.com/recipeImages/716394-556x370.jpg",
  "egg-curry": "https://spoonacular.com/recipeImages/782585-556x370.jpg",
  "dal-tadka": "https://spoonacular.com/recipeImages/716379-556x370.jpg",
  "sambar": "https://spoonacular.com/recipeImages/716375-556x370.jpg",
  "rasam": "https://spoonacular.com/recipeImages/716365-556x370.jpg",
  "masala-dosa": "https://spoonacular.com/recipeImages/716281-556x370.jpg",
  "idli": "https://spoonacular.com/recipeImages/716408-556x370.jpg",
  "vada": "https://spoonacular.com/recipeImages/716369-556x370.jpg",
  "pulao": "https://spoonacular.com/recipeImages/716344-556x370.jpg",
  "fried-rice": "https://spoonacular.com/recipeImages/716337-556x370.jpg",
  "pasta": "https://spoonacular.com/recipeImages/716268-556x370.jpg",
  "pizza": "https://spoonacular.com/recipeImages/715859-556x370.jpg",
  "noodles": "https://spoonacular.com/recipeImages/716395-556x370.jpg",
  "soup": "https://spoonacular.com/recipeImages/716274-556x370.jpg",
  "salad": "https://spoonacular.com/recipeImages/716627-556x370.jpg",
  "roti": "https://spoonacular.com/recipeImages/716370-556x370.jpg",
  "naan": "https://spoonacular.com/recipeImages/716350-556x370.jpg",
  "paratha": "https://spoonacular.com/recipeImages/716349-556x370.jpg",
  "chicken-65": "https://spoonacular.com/recipeImages/716385-556x370.jpg",
  "chicken-manchurian": "https://spoonacular.com/recipeImages/716354-556x370.jpg",
  "paneer-65": "https://spoonacular.com/recipeImages/782588-556x370.jpg",
  "gobi-manchurian": "https://spoonacular.com/recipeImages/716352-556x370.jpg",
  "aloo-gobi": "https://spoonacular.com/recipeImages/716401-556x370.jpg",
  "palak-paneer": "https://spoonacular.com/recipeImages/716342-556x370.jpg",
  "bhindi-masala": "https://spoonacular.com/recipeImages/716353-556x370.jpg",
  "baingan-bharta": "https://spoonacular.com/recipeImages/716347-556x370.jpg",
  "matar-paneer": "https://spoonacular.com/recipeImages/716335-556x370.jpg",
  "kadhai-paneer": "https://spoonacular.com/recipeImages/716336-556x370.jpg",
  "shahi-paneer": "https://spoonacular.com/recipeImages/716355-556x370.jpg",
  "paneer-lababdar": "https://spoonacular.com/recipeImages/782585-556x370.jpg",
  "dal-makhani": "https://spoonacular.com/recipeImages/716377-556x370.jpg",
  "dal-fry": "https://spoonacular.com/recipeImages/716376-556x370.jpg",
  "rajma-masala": "https://spoonacular.com/recipeImages/716378-556x370.jpg",
  "chole-masala": "https://spoonacular.com/recipeImages/716380-556x370.jpg",
  "pav-bhaji": "https://spoonacular.com/recipeImages/716356-556x370.jpg",
  "vada-pav": "https://spoonacular.com/recipeImages/716357-556x370.jpg",
  "bhelpuri": "https://spoonacular.com/recipeImages/716358-556x370.jpg",
  "pani-puri": "https://spoonacular.com/recipeImages/716359-556x370.jpg",
  "dahi-puri": "https://spoonacular.com/recipeImages/716360-556x370.jpg",
  "ragda-pattice": "https://spoonacular.com/recipeImages/716361-556x370.jpg",
  "misal-pav": "https://spoonacular.com/recipeImages/716362-556x370.jpg",
  "tambda-pandhra-rice": "https://spoonacular.com/recipeImages/716363-556x370.jpg",
  "curd-rice": "https://spoonacular.com/recipeImages/716364-556x370.jpg",
  "lemon-rice": "https://spoonacular.com/recipeImages/716365-556x370.jpg",
  "tomato-rice": "https://spoonacular.com/recipeImages/716366-556x370.jpg",
  "bisibelebath": "https://spoonacular.com/recipeImages/716367-556x370.jpg",
  "pongal": "https://spoonacular.com/recipeImages/716368-556x370.jpg",
};

// Curated food image fallback pool (reliable static URLs)
const CURATED_FOOD_IMAGES = [
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1473093226795-af9932fe5856?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1484723091739-30a097e8f929?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1506354666786-959d6d497f1a?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80",
];

const DISH_IMAGE_RULES = [
  {
    match: /\bmasala dosa|dosa\b/,
    curated: [
      "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1694849789049-93b51fdd8f04?auto=format&fit=crop&w=1200&q=80",
    ],
    queries: ["masala dosa", "south indian dosa", "dosa chutney sambar"],
  },
  {
    match: /\bidli\b/,
    curated: ["https://images.unsplash.com/photo-1630383249896-424e482df921?auto=format&fit=crop&w=1200&q=80"],
    queries: ["idli sambar", "south indian idli", "idli chutney"],
  },
  {
    match: /\bvade?|vada\b/,
    curated: ["https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=80"],
    queries: ["medu vada", "south indian vada", "vada chutney"],
  },
  {
    match: /\bbiryani\b/,
    curated: [
      "https://images.unsplash.com/photo-1563379091339-03246963d96c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1701579231349-d7459c98cd63?auto=format&fit=crop&w=1200&q=80",
    ],
    queries: ["chicken biryani", "hyderabadi biryani", "indian biryani plate"],
  },
  {
    match: /\bgrilled chicken|roast chicken|chicken fry\b/,
    curated: ["https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=1200&q=80"],
    queries: ["grilled chicken", "roast chicken dish", "chicken fry indian"],
  },
  {
    match: /\bchicken curry|masala chicken|butter chicken\b/,
    curated: ["https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=1200&q=80"],
    queries: ["butter chicken curry", "chicken masala curry", "indian chicken curry"],
  },
  {
    match: /\bpasta\b/,
    curated: ["https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=1200&q=80"],
    queries: ["italian pasta", "creamy pasta bowl", "pasta dish"],
  },
  {
    match: /\bfried rice\b/,
    curated: ["https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=1200&q=80"],
    queries: ["fried rice", "asian fried rice bowl", "egg fried rice"],
  },
  {
    match: /\bpaneer\b/,
    curated: ["https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=1200&q=80"],
    queries: ["paneer curry", "paneer masala", "indian paneer dish"],
  },
  {
    match: /\bsoup\b/,
    curated: ["https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80"],
    queries: ["hot soup bowl", "vegetable soup", "creamy soup"],
  },
  {
    match: /\bsalad\b/,
    curated: ["https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80"],
    queries: ["fresh salad bowl", "green salad", "healthy salad meal"],
  },
  {
    match: /\bchicken\b/,
    curated: [
      "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=1200&q=80",
    ],
    queries: ["chicken dish"],
  },
  {
    match: /\bpaneer\b/,
    curated: [
      "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1631452180539-96aca7d48617?auto=format&fit=crop&w=1200&q=80",
    ],
    queries: ["paneer curry"],
  },
  {
    match: /\bcurry|masala|gravy\b/,
    curated: [
      "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1631292784640-2b24be784d5d?auto=format&fit=crop&w=1200&q=80",
    ],
    queries: ["indian curry dish"],
  },
  {
    match: /\bfish|prawn|shrimp|seafood\b/,
    curated: [
      "https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?auto=format&fit=crop&w=1200&q=80",
    ],
    queries: ["seafood curry"],
  },
  {
    match: /\begg\b/,
    curated: [
      "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1200&q=80",
    ],
    queries: ["egg recipe"],
  },
  {
    match: /\brice|pulao|pulav|khichdi\b/,
    curated: [
      "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1516685018646-549198525c1b?auto=format&fit=crop&w=1200&q=80",
    ],
    queries: ["rice dish"],
  },
  {
    match: /\broti|naan|paratha|chapati\b/,
    curated: [
      "https://images.unsplash.com/photo-1617692855027-33b14f061079?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1651849491519-f4f6f3a5484a?auto=format&fit=crop&w=1200&q=80",
    ],
    queries: ["indian bread"],
  },
];

function getDishImageRule(recipeName = "") {
  const lower = String(recipeName || "").toLowerCase();
  return DISH_IMAGE_RULES.find((item) => item.match.test(lower)) || null;
}

function stableHash(value = "") {
  const text = String(value || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const INGREDIENT_ALIASES = {
  onions: "onion",
  shallots: "shallot",
  chillies: "chili-pepper",
  chili: "chili-pepper",
  chilies: "chili-pepper",
  greenchili: "green-chili",
  greenchilies: "green-chili",
  "green-chili": "green-chili",
  "red-chili": "red-chili",
  capsicum: "bell-pepper",
  coriander: "cilantro",
  "coriander leaves": "cilantro",
  "curry leaves": "curry-leaf",
  "curry leaf": "curry-leaf",
  "curd": "yogurt",
  dahi: "yogurt",
  ghee: "clarified-butter",
  atta: "whole-wheat-flour",
  maida: "all-purpose-flour",
  "all purpose flour": "all-purpose-flour",
  "refined flour": "all-purpose-flour",
  rava: "semolina",
  sooji: "semolina",
  "garam masala": "garam-masala",
  "garam-masala": "garam-masala",
  "red chili powder": "chili-powder",
  "red-chili-powder": "chili-powder",
  "turmeric powder": "turmeric",
  "coriander powder": "coriander",
  "cumin seeds": "cumin",
  "cumin powder": "cumin",
  "mustard seeds": "mustard-seed",
  "cashew nuts": "cashews",
  cashewnuts: "cashews",
  peanuts: "peanut",
  paneer: "cottage-cheese",
  "cottage cheese": "cottage-cheese",
  "spring onion": "scallions",
  "spring onions": "scallions",
  tomatoe: "tomato",
  tomatoes: "tomato",
  potatoes: "potato",
  lemons: "lemon",
  limes: "lime",
  garlics: "garlic",
  eggs: "egg",
  "green peas": "peas",
  mushrooms: "mushroom",
  olives: "olive",
  carrots: "carrot",
  cucumbers: "cucumber",
  spinach: "spinach",
};

const INGREDIENT_NOISE_WORDS = new Set([
  "fresh", "dried", "dry", "raw", "ripe", "small", "large", "medium", "whole", "boneless", "skinless",
  "chopped", "sliced", "diced", "minced", "crushed", "ground", "powder", "paste", "grated", "peeled",
  "washed", "boiled", "cooked", "optional", "to", "taste", "for", "garnish", "and",
]);

function singularizeWord(word = "") {
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("oes")) return word.slice(0, -2);
  if (word.endsWith("ses")) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function normalizeIngredientForImage(name = "") {
  const cleaned = String(name || "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/\d+([./]\d+)?\s*(cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|gram|grams|kg|ml|l|pinch|clove|cloves|piece|pieces)\b/g, "")
    .replace(/[,+/]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[^a-z0-9 ]/g, "");

  if (!cleaned) return "";
  if (INGREDIENT_ALIASES[cleaned]) return INGREDIENT_ALIASES[cleaned];

  const baseTokens = cleaned
    .split(" ")
    .filter(Boolean)
    .filter((token) => !INGREDIENT_NOISE_WORDS.has(token))
    .map((token) => singularizeWord(token));

  if (!baseTokens.length) return "";
  const joined = baseTokens.join(" ");
  if (INGREDIENT_ALIASES[joined]) return INGREDIENT_ALIASES[joined];

  const hyphenated = joined.replace(/\s+/g, "-");
  if (INGREDIENT_ALIASES[hyphenated]) return INGREDIENT_ALIASES[hyphenated];
  return hyphenated;
}

export function getIngredientImage(name = "") {
  return getIngredientImageCandidates(name)[0] || foodFallbackIcon(100, 100);
}

export function getIngredientImageCandidates(name = "") {
  const normalized = normalizeIngredientForImage(name);
  if (!normalized) return [foodFallbackIcon(100, 100)];
  const tokens = normalized.split("-").filter(Boolean);
  const compact = tokens.join("-");
  const firstToken = tokens[0] || compact;
  const lastToken = tokens[tokens.length - 1] || compact;
  const candidates = [
    compact,
    `${firstToken}`,
    `${lastToken}`,
    compact.replace(/-leaf$/, ""),
    compact.replace(/-pepper$/, "pepper"),
  ]
    .filter(Boolean)
    .filter((value, idx, arr) => arr.indexOf(value) === idx)
    .map((value) => `https://spoonacular.com/cdn/ingredients_100x100/${value}.png`);

  return candidates.length ? candidates : [foodFallbackIcon(100, 100)];
}

export function ingredientImageUrl(name = "") {
  return getIngredientImage(name);
}

export function getFoodImage(recipeName = "", variantSeed = "", options = {}) {
  return getFoodImageCandidates(recipeName, variantSeed, options)[0];
}

export function getFoodImageCandidates(recipeName = "", variantSeed = "", options = {}) {
  const { strict = true } = options;
  const rule = getDishImageRule(recipeName);
  const hash = stableHash(`${recipeName}|${variantSeed}`);
  
  // Normalize the recipe name for matching
  const normalizedName = String(recipeName || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  
  // FIRST PRIORITY: Check dish-specific rules (these have curated images for specific dishes)
  if (rule && rule.curated && rule.curated.length) {
    const strictCandidates = [...rule.curated]
      .filter(Boolean)
      .filter((value, idx, arr) => arr.indexOf(value) === idx);
    if (!strictCandidates.length) return [foodFallbackIcon(800, 600)];
    const start = hash % strictCandidates.length;
    return strictCandidates.slice(start).concat(strictCandidates.slice(0, start));
  }
  
  // SECOND PRIORITY: Try to find a Spoonacular match with strict word matching
  const spoonacularKeys = Object.keys(SPOONACULAR_RECIPE_IMAGES);
  let spoonacularMatch = null;
  
  // Exact match (e.g., "chicken biryani" -> "chicken-biryani")
  const hyphenatedName = normalizedName.replace(/\s+/g, "-");
  for (const key of spoonacularKeys) {
    if (hyphenatedName === key) {
      spoonacularMatch = SPOONACULAR_RECIPE_IMAGES[key];
      break;
    }
  }
  
  // Word-based matching: require at least 2 words to match OR primary ingredient match
  if (!spoonacularMatch) {
    const nameWords = normalizedName.split(" ").filter(Boolean);
    const primaryIngredient = nameWords[0] || ""; // First word is usually the main ingredient
    
    for (const key of spoonacularKeys) {
      const keyWords = key.split("-").filter(Boolean);
      // Check if at least 2 words match OR key starts with primary ingredient
      const matchCount = keyWords.filter(kw => nameWords.some(nw => nw === kw || kw.includes(nw) || nw.includes(kw))).length;
      
      if ((matchCount >= 2 && nameWords.length >= 2) || (primaryIngredient && key.startsWith(primaryIngredient))) {
        spoonacularMatch = SPOONACULAR_RECIPE_IMAGES[key];
        break;
      }
    }
  }
  
  // If we have a Spoonacular match, use it
  if (spoonacularMatch) {
    return [spoonacularMatch, ...CURATED_FOOD_IMAGES.slice(hash % CURATED_FOOD_IMAGES.length), ...CURATED_FOOD_IMAGES.slice(0, hash % CURATED_FOOD_IMAGES.length)];
  }

  // FINAL FALLBACK: Use curated generic food images (deterministic based on hash)
  const unique = CURATED_FOOD_IMAGES
    .filter(Boolean)
    .filter((value, idx, arr) => arr.indexOf(value) === idx);
  if (!unique.length) return [foodFallbackIcon(800, 600)];
  const start = hash % unique.length;
  return unique.slice(start).concat(unique.slice(0, start));
}

export function recipeImageUrl(query = "") {
  return getFoodImage(query);
}
