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

export const recipeService = {
  autocomplete: async (q) => (await api.get(`/ingredients/autocomplete?q=${encodeURIComponent(q)}`)).data,
  detectIngredients: async (imageBase64) => (await api.post("/ingredients/detect", { imageBase64 })).data,
  searchRecipeSuggestions: async (q) => (await api.get(`/recipes/search-suggestions?q=${encodeURIComponent(q)}`)).data,
  searchRecipes: async (payload) => (await api.post("/recipes/search", payload)).data,
  getRecipeVideoGuide: async (q) => {
    const cacheKey = q.toLowerCase().trim();
    const cached = getVideoCacheEntry(cacheKey);
    if (cached) return cached;
    const data = (await api.get(`/recipes/video-guide?q=${encodeURIComponent(q)}`)).data;
    if (data?.video) setVideoCacheEntry(cacheKey, data);
    return data;
  },
  generateRecipes: async (payload) => (await api.post("/recipes/generate", payload)).data,
  surpriseMe: async (payload) => (await api.post("/recipes/surprise", payload)).data,
  leftoverSaver: async (payload) => (await api.post("/recipes/leftover-saver", payload)).data,
  recipeChat: async (payload) => (await api.post("/ai/chat", payload)).data,
  cookingAssistantTurn: async (payload) => (await api.post("/ai/assistant", payload)).data,
  adaptRecipe: async (payload) => (await api.post("/ai/adapt", payload)).data,
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
      const result = await api.get(`/images/recipe-image?name=${encodeURIComponent(recipeName)}`);
      if (result.data?.image) {
        setImageInCache(recipeName, result.data.image);
        return { image: result.data.image, fromCache: false };
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
        const result = await api.post("/images/recipe-images", { recipes: toFetch });
        if (result.data?.images) {
          for (const item of result.data.images) {
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
      const result = { ...(await api.post("/recipes/save", { recipe })).data, source: "remote" };
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
      const result = { ...(await api.post("/recipes/history", { history })).data, source: "remote" };
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
      return { ...(await api.post("/recipes/rate", { recipeId, rating })).data, source: "remote" };
    } catch {
      const data = getLocal(KEYS.ratings);
      data.unshift({ id: `local-${Date.now()}`, recipeId, rating });
      setLocal(KEYS.ratings, data);
      return { success: true, source: "local" };
    }
  },
  getSavedRecipes: async () => {
    try {
      return (await api.get("/recipes/saved")).data;
    } catch {
      return { recipes: getLocal(KEYS.saved) };
    }
  },
  getHistory: async () => {
    try {
      return (await api.get("/recipes/history")).data;
    } catch {
      return { history: getLocal(KEYS.history) };
    }
  },
};
