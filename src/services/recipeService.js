import api from "./api";
import {
  clearCookingSession,
  getVideoCacheEntry,
  loadChatHistory,
  loadCookingSession,
  loadGeneratedRecipes,
  saveChatHistory,
  saveCookingSession,
  saveGeneratedRecipes,
  setVideoCacheEntry,
} from "../utils/recipeSession";

const KEYS = {
  saved: "smartchefai_saved",
  history: "smartchefai_history",
  ratings: "smartchefai_ratings",
  images: "smartchefai_images",
};

function getLocal(key) {
  try {
    return JSON.parse(window.localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function setLocal(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function getImageCache() {
  try {
    const cache = JSON.parse(window.localStorage.getItem(KEYS.images) || "{}");
    const now = Date.now();
    const cleaned = {};
    for (const [key, entry] of Object.entries(cache)) {
      if (now - entry.timestamp < 24 * 60 * 60 * 1000) {
        cleaned[key] = entry;
      }
    }
    return cleaned;
  } catch {
    return {};
  }
}

function setImageCache(cache) {
  window.localStorage.setItem(KEYS.images, JSON.stringify(cache));
}

function setImageInCache(recipeName, imageUrl) {
  const cache = getImageCache();
  cache[recipeName.toLowerCase()] = { url: imageUrl, timestamp: Date.now() };
  setImageCache(cache);
}

function getImageFromCache(recipeName) {
  const cache = getImageCache();
  const entry = cache[recipeName.toLowerCase()];
  return entry?.url || null;
}

function notifyDataChanged() {
  window.dispatchEvent(new Event("smartchefai:data-changed"));
}

function unwrapApiData(responseData, fallbackMessage = "Request failed") {
  if (!responseData || typeof responseData !== "object") {
    throw new Error(fallbackMessage);
  }

  if (responseData.success === false) {
    const rawError = responseData.error;
    const message =
      typeof rawError === "string"
        ? rawError
        : rawError && typeof rawError === "object" && "message" in rawError
          ? rawError.message
          : fallbackMessage;
    throw new Error(message || fallbackMessage);
  }

  if (responseData.success === true && "data" in responseData) {
    return responseData.data;
  }

  return responseData;
}

export const recipeService = {
  autocomplete: async (q) => unwrapApiData((await api.get(`/ingredients/autocomplete?q=${encodeURIComponent(q)}`)).data, "Failed to load ingredient suggestions."),
  detectIngredients: async (imageBase64) => unwrapApiData((await api.post("/ingredients/detect", { imageBase64 })).data, "Failed to detect ingredients."),
  searchRecipeSuggestions: async (q) => unwrapApiData((await api.get(`/recipes/search-suggestions?q=${encodeURIComponent(q)}`)).data, "Failed to load recipe suggestions."),
  searchRecipes: async (payload) => unwrapApiData((await api.post("/recipes/search", payload)).data, "Failed to search recipes."),
  getRecipeVideoGuide: async (q) => {
    const cacheKey = q.toLowerCase().trim();
    const cached = getVideoCacheEntry(cacheKey);
    if (cached) return cached;
    const data = unwrapApiData((await api.get(`/recipes/video-guide?q=${encodeURIComponent(q)}`)).data, "Video guide unavailable.");
    if (data?.video) setVideoCacheEntry(cacheKey, data);
    return data;
  },
  generateRecipes: async (payload) => unwrapApiData((await api.post("/recipes/generate", payload)).data, "Failed to generate recipes."),
  surpriseMe: async (payload) => unwrapApiData((await api.post("/recipes/surprise", payload)).data, "Failed to load surprise recipe."),
  leftoverSaver: async (payload) => unwrapApiData((await api.post("/recipes/leftover-saver", payload)).data, "Failed to load leftover recipes."),
  recipeChat: async (payload) => unwrapApiData((await api.post("/ai/chat", payload)).data, "The AI chef is unavailable right now."),
  cookingAssistantTurn: async (payload) => unwrapApiData((await api.post("/ai/assistant", payload)).data, "Assistant unavailable."),
  adaptRecipe: async (payload) => unwrapApiData((await api.post("/ai/adapt", payload)).data, "Recipe adaptation unavailable."),
  getGeneratedRecipes: () => loadGeneratedRecipes(),
  saveGeneratedRecipes: (recipes) => saveGeneratedRecipes(recipes),
  getChatHistory: (recipe) => loadChatHistory(recipe),
  saveChatHistory: (recipe, messages) => saveChatHistory(recipe, messages),
  getCookingSession: () => loadCookingSession(),
  saveCookingSession: (session) => saveCookingSession(session),
  clearCookingSession: () => clearCookingSession(),

  getRecipeImage: async (recipeName) => {
    const cached = getImageFromCache(recipeName);
    if (cached) return { image: cached, fromCache: true };

    try {
      const data = unwrapApiData((await api.get(`/images/recipe-image?name=${encodeURIComponent(recipeName)}`)).data, "Failed to load recipe image.");
      if (data?.image) {
        setImageInCache(recipeName, data.image);
        return { image: data.image, fromCache: false };
      }
      return { image: null, fromCache: false };
    } catch {
      return { image: null, fromCache: false };
    }
  },

  getRecipeImages: async (recipeNames) => {
    const results = {};
    const toFetch = [];
    for (const name of recipeNames) {
      const cached = getImageFromCache(name);
      if (cached) {
        results[name] = cached;
      } else {
        toFetch.push(name);
      }
    }

    if (toFetch.length > 0) {
      try {
        const data = unwrapApiData((await api.post("/images/recipe-images", { recipes: toFetch })).data, "Failed to load recipe images.");
        if (data?.images) {
          for (const item of data.images) {
            if (item.image) {
              results[item.name] = item.image;
              setImageInCache(item.name, item.image);
            }
          }
        }
      } catch {
        // ignore
      }
    }

    return results;
  },

  saveRecipe: async (recipe) => {
    try {
      const result = { ...unwrapApiData((await api.post("/recipes/save", { recipe })).data, "Failed to save recipe."), source: "remote" };
      notifyDataChanged();
      return result;
    } catch {
      const saved = getLocal(KEYS.saved);
      saved.unshift({ id: `local-${Date.now()}`, ...recipe });
      setLocal(KEYS.saved, saved);
      notifyDataChanged();
      return { id: saved[0].id, source: "local" };
    }
  },
  addHistory: async (history) => {
    try {
      const result = { ...unwrapApiData((await api.post("/recipes/history", { history })).data, "Failed to save history."), source: "remote" };
      notifyDataChanged();
      return result;
    } catch {
      const data = getLocal(KEYS.history);
      data.unshift({ id: `local-${Date.now()}`, ...history });
      setLocal(KEYS.history, data);
      notifyDataChanged();
      return { id: data[0].id, source: "local" };
    }
  },
  rateRecipe: async (recipeId, rating) => {
    try {
      return { ...unwrapApiData((await api.post("/recipes/rate", { recipeId, rating })).data, "Failed to rate recipe."), source: "remote" };
    } catch {
      const data = getLocal(KEYS.ratings);
      data.unshift({ id: `local-${Date.now()}`, recipeId, rating });
      setLocal(KEYS.ratings, data);
      return { success: true, source: "local" };
    }
  },
  getSavedRecipes: async () => {
    try {
      return unwrapApiData((await api.get("/recipes/saved")).data, "Failed to load saved recipes.");
    } catch {
      return { recipes: getLocal(KEYS.saved) };
    }
  },
  getHistory: async () => {
    try {
      return unwrapApiData((await api.get("/recipes/history")).data, "Failed to load cooking history.");
    } catch {
      return { history: getLocal(KEYS.history) };
    }
  },
};
