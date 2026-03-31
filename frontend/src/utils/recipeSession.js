const ACTIVE_RECIPE_KEY = "smartchefai_active_recipe";
const GENERATED_RECIPES_KEY = "smartchefai_generated_recipes";
const COOKING_SESSION_KEY = "smartchefai_cooking_session";
const CHAT_HISTORY_PREFIX = "smartchefai_chat_";
const VIDEO_CACHE_KEY = "smartchefai_step_videos";

function safeStorage(storage, key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(storage, key, value) {
  if (typeof window === "undefined") return;
  storage.setItem(key, JSON.stringify(value));
}

export function slugifyRecipeId(value = "") {
  return String(value || "recipe")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "recipe";
}

export function getRecipeRouteId(recipe) {
  return slugifyRecipeId(recipe?.id || recipe?.name || "recipe");
}

export function saveActiveRecipe(recipe) {
  if (typeof window === "undefined" || !recipe) return;
  writeStorage(window.sessionStorage, ACTIVE_RECIPE_KEY, recipe);
}

export function loadActiveRecipe() {
  if (typeof window === "undefined") return null;
  return safeStorage(window.sessionStorage, ACTIVE_RECIPE_KEY, null);
}

export function saveGeneratedRecipes(recipes = []) {
  if (typeof window === "undefined") return;
  writeStorage(window.localStorage, GENERATED_RECIPES_KEY, {
    recipes,
    updatedAt: new Date().toISOString(),
  });
}

export function loadGeneratedRecipes() {
  if (typeof window === "undefined") return [];
  return safeStorage(window.localStorage, GENERATED_RECIPES_KEY, { recipes: [] }).recipes || [];
}

export function saveChatHistory(recipe, messages = []) {
  if (typeof window === "undefined" || !recipe) return;
  writeStorage(window.localStorage, `${CHAT_HISTORY_PREFIX}${getRecipeRouteId(recipe)}`, {
    messages,
    updatedAt: new Date().toISOString(),
  });
}

export function loadChatHistory(recipe) {
  if (typeof window === "undefined" || !recipe) return [];
  return safeStorage(window.localStorage, `${CHAT_HISTORY_PREFIX}${getRecipeRouteId(recipe)}`, { messages: [] }).messages || [];
}

export function saveCookingSession(session) {
  if (typeof window === "undefined" || !session?.recipe) return;
  writeStorage(window.localStorage, COOKING_SESSION_KEY, {
    ...session,
    updatedAt: new Date().toISOString(),
  });
}

export function loadCookingSession() {
  if (typeof window === "undefined") return null;
  return safeStorage(window.localStorage, COOKING_SESSION_KEY, null);
}

export function clearCookingSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(COOKING_SESSION_KEY);
}

export function getVideoCacheEntry(cacheKey) {
  if (typeof window === "undefined") return null;
  const cache = safeStorage(window.localStorage, VIDEO_CACHE_KEY, {});
  const entry = cache[cacheKey];
  if (!entry) return null;
  if (Date.now() - entry.timestamp > 24 * 60 * 60 * 1000) return null;
  return entry.data;
}

export function setVideoCacheEntry(cacheKey, data) {
  if (typeof window === "undefined") return;
  const cache = safeStorage(window.localStorage, VIDEO_CACHE_KEY, {});
  cache[cacheKey] = { data, timestamp: Date.now() };
  writeStorage(window.localStorage, VIDEO_CACHE_KEY, cache);
}
