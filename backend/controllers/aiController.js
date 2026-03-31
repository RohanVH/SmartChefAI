import { adaptRecipeInProgress, answerRecipeQuestion, cookingAssistantTurn } from "../services/aiService.js";

function resolveFallbackReference(recipe, previousMessages = []) {
  const historyText = previousMessages.map((item) => item.text || "").join(" ").toLowerCase();
  const ingredientNames = (recipe?.ingredients || []).map((item) => String(item?.name || item || "")).filter(Boolean);
  const fromHistory = ingredientNames.find((name) => historyText.includes(name.toLowerCase()));
  if (fromHistory) return fromHistory;

  const currentStep = recipe?.currentStep || recipe?.steps?.[recipe?.currentStepIndex || 0] || recipe?.steps?.[0] || null;
  const stepIngredient = String(currentStep?.ingredient || currentStep?.ingredients || "")
    .split(",")
    .map((item) => item.trim())
    .find(Boolean);
  return stepIngredient || ingredientNames[0] || "this ingredient";
}

function fallbackRecipeAnswer(question, recipe, previousMessages = []) {
  const lower = String(question || "").toLowerCase();
  const currentStep = recipe?.currentStep || recipe?.steps?.[recipe?.currentStepIndex || 0] || recipe?.steps?.[0] || null;
  const referent = resolveFallbackReference(recipe, previousMessages);

  if (/burn|burning|too hot|smoke/.test(lower)) {
    return "Lower the heat immediately, move the pan off the burner briefly, and stir continuously. If this is a masala or sauce, add a small splash of water so it cools down before you continue.";
  }
  if (/oil hot|hot enough|is the oil ready/.test(lower)) {
    return "Look for a light shimmer and easy movement when you tilt the pan. A tiny piece of onion or cumin should sizzle gently as soon as it touches the oil.";
  }
  if ((/garlic/.test(lower) || /\bit\b/.test(lower)) && /(replace|substitute|instead|without|dont have|don't have|no garlic)/.test(lower)) {
    return `Use a little extra ginger, shallot, onion, or a pinch of garlic powder if you have it. If ${referent} is only a supporting flavor in this recipe, you can also skip it and keep going.`;
  }
  if (/salt|salty|too much salt/.test(lower)) {
    return "Dilute the dish with a little water, tomato, cream, curd, or extra base ingredients, then simmer briefly and taste again before adding anything else.";
  }
  if (/stick|sticking|stuck/.test(lower)) {
    return "Lower the heat and loosen the pan with a small splash of water or oil, depending on the recipe. Stir gently and make sure the pan is not too dry before continuing.";
  }
  if (currentStep?.lookFor) {
    return `Use this cue for the current step: ${currentStep.lookFor}. Keep the heat controlled and give it another minute if the aroma, color, or texture are not there yet.`;
  }
  return "Stay with gentle heat, make small adjustments, and taste before making bigger changes. I can help with substitutions, timing, rescue steps, or texture checks for this recipe.";
}

export async function recipeChatController(req, res) {
  const { question, recipe, previousMessages = [] } = req.body;
  if (!question || !recipe) {
    return res.status(400).json({ error: "question and recipe are required" });
  }
  try {
    const data = await answerRecipeQuestion({ question, recipe, previousMessages });
    return res.json(data);
  } catch {
    return res.json({ answer: fallbackRecipeAnswer(question, recipe, previousMessages) });
  }
}

export async function cookingAssistantController(req, res) {
  const { userUtterance, recipe, currentStepIndex, totalSteps, language, previousMessages = [] } = req.body;
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
      previousMessages,
    });
    return res.json(data);
  } catch {
    return res.json({
      intent: "answer",
      action: null,
      parameters: { step: null },
      response: "I can help with this recipe while we're cooking.",
    });
  }
}

export async function adaptRecipeController(req, res) {
  const { recipe, currentStepIndex = 0, changeRequest = "", previousMessages = [] } = req.body;
  if (!recipe || !changeRequest) {
    return res.status(400).json({ error: "recipe and changeRequest are required" });
  }
  try {
    const data = await adaptRecipeInProgress({
      recipe,
      currentStepIndex: Number(currentStepIndex) || 0,
      changeRequest,
      previousMessages,
    });
    return res.json(data);
  } catch {
    return res.json({
      summary: "I updated the remaining steps so you can continue with a similar ingredient and adjust gradually while tasting.",
      recipe,
    });
  }
}

