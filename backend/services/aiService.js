import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const MIN_STEPS = 8;
const MAX_STEPS = 12;
const BASIC_PANTRY = ["oil", "salt", "water", "ghee"];

function parseJson(content, fallback) {
  try {
    return JSON.parse(content);
  } catch {
    return fallback;
  }
}

function recipeSystemPrompt() {
  return `
You are a professional chef writing a cookbook-quality home recipe.
Create practical instructions that a beginner can follow from start to finish.
Do not output any text outside JSON.

Hard Rules:
* Return only valid JSON.
* Generate 6 to 8 recipes.
* Each recipe must have 8 to 12 steps.
* Each step must have multiple sentences (minimum 2 complete sentences).
* Every step must explicitly include:
  - ingredient names and quantities
  - cooking action
  - approximate time
  - heat level
  - visual cue ("lookFor")
* Recipe must be realistic for the selected cuisine and regional style.
* Use only user ingredients plus pantry basics (oil, salt, water, ghee).
* Never invent unavailable major ingredients.
* No impossible actions:
  - never chop rice/curd/yogurt/oil/water/milk/ghee/spice powders
  - liquids are measured/poured/heated, not chopped/sliced
* Validate feasibility before generating. If not feasible, return {"recipes":[]}.
* Language and tone must match selected language + instructionStyle:
  - Simple: very clear, beginner-friendly
  - Standard: concise professional cooking language

Required Step Structure:
* stepNumber
* title
* ingredients (with quantities)
* instruction (detailed multi-sentence method)
* time
* heatLevel
* lookFor

Return JSON in this shape:
{
  "recipes": [{
    "recipeName": "string",
    "cookingTime": "string",
    "difficulty": "Easy|Medium|Hard",
    "cuisine": "string",
    "regionalStyle": "string|null",
    "nutrition": {"calories": 0, "protein": 0, "carbs": 0, "fat": 0},
    "ingredients": [{"name":"string","quantity":"string"}],
    "steps": [{
      "stepNumber": 1,
      "title": "string",
      "ingredients": "string",
      "instruction": "string",
      "time": "string",
      "heatLevel": "Low|Medium|High|Low-Medium|Medium-High",
      "lookFor": "string"
    }],
    "tips": "string",
    "serving": "string",
    "substitutions": {"ingredientName": ["sub1","sub2"]}
  }]
}

If no valid recipe can be made, return {"recipes":[]}.
`;
}

function buildUserPrompt(input) {
  const ingredients = Array.isArray(input?.ingredients) ? input.ingredients : [];
  return JSON.stringify(
    {
      selectedCuisine: input?.cuisine || "Global",
      selectedRegionalStyle: input?.regionalStyle || null,
      selectedLanguage: input?.language || "English",
      instructionStyle: input?.instructionStyle || "Simple",
      maxTimeMinutes: Number(input?.maxTime) || 30,
      objective: input?.objective || "Generate a realistic recipe",
      allowedIngredients: ingredients,
      allowedPantryBasics: BASIC_PANTRY,
      outputRules: {
        minSteps: MIN_STEPS,
        maxSteps: MAX_STEPS,
        multiSentencePerStep: true,
        mustIncludeTimeHeatCue: true,
      },
    },
    null,
    2
  );
}

function normalizeStep(step, idx) {
  return {
    stepNumber: Number(step.stepNumber) || idx + 1,
    title: step.title || `Step ${idx + 1}`,
    ingredients: step.ingredients || step.ingredient || "Mixed ingredients",
    instruction: step.instruction || step.text || "",
    time: step.time || "4-6 minutes",
    heatLevel: step.heatLevel || "Medium",
    lookFor: step.lookFor || "Aromatic and evenly cooked texture",
  };
}

function sentenceCount(text = "") {
  return text
    .split(/[.!?]+/)
    .map((v) => v.trim())
    .filter(Boolean).length;
}

function hasTimeHint(text = "") {
  return /\b\d+\s*[-to]*\s*\d*\s*(minute|min|minutes|second|seconds)\b/i.test(text);
}

function hasQuantityHint(text = "") {
  return /\b\d+([./]\d+)?\s*(cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|gram|grams|g|ml|litre|liter|pinch|clove|cloves|piece|pieces)\b/i.test(text);
}

function hasHeatHint(text = "") {
  return /\b(low|medium|high|low-medium|medium-high|low flame|medium flame|high flame)\b/i.test(text);
}

function isRecipeDetailed(recipe) {
  if (!Array.isArray(recipe.steps)) return false;
  if (recipe.steps.length < MIN_STEPS || recipe.steps.length > MAX_STEPS) return false;
  return recipe.steps.every((step) => {
    const instruction = step.instruction || "";
    return (
      sentenceCount(instruction) >= 2 &&
      !!(step.ingredients || "").trim() &&
      !!(step.time || "").trim() &&
      !!(step.heatLevel || "").trim() &&
      !!(step.lookFor || "").trim() &&
      (hasTimeHint(instruction) || hasTimeHint(step.time || "")) &&
      (hasHeatHint(instruction) || hasHeatHint(step.heatLevel || "")) &&
      (hasQuantityHint(instruction) || hasQuantityHint(step.ingredients || ""))
    );
  });
}

