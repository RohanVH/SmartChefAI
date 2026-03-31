import { Router } from "express";
import { adaptRecipeController, cookingAssistantController, recipeChatController } from "../controllers/aiController.js";

const router = Router();

router.post("/chat", recipeChatController);
router.post("/assistant", cookingAssistantController);
router.post("/adapt", adaptRecipeController);

export default router;
