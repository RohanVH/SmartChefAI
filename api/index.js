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

function extractErrorMessage(payload, fallback = "Request failed") {
  if (typeof payload === "string" && payload) return payload;
  if (payload && typeof payload === "object") {
    if (typeof payload.error === "string" && payload.error) return payload.error;
    if (payload.error && typeof payload.error === "object" && typeof payload.error.message === "string") {
      return payload.error.message;
    }
    if (typeof payload.message === "string" && payload.message) return payload.message;
  }
  return fallback;
}

function createCaptureResponse() {
  const capture = {
    statusCode: 200,
    payload: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
  };
  return capture;
}

async function runController(req, res, controller) {
  const captured = createCaptureResponse();
  await controller(req, captured);

  if (captured.payload && typeof captured.payload === "object" && typeof captured.payload.success === "boolean") {
    return res.status(captured.statusCode).json(captured.payload);
  }

  if (captured.statusCode >= 400) {
    return res.status(captured.statusCode).json({
      success: false,
      error: extractErrorMessage(captured.payload),
    });
  }

  return res.status(200).json({
    success: true,
    data: captured.payload ?? null,
  });
}

function apiHome(res) {
  return res.status(200).json({
    success: true,
    data: {
      service: "SmartChefAI API",
      health: "/api/health",
      apiBase: "/api",
    },
  });
}

function apiHealth(res) {
  return res.status(200).json({
    success: true,
    data: {
      status: "ok",
      service: "SmartChefAI API",
    },
  });
}

async function handleRecipesIndex(_req, res) {
  return res.status(200).json({
    success: true,
    data: {
      recipes: [],
      message: "SmartChefAI recipes endpoint is available.",
    },
  });
}

async function handleSurpriseRecipe(req, res) {
  if (String(req.method || "GET").toUpperCase() === "GET") {
    return res.status(200).json({
      success: true,
      data: {
        title: "Surprise Recipe",
        ingredients: [],
        steps: [],
      },
    });
  }

  return runController(req, res, surpriseMeController);
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
      return runController(req, res, recipeChatController);
    }

    if (pathname === "/api/ai/assistant" && method === "POST") {
      return runController(req, res, cookingAssistantController);
    }

    if (pathname === "/api/ai/adapt" && method === "POST") {
      return runController(req, res, adaptRecipeController);
    }

    if (pathname === "/api/ingredients/autocomplete" && method === "GET") {
      return runController(req, res, autocompleteIngredients);
    }

    if (pathname === "/api/ingredients/detect" && method === "POST") {
      return runController(req, res, detectIngredients);
    }

    if (pathname === "/api/recipes" && method === "GET") {
      return handleRecipesIndex(req, res);
    }

    if (pathname === "/api/recipes/generate" && method === "POST") {
      return runController(req, res, generateRecipeController);
    }

    if (pathname === "/api/recipes/surprise" && (method === "POST" || method === "GET")) {
      return handleSurpriseRecipe(req, res);
    }

    if (pathname === "/api/recipes/leftover-saver" && method === "POST") {
      return runController(req, res, leftoverSaverController);
    }

    if (pathname === "/api/recipes/search-suggestions" && method === "GET") {
      return runController(req, res, searchRecipeSuggestionsController);
    }

    if (pathname === "/api/recipes/search" && method === "POST") {
      return runController(req, res, searchRecipesController);
    }

    if (pathname === "/api/recipes/video-guide" && method === "GET") {
      return runController(req, res, recipeVideoGuideController);
    }

    if (pathname === "/api/recipes/save" && method === "POST") {
      if (!(await requireAuth(req, res))) return;
      return runController(req, res, saveRecipeController);
    }

    if (pathname === "/api/recipes/history" && method === "POST") {
      if (!(await requireAuth(req, res))) return;
      return runController(req, res, addHistoryController);
    }

    if (pathname === "/api/recipes/rate" && method === "POST") {
      if (!(await requireAuth(req, res))) return;
      return runController(req, res, rateRecipeController);
    }

    if (pathname === "/api/recipes/saved" && method === "GET") {
      if (!(await requireAuth(req, res))) return;
      return runController(req, res, getSavedRecipesController);
    }

    if (pathname === "/api/recipes/history" && method === "GET") {
      if (!(await requireAuth(req, res))) return;
      return runController(req, res, getHistoryController);
    }

    if (pathname === "/api/images/recipe-image" && method === "GET") {
      return runController(req, res, getRecipeImageController);
    }

    if (pathname === "/api/images/recipe-images" && method === "POST") {
      return runController(req, res, getRecipeImagesBatchController);
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