function normalizeRecipes(data) {
  const recipes = Array.isArray(data?.recipes) ? data.recipes : [];
  return {
    recipes: recipes.map((recipe) => {
      const steps = Array.isArray(recipe.steps)
        ? recipe.steps.map((step, idx) => normalizeStep(step, idx))
        : [];

      return {
        recipeName: recipe.recipeName || recipe.name || "SmartChefAI Recipe",
        cookingTime: recipe.cookingTime || `${recipe.cookTimeMinutes || 30} minutes`,
        difficulty: recipe.difficulty || "Easy",
        cuisine: recipe.cuisine || "Global",
        regionalStyle: recipe.regionalStyle ?? null,
        nutrition: recipe.nutrition || { calories: 350, protein: 16, carbs: 28, fat: 14 },
        ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
        steps,
        tips: recipe.tips || "Prep ingredients first and taste before final seasoning.",
        serving: recipe.serving || "Serve hot with a side salad or yogurt dip.",
        substitutions: recipe.substitutions || {},
      };
    }).filter((recipe) => isRecipeDetailed(recipe)),
  };
}

export async function generateRecipes(input) {
  if (!openai) {
    return { recipes: [] };
  }

  let last = { recipes: [] };
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.4,
      messages: [
        { role: "system", content: recipeSystemPrompt() },
        {
          role: "user",
          content: buildUserPrompt(input),
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices?.[0]?.message?.content || "{\"recipes\":[]}";
    const parsed = parseJson(content, { recipes: [] });
    const normalized = normalizeRecipes(parsed);
    last = normalized;

    if (normalized.recipes.length) {
      return normalized;
    }
  }

  return last;
}

export async function answerRecipeQuestion({ question, recipe }) {
  if (!openai) {
    return {
      answer: "I can only help with questions related to this recipe.",
    };
  }

  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You answer only recipe-related questions. If question is unrelated, reply exactly: I can only help with questions related to this recipe.",
      },
      {
        role: "user",
        content: JSON.stringify({ question, recipe }),
      },
    ],
  });

  return {
    answer:
      completion.choices?.[0]?.message?.content?.trim() ||
      "I can only help with questions related to this recipe.",
  };
}

function assistantFallbackTurn({ userUtterance, currentStepIndex = 0, totalSteps = 1, language = "English" }) {
  const text = String(userUtterance || "").toLowerCase();
  const lastStep = Math.max(totalSteps - 1, 0);
  if (text.includes("stop")) {
    return { reply: "Stopping hands-free cooking mode.", action: "stop", stepDelta: 0, language };
  }
  if (text.includes("previous") || text.includes("back")) {
    return { reply: "Sure, going to the previous step.", action: "previous", stepDelta: currentStepIndex > 0 ? -1 : 0, language };
  }
  if (text.includes("next") || text.includes("done") || text.includes("finished") || text.includes("what's next") || text.includes("whats next")) {
    return { reply: currentStepIndex < lastStep ? "Great, moving to the next step." : "Nice work. You are already on the final step.", action: "next", stepDelta: currentStepIndex < lastStep ? 1 : 0, language };
  }
  if (text.includes("repeat")) {
    return { reply: "Sure, I will repeat this step.", action: "repeat", stepDelta: 0, language };
  }
  if (text.includes("pause")) {
    return { reply: "Okay, pausing. Say resume when you are ready.", action: "pause", stepDelta: 0, language };
  }
  if (text.includes("resume")) {
    return { reply: "Resuming now.", action: "resume", stepDelta: 0, language };
  }
  return { reply: "I can help with this recipe while we're cooking.", action: "none", stepDelta: 0, language };
}

function cookingAssistantSystemPrompt() {
  return `
You are SmartChefAI's hands-free cooking voice assistant.
You are in a live cooking session. Be conversational, friendly, and concise.
Never sound like a textbook narrator.

Rules:
* Reply only for this recipe context.
* If user asks unrelated question, reply exactly: "I can help with this recipe while we're cooking."
* Understand intent from natural phrases:
  - Next: "done", "finished", "what's next", "next"
  - Previous: "previous", "go back"
  - Repeat: "repeat", "say again"
  - Pause: "pause", "wait"
  - Resume: "resume", "continue"
  - Stop: "stop cooking", "exit"
* Return action field from:
  "next","previous","repeat","pause","resume","stop","none"
* stepDelta must be:
  1 for next, -1 for previous, 0 otherwise.
* Keep guidance practical for active cooking (times, heat, cues).
* Respond in the requested language (English, Kannada, Hindi, Tamil, Telugu).

Return ONLY JSON:
{
  "reply": "string",
  "action": "next|previous|repeat|pause|resume|stop|none",
  "stepDelta": -1|0|1,
  "language": "English|Kannada|Hindi|Tamil|Telugu"
}
`;
}

export async function cookingAssistantTurn(input) {
  const fallback = assistantFallbackTurn(input || {});
  if (!openai) {
    return fallback;
  }

  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.35,
    messages: [
      { role: "system", content: cookingAssistantSystemPrompt() },
      { role: "user", content: JSON.stringify(input || {}) },
    ],
    response_format: { type: "json_object" },
  });

  const content = completion.choices?.[0]?.message?.content || "{}";
  const parsed = parseJson(content, {});
  return {
    reply: String(parsed.reply || fallback.reply),
    action: ["next", "previous", "repeat", "pause", "resume", "stop", "none"].includes(parsed.action) ? parsed.action : fallback.action,
    stepDelta: Number(parsed.stepDelta) === 1 ? 1 : Number(parsed.stepDelta) === -1 ? -1 : 0,
    language: parsed.language || input?.language || "English",
  };
}
