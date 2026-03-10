import { Router } from "express";
import { autocompleteIngredients, detectIngredients } from "../controllers/ingredientController.js";

const router = Router();

router.get("/autocomplete", autocompleteIngredients);
router.post("/detect", detectIngredients);

export default router;
