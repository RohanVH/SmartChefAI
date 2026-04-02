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

function ok(res, data) {
  return res.status(200).json({ success: true, data });
}

function fail(res, error) {
  return res.status(200).json({ success: false, error: typeof error === "string" ? error : error?.message || "Request failed" });
}

function extractMessage(payload, fallback = "Request failed") {
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
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
  };
}

async function runController(req, res, controller) {
  const captured = createCaptureResponse();
  await controller(req, captured);

  if (captured.payload && typeof captured.payload === "object" && typeof captured.payload.success === "boolean") {
    return res.status(200).json(captured.payload);
  }

  if (captured.statusCode >= 400) {
    return fail(res, extractMessage(captured.payload));
  }

  return ok(res, captured.payload ?? null);
}

function normalizeSearchRequest(req) {
  const queryText = String(req.body?.query || req.query?.query || req.query?.q || "").trim();
  return {
    ...req.body,
    query: queryText,
    cuisine: req.body?.cuisine || req.query?.cuisine || "Indian",
    regionalStyle: req.body?.regionalStyle || req.query?.regionalStyle || null,
    maxTime: req.body?.maxTime || req.query?.maxTime,
  };
}

function normalizeRecipeGenerationRequest(req, fallback = {}) {
  return {
    ...fallback,
    ...req.body,
    ...req.query,
  };
}

async function requireAuth(req, res) {
  const auth = await verifyAuth(req);
  if (!auth.ok) {
    fail(res, auth.error);
    return false;
  }
  return true;
}

async function handleRecipesIndex(_req, res) {
  return ok(res, {
    recipes: [],
    message: "SmartChefAI recipes endpoint is available.",
  });
}

async function handleSurpriseRecipe(req, res) {
  const hasInput = Object.keys(req.body || {}).length > 0 || Object.keys(req.query || {}).length > 0;
  if (!hasInput) {
    return ok(res, {
      title: "Surprise Recipe 🍲",
      ingredients: [],
      steps: [],
    });
  }

  req.body = normalizeRecipeGenerationRequest(req, { surprise: true });
  return runController(req, res, surpriseMeController);
}

async function handleRecipesGenerate(req, res) {
  req.body = normalizeRecipeGenerationRequest(req);
  return runController(req, res, generateRecipeController);
}

async function handleRecipesLeftover(req, res) {
  req.body = normalizeRecipeGenerationRequest(req);
  return runController(req, res, leftoverSaverController);
}

async function handleSearch(req, res) {
  req.body = normalizeSearchRequest(req);
  return runController(req, res, searchRecipesController);
}

async function handleRequest(req, res) {
  const pathname = getPathname(req);

  if (pathname === "/api" || pathname === "/api/") {
    return ok(res, {
      service: "SmartChefAI API",
      health: "/api/health",
      apiBase: "/api",
    });
  }

  if (pathname === "/api/health") {
    return ok(res, {
      status: "ok",
      service: "SmartChefAI API",
    });
  }

  if (pathname.includes("/api/recipes/search-suggestions")) {
    return runController(req, res, searchRecipeSuggestionsController);
  }

  if (pathname.includes("/api/recipes/search")) {
    return handleSearch(req, res);
  }

  if (pathname === "/api/recipes" || pathname === "/api/recipes/") {
    return handleRecipesIndex(req, res);
  }

  if (pathname.includes("/api/recipes/surprise")) {
    return handleSurpriseRecipe(req, res);
  }

  if (pathname.includes("/api/recipes/generate")) {
    return handleRecipesGenerate(req, res);
  }

  if (pathname.includes("/api/recipes/leftover-saver")) {
    return handleRecipesLeftover(req, res);
  }

  if (pathname.includes("/api/recipes/video-guide")) {
    return runController(req, res, recipeVideoGuideController);
  }

  if (pathname.includes("/api/recipes/save")) {
    if (!(await requireAuth(req, res))) return;
    return runController(req, res, saveRecipeController);
  }

  if (pathname.includes("/api/recipes/history")) {
    if (!(await requireAuth(req, res))) return;
    const hasHistoryPayload = req.body && Object.keys(req.body).length > 0;
    return hasHistoryPayload ? runController(req, res, addHistoryController) : runController(req, res, getHistoryController);
  }

  if (pathname.includes("/api/recipes/rate")) {
    if (!(await requireAuth(req, res))) return;
    return runController(req, res, rateRecipeController);
  }

  if (pathname.includes("/api/recipes/saved")) {
    if (!(await requireAuth(req, res))) return;
    return runController(req, res, getSavedRecipesController);
  }

  if (pathname.includes("/api/ai/chat")) {
    return runController(req, res, recipeChatController);
  }

  if (pathname.includes("/api/ai/assistant")) {
    return runController(req, res, cookingAssistantController);
  }

  if (pathname.includes("/api/ai/adapt")) {
    return runController(req, res, adaptRecipeController);
  }

  if (pathname.includes("/api/ingredients/autocomplete")) {
    return runController(req, res, autocompleteIngredients);
  }

  if (pathname.includes("/api/ingredients/detect")) {
    return runController(req, res, detectIngredients);
  }

  if (pathname.includes("/api/images/recipe-image")) {
    return runController(req, res, getRecipeImageController);
  }

  if (pathname.includes("/api/images/recipe-images")) {
    return runController(req, res, getRecipeImagesBatchController);
  }

  return fail(res, "Route not found");
}

export default async function handler(req, res) {
  try {
    req.query = getQuery(req);
    req.body = await parseBody(req);
    req.body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};

    return await handleRequest(req, res);
  } catch (err) {
    console.error(err);
    return fail(res, err?.message || "Internal server error");
  }
}
