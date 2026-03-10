import { answerRecipeQuestion, cookingAssistantTurn } from "../services/aiService.js";

export async function recipeChatController(req, res) {
  const { question, recipe } = req.body;
  if (!question || !recipe) {
    return res.status(400).json({ error: "question and recipe are required" });
  }
  try {
    const data = await answerRecipeQuestion({ question, recipe });
    return res.json(data);
  } catch {
    return res.json({ answer: "I can only help with questions related to this recipe." });
  }
}

export async function cookingAssistantController(req, res) {
  const { userUtterance, recipe, currentStepIndex, totalSteps, language } = req.body;
  if (!recipe) {
    return res.status(400).json({ error: "recipe is required" });
  }
  try {
    const data = await cookingAssistantTurn({
      userUtterance: userUtterance || "",
      recipe,
      currentStepIndex: Number(currentStepIndex) || 0,
      totalSteps: Number(totalSteps) || (Array.isArray(recipe.steps) ? recipe.steps.length : 1),
      language: language || recipe.language || "English",
    });
    return res.json(data);
  } catch {
    return res.json({
      reply: "I can help with this recipe while we're cooking.",
      action: "none",
      stepDelta: 0,
      language: language || "English",
    });
  }
}
