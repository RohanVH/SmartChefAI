import { Router } from "express";
import { cookingAssistantController, recipeChatController } from "../controllers/aiController.js";

const router = Router();

router.post("/chat", recipeChatController);
router.post("/assistant", cookingAssistantController);

export default router;
