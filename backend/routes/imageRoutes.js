import { Router } from "express";
import { getRecipeImageController, getRecipeImagesBatchController } from "../controllers/imageController.js";

const router = Router();

// Get single recipe image
router.get("/recipe-image", getRecipeImageController);

// Get batch of recipe images
router.post("/recipe-images", getRecipeImagesBatchController);

export default router;

