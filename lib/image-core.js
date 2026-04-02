const MEALDB_BASE = "https://www.themealdb.com/api/json/v1/1";
const UNSPLASH_FALLBACK_BASE = "https://source.unsplash.com/1200x900/?";
const imageCache = new Map();
const CACHE_DURATION = 60 * 60 * 1000;

function isCacheValid(key) {
  const entry = imageCache.get(key);
  return !!entry && Date.now() - entry.timestamp < CACHE_DURATION;
}

function normalizeMealName(name = "") {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildRecipeImageQuery(recipeName = "") {
  const normalized = normalizeMealName(recipeName);
  if (!normalized) return "plated homemade meal";
  const cleaned = normalized
    .replace(/\b(style|classic|homestyle|home style|weeknight|chef special|regional|street style|recipe)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `${cleaned || normalized} plated homemade food`;
}

async function searchMealDb(term) {
  const response = await fetch(`${MEALDB_BASE}/search.php?s=${encodeURIComponent(term)}`);
  if (!response.ok) return null;
  const data = await response.json();
  return Array.isArray(data.meals) ? data.meals : null;
}

export async function getRecipeImageFromMealDB(recipeName) {
  const normalized = normalizeMealName(recipeName);
  if (!normalized) return null;

  if (imageCache.has(normalized) && isCacheValid(normalized)) {
    return imageCache.get(normalized).image;
  }

  try {
    const searchTerms = [normalized, normalized.split(" ").slice(0, 2).join(" "), normalized.split(" ")[0]].filter(Boolean);
    for (const term of searchTerms) {
      const meals = await searchMealDb(term);
      if (!meals?.length) continue;
      const bestMatch = meals.find((meal) => {
        const mealName = normalizeMealName(meal.strMeal);
        return mealName.includes(normalized) || normalized.includes(mealName) || mealName.includes(term);
      }) || meals[0];
      const imageUrl = bestMatch?.strMealThumb;
      if (imageUrl) {
        imageCache.set(normalized, { image: imageUrl, name: bestMatch.strMeal, timestamp: Date.now() });
        return imageUrl;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function getUnsplashRecipeImage(recipeName) {
  const query = buildRecipeImageQuery(recipeName);
  return `${UNSPLASH_FALLBACK_BASE}${encodeURIComponent(query)}`;
}

export async function getRecipeImagesBatch(recipeNames = []) {
  const results = [];
  for (const name of recipeNames) {
    const image = await getRecipeImageFromMealDB(name);
    results.push({ name, image: image || getCuratedFoodImage(name) || getUnsplashRecipeImage(name) });
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return results;
}

export function getCuratedFoodImage(recipeName) {
  const normalized = normalizeMealName(recipeName);
  const curatedImages = {
    biryani: "https://www.themealdb.com/media/meals/tyuusx1569875239.jpg",
    pulao: "https://www.themealdb.com/media/meals/tyuusx1569875239.jpg",
    "fried rice": "https://www.themealdb.com/media/meals/158etx1569874942.jpg",
    pasta: "https://www.themealdb.com/media/meals/1550181913.jpg",
    pizza: "https://www.themealdb.com/media/meals/1550181913.jpg",
    dosa: "https://www.themealdb.com/media/meals/gyqypx70sv5c9n20.jpg",
    idli: "https://www.themealdb.com/media/meals/ctg8s915158941441.jpg",
    vada: "https://www.themealdb.com/media/meals/ogrubj1581015281.jpg",
    curry: "https://www.themealdb.com/media/meals/vwrppt1598715868.jpg",
    chicken: "https://www.themealdb.com/media/meals/xrtxtx1569674469.jpg",
    paneer: "https://www.themealdb.com/media/meals/aivwpy1487414425.jpg",
    dal: "https://www.themealdb.com/media/meals/9n4ton1569875342.jpg",
    sambar: "https://www.themealdb.com/media/meals/cu68lo1569874678.jpg",
    rasam: "https://www.themealdb.com/media/meals/cu68lo1569874678.jpg",
    rice: "https://www.themealdb.com/media/meals/tyuusx1569875239.jpg",
    roti: "https://www.themealdb.com/media/meals/ox8tw51587291041.jpg",
    naan: "https://www.themealdb.com/media/meals/0051015.jpg",
    paratha: "https://www.themealdb.com/media/meals/ox8tw51587291041.jpg",
    egg: "https://www.themealdb.com/media/meals/oscwow1536762014.jpg",
    fish: "https://www.themealdb.com/media/meals/0258460d14c3level.jpg",
    mutton: "https://www.themealdb.com/media/meals/xvtnyu1569874503.jpg",
    soup: "https://www.themealdb.com/media/meals/gg0nub1555662146.jpg",
    salad: "https://www.themealdb.com/media/meals/819ngs1569875285.jpg",
  };

  for (const [key, url] of Object.entries(curatedImages)) {
    if (normalized.includes(key)) return url;
  }
  return null;
}

export function clearImageCache() {
  const now = Date.now();
  for (const [key, entry] of imageCache.entries()) {
    if (now - entry.timestamp > CACHE_DURATION) {
      imageCache.delete(key);
    }
  }
}
