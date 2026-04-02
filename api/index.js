import {
  adaptRecipeController,
  cookingAssistantController,
  recipeChatController,
} from "../lib/chat.js";
import {
  addHistoryController,
  autocompleteIngredients,
  detectIngredients,
  generateRecipeController,
  getHistoryController,
  getRecipeImageController,
  getRecipeImagesBatchController,
  getSavedRecipesController,
  leftoverSaverController,
  rateRecipeController,
  recipeVideoGuideController,
  saveRecipeController,
  searchRecipeSuggestionsController,
  searchRecipesController,
  surpriseMeController,
} from "../lib/recipes.js";
import { getPathname, getQuery, parseBody, verifyAuth } from "../lib/utils.js";

function routeNotFound(res) {
  return res.status(404).json({ success: false, error: "Route not found" });
}

function apiHome(res) {
  return res.status(200).json({
    success: true,
    service: "SmartChefAI API",
    health: "/api/health",
    apiBase: "/api",
  });
}

function apiHealth(res) {
  return res.status(200).json({
    success: true,
    status: "ok",
    service: "SmartChefAI API",
  });
}

async function requireAuth(req, res) {
  const auth = await verifyAuth(req);
  if (!auth.ok) {
    res.status(auth.status).json({ success: false, error: auth.error });
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  const pathname = getPathname(req);
  const method = String(req.method || "GET").toUpperCase();

  req.query = getQuery(req);
  req.body = await parseBody(req);

  try {
    if (pathname === "/api") {
      return apiHome(res);
    }

    if (pathname === "/api/health") {
      return apiHealth(res);
    }

    if (pathname === "/api/ai/chat" && method === "POST") {
      return recipeChatController(req, res);
    }

    if (pathname === "/api/ai/assistant" && method === "POST") {
      return cookingAssistantController(req, res);
    }

    if (pathname === "/api/ai/adapt" && method === "POST") {
      return adaptRecipeController(req, res);
    }

    if (pathname === "/api/ingredients/autocomplete" && method === "GET") {
      return autocompleteIngredients(req, res);
    }

    if (pathname === "/api/ingredients/detect" && method === "POST") {
      return detectIngredients(req, res);
    }

    if (pathname === "/api/recipes/generate" && method === "POST") {
      return generateRecipeController(req, res);
    }

    if (pathname === "/api/recipes/surprise" && method === "POST") {
      return surpriseMeController(req, res);
    }

    if (pathname === "/api/recipes/leftover-saver" && method === "POST") {
      return leftoverSaverController(req, res);
    }

    if (pathname === "/api/recipes/search-suggestions" && method === "GET") {
      return searchRecipeSuggestionsController(req, res);
    }

    if (pathname === "/api/recipes/search" && method === "POST") {
      return searchRecipesController(req, res);
    }

    if (pathname === "/api/recipes/video-guide" && method === "GET") {
      return recipeVideoGuideController(req, res);
    }

    if (pathname === "/api/recipes/save" && method === "POST") {
      if (!(await requireAuth(req, res))) return;
      return saveRecipeController(req, res);
    }

    if (pathname === "/api/recipes/history" && method === "POST") {
      if (!(await requireAuth(req, res))) return;
      return addHistoryController(req, res);
    }

    if (pathname === "/api/recipes/rate" && method === "POST") {
      if (!(await requireAuth(req, res))) return;
      return rateRecipeController(req, res);
    }

    if (pathname === "/api/recipes/saved" && method === "GET") {
      if (!(await requireAuth(req, res))) return;
      return getSavedRecipesController(req, res);
    }

    if (pathname === "/api/recipes/history" && method === "GET") {
      if (!(await requireAuth(req, res))) return;
      return getHistoryController(req, res);
    }

    if (pathname === "/api/images/recipe-image" && method === "GET") {
      return getRecipeImageController(req, res);
    }

    if (pathname === "/api/images/recipe-images" && method === "POST") {
      return getRecipeImagesBatchController(req, res);
    }

    return routeNotFound(res);
  } catch (error) {
    console.error("SmartChefAI API error:", error);
    return res.status(200).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
      data: [],
    });
  }
}
