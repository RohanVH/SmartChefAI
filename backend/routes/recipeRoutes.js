import { Router } from "express";
import {
  addHistoryController,
  generateRecipeController,
  getHistoryController,
  getSavedRecipesController,
  leftoverSaverController,
  rateRecipeController,
  recipeVideoGuideController,
  searchRecipeSuggestionsController,
  searchRecipesController,
  saveRecipeController,
  surpriseMeController,
} from "../controllers/recipeController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/generate", generateRecipeController);
router.post("/surprise", surpriseMeController);
router.post("/leftover-saver", leftoverSaverController);
router.get("/search-suggestions", searchRecipeSuggestionsController);
router.post("/search", searchRecipesController);
router.get("/video-guide", recipeVideoGuideController);

router.post("/save", authMiddleware, saveRecipeController);
router.post("/history", authMiddleware, addHistoryController);
router.post("/rate", authMiddleware, rateRecipeController);
router.get("/saved", authMiddleware, getSavedRecipesController);
router.get("/history", authMiddleware, getHistoryController);

export default router;
