import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const MIN_STEPS = 8;
const MAX_STEPS = 12;
const BASIC_PANTRY = ["oil", "salt", "water", "ghee"];
const SUBSTITUTION_MAP = {
  garlic: ["ginger", "shallot", "garlic powder"],
  onion: ["shallot", "leek", "spring onion whites"],
  tomato: ["tomato puree", "curd", "a splash of lemon with onion"],
  curd: ["plain yogurt", "coconut yogurt", "cream"],
  yogurt: ["curd", "plain yogurt", "cream"],
  cream: ["cashew paste", "milk", "hung curd"],
  butter: ["ghee", "oil"],
  oil: ["ghee", "butter"],
  chicken: ["paneer", "mushroom", "tofu"],
  paneer: ["tofu", "mushroom", "boiled potato"],
  egg: ["paneer", "tofu", "boiled potato"],
};

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
* Include substitution suggestions whenever an ingredient is commonly unavailable.
* Respect the user's requested max time, preferred difficulty, spice level, diet preference, skill level, and available tools.
* Never give unsafe cooking advice. Do not suggest tasting raw meat, touching hot oil, leaving heat unattended, or using damaged equipment.
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
      difficultyPreference: input?.difficultyPreference || "Balanced",
      spiceLevel: input?.spiceLevel || "Medium",
      dietPreference: input?.dietPreference || "Flexible",
      skillLevel: input?.skillLevel || "Home Cook",
      availableTools: input?.availableTools || [],
      maxTimeMinutes: Number(input?.maxTime) || 30,
      objective: input?.objective || "Generate a realistic recipe",
      substitutionTargets: input?.missingIngredients || [],
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
        { role: "user", content: buildUserPrompt(input) },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices?.[0]?.message?.content || "{\"recipes\":[]}";
    const parsed = parseJson(content, { recipes: [] });
    const normalized = normalizeRecipes(parsed);
    last = normalized;

    if (normalized.recipes.length) return normalized;
  }

  return last;
}

function stepTextForMatching(step = {}) {
  return `${step.ingredients || ""} ${step.ingredient || ""} ${step.instruction || ""} ${step.text || ""}`.toLowerCase();
}

function findQuantityForQuestion(question = "", recipe = {}, currentStep = null) {
  const lower = String(question || "").toLowerCase();
  const normalizedIngredients = (recipe?.ingredients || []).map((item) => {
    if (typeof item === "string") return { name: item, quantity: "as needed" };
    return { name: String(item?.name || "").trim(), quantity: String(item?.quantity || "").trim() };
  }).filter((item) => item.name);

  const directMatch = normalizedIngredients.find((item) => lower.includes(item.name.toLowerCase()));
  if (directMatch?.quantity) return directMatch;

  if (/(oil|ghee|butter)/.test(lower)) {
    const fatMatch = normalizedIngredients.find((item) => /(oil|ghee|butter)/i.test(item.name));
    if (fatMatch?.quantity) return fatMatch;
  }

  const step = currentStep || recipe?.currentStep || {};
  const stepText = stepTextForMatching(step);
  const stepIngredientMatch = normalizedIngredients.find((item) => stepText.includes(item.name.toLowerCase()) && item.quantity);
  if (stepIngredientMatch?.quantity) return stepIngredientMatch;

  const extractedStepMatch = extractStepQuantityMatch(question, step);
  if (extractedStepMatch?.quantity) return extractedStepMatch;

  return null;
}

function extractStepQuantityMatch(question = "", currentStep = null) {
  const lower = String(question || "").toLowerCase();
  const stepText = stepTextForMatching(currentStep || {});
  const targetNames = /(oil|ghee|butter)/.test(lower) ? ["oil", "ghee", "butter"] : [];

  for (const name of targetNames) {
    const patterns = [
      new RegExp(`(\\d+(?:[./]\\d+)?\\s*(?:tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|cup|cups|ml|l|litre|liter|pinch)?)\\s+${name}\\b`, "i"),
      new RegExp(`${name}\\b[^.\\n,;:]{0,24}?(\\d+(?:[./]\\d+)?\\s*(?:tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|cup|cups|ml|l|litre|liter|pinch)?)`, "i"),
    ];
    for (const pattern of patterns) {
      const match = stepText.match(pattern);
      if (match?.[1]) {
        return { name, quantity: match[1].trim() };
      }
    }
  }

  return null;
}

function isPrepOnlyStep(step = {}) {
  const text = `${step.title || ""} ${step.instruction || ""} ${step.text || ""}`.toLowerCase();
  return /(measure|organize|prep|prepare|portion|ready near|within reach|set aside)/.test(text);
}

function findUpcomingStepQuantity(question = "", recipe = {}, currentStepIndex = 0) {
  const steps = Array.isArray(recipe?.steps) ? recipe.steps : [];
  for (let idx = currentStepIndex + 1; idx < steps.length; idx += 1) {
    const step = steps[idx] || {};
    const match = findQuantityForQuestion(question, recipe, step);
    if (match?.quantity) {
      return {
        ...match,
        stepNumber: Number(step.stepNumber) || idx + 1,
        stepTitle: step.title || `Step ${idx + 1}`,
      };
    }
    if (!isPrepOnlyStep(step)) break;
  }
  return null;
}

function resolveRecipeReference(question = "", recipe = {}, previousMessages = []) {
  const lower = String(question || "").toLowerCase();
  if (!/\bit\b|that|this|them/.test(lower)) return null;

  const currentStep = recipe?.currentStep || recipe?.steps?.[recipe?.currentStepIndex || 0] || recipe?.steps?.[0] || null;
  const stepIngredients = String(currentStep?.ingredients || currentStep?.ingredient || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (stepIngredients.length) return stepIngredients[0];

  const historyText = previousMessages.map((item) => item.text || "").join(" ").toLowerCase();
  const ingredientNames = (recipe?.ingredients || []).map((item) => String(item?.name || item || "")).filter(Boolean);
  return ingredientNames.find((name) => historyText.includes(name.toLowerCase())) || ingredientNames[0] || null;
}

function answerRecipeQuestionFallback({ question, recipe, previousMessages = [] }) {
  const lower = String(question || "").toLowerCase();
  const currentStep = recipe?.currentStep || recipe?.steps?.[recipe?.currentStepIndex || 0] || recipe?.steps?.[0] || null;
  const ingredientNames = (recipe?.ingredients || []).map((item) => String(item?.name || item || "").toLowerCase());
  const resolvedReference = resolveRecipeReference(question, recipe, previousMessages);
  const targetIngredient = resolvedReference || ingredientNames[0] || "this ingredient";
  const quantityMatch = findQuantityForQuestion(question, recipe, currentStep);
  const upcomingQuantityMatch = findUpcomingStepQuantity(question, recipe, Number(recipe?.currentStepIndex) || 0);

  if (/burn|burning|too hot|smoke/.test(lower)) {
    return {
      answer: "Lower the heat right away, move the pan off the burner for 20 to 30 seconds, and stir continuously. If this is a sauce or masala, add a small splash of water to cool it down, then return to low or medium heat.",
    };
  }

  if (/oil hot|hot enough|is the oil ready/.test(lower)) {
    return {
      answer: "Look for a light shimmer on the oil and a loose, fluid movement when you tilt the pan. If you drop in a tiny bit of onion or cumin and it sizzles gently right away, the oil is ready.",
    };
  }

  if ((/garlic/.test(lower) || resolvedReference === "garlic" || /\bit\b/.test(lower)) && /(replace|substitute|instead|without|dont have|don't have|no )/.test(lower)) {
    return {
      answer: `You can replace ${targetIngredient} with a close flavor match and add it gradually. For garlic specifically, use a little extra ginger, shallot, onion, or a pinch of garlic powder if you have it.`,
    };
  }

  if (/(replace|substitute|instead|without|dont have|don't have|no )/.test(lower)) {
    return {
      answer: `If you do not have ${targetIngredient}, use a similar ingredient with the same cooking role and add it in a smaller amount first. Taste after a minute or two, then adjust seasoning so the recipe stays balanced.`,
    };
  }

  if (/salt|salty|too much salt/.test(lower)) {
    return {
      answer: "If it tastes too salty, add a little water, tomato, cream, curd, or extra base ingredients like onion to dilute it. Simmer briefly, taste again, and only then adjust the rest of the seasoning.",
    };
  }

  if (/stick|sticking|stuck/.test(lower)) {
    return {
      answer: "Lower the heat and loosen the pan with a small splash of water or oil, depending on the dish. Stir gently with a flat spoon and make sure the pan is not too dry before continuing.",
    };
  }

  if (/raw|cooked|done|ready/.test(lower) && currentStep?.lookFor) {
    return {
      answer: `Use this cue for the current step: ${currentStep.lookFor}. If the texture, aroma, and color have not reached that point yet, give it another minute on controlled heat and check again.`,
    };
  }

  if (/how much|how many|quantity|amount/.test(lower) && quantityMatch?.quantity) {
    return {
      answer: `Use ${quantityMatch.quantity} of ${quantityMatch.name} here.`,
    };
  }

  if (/how much|how many|quantity|amount/.test(lower) && /(oil|ghee|butter)/.test(lower) && isPrepOnlyStep(currentStep)) {
    return {
      answer: "This step is just prep, so you do not need to add oil yet. Add the oil when the pan is heated in a later step.",
    };
  }

  return {
    answer: currentStep?.instruction
      ? `For this step, ${currentStep.instruction.split(".")[0].trim()}.`
      : "Keep the heat steady, make one small adjustment at a time, and watch the texture closely.",
  };
}

export async function answerRecipeQuestion({ question, recipe, previousMessages = [] }) {
  if (!openai) {
    return answerRecipeQuestionFallback({ question, recipe, previousMessages });
  }

  const resolvedReference = resolveRecipeReference(question, recipe, previousMessages);
  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You are SmartChefAI's friendly chef assistant for a live cooking session. You will receive the recipe name, the current step, the ingredient list with quantities, recent conversation, and the user's exact question. Answer the exact question first. Do not repeat the full step unless the user asks for it. Be specific with quantities, timings, heat, and rescue actions when the recipe context includes them. Keep the reply short and practical, usually 1 to 3 sentences. Resolve vague words like it, this, that, or them from the current step or recent conversation before answering. Never suggest unsafe actions such as touching hot oil, tasting undercooked meat, or leaving heat unattended. If the question is unrelated to this recipe, reply exactly: I can only help with questions related to this recipe.",
      },
      {
        role: "user",
        content: JSON.stringify({ question, resolvedReference, previousMessages, recipe }),
      },
    ],
  });

  return {
    answer:
      completion.choices?.[0]?.message?.content?.trim() ||
      answerRecipeQuestionFallback({ question, recipe, previousMessages }).answer,
  };
}

function assistantFallbackTurn({ userUtterance, recipe = {}, currentStepIndex = 0, previousMessages = [] }) {
  const currentStep = recipe?.steps?.[currentStepIndex] || recipe?.currentStep || null;
  const quantityMatch = findQuantityForQuestion(userUtterance, recipe, currentStep);
  const upcomingQuantityMatch = findUpcomingStepQuantity(userUtterance, recipe, currentStepIndex);
  const fallbackAnswer = answerRecipeQuestionFallback({
    question: userUtterance,
    recipe: {
      ...recipe,
      currentStepIndex,
      currentStep,
    },
    previousMessages,
  }).answer;

  if (/how much|how many|quantity|amount/.test(String(userUtterance || '').toLowerCase()) && quantityMatch?.quantity) {
    return {
      intent: "answer",
      action: null,
      parameters: { step: null },
      response: `Use ${quantityMatch.quantity} of ${quantityMatch.name} for this step.`,
    };
  }

  if (/how much|how many|quantity|amount/.test(String(userUtterance || '').toLowerCase()) && /(oil|ghee|butter)/.test(String(userUtterance || '').toLowerCase()) && isPrepOnlyStep(currentStep)) {
    return {
      intent: "answer",
      action: null,
      parameters: { step: null },
      response: "This step is only prep, so you do not need to add oil yet. Add the oil in the step where the pan is heated.",
    };
  }

  return {
    intent: "answer",
    action: null,
    parameters: { step: null },
    response: fallbackAnswer || "I can help with this recipe while we're cooking.",
  };
}

function cookingAssistantSystemPrompt() {
  return `
You are a smart cooking assistant.

You must:
* Understand user intent
* Decide if the user is asking a question or requesting an action
* Return ONLY JSON in the specified format

Rules:
* If user asks a question, set intent to "answer".
* If user gives an instruction, set intent to "action".
* Always include a helpful natural-language response.
* Be precise, practical, and short.
* Use recipe context including recipe name, current step, ingredients with quantities, and recent conversation.
* Never suggest unsafe cooking actions.
* If the user asks for navigation, use one of these actions:
  - "go_to_step"
  - "next_step"
  - "previous_step"
  - "stop"
  - "repeat"
* Use action null when intent is "answer".
* If using "go_to_step", set parameters.step to the exact 1-based step number.
* For all other actions, set parameters.step to null.
* Do not include any text outside JSON.

Return JSON in this exact shape:
{
  "intent": "answer" | "action",
  "action": "go_to_step" | "next_step" | "previous_step" | "stop" | "repeat" | null,
  "parameters": {
    "step": number | null
  },
  "response": "natural language reply for user"
}
`;
}

export async function cookingAssistantTurn(input) {
  const fallback = assistantFallbackTurn(input || {});
  if (!openai) {
    return fallback;
  }

  try {
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.25,
      messages: [
        { role: "system", content: cookingAssistantSystemPrompt() },
        { role: "user", content: JSON.stringify(input || {}) },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices?.[0]?.message?.content || "{}";
    const parsed = parseJson(content, null);
    if (!parsed || typeof parsed !== "object") {
      return fallback;
    }

    const normalizedIntent = parsed.intent === "action" ? "action" : "answer";
    const allowedActions = ["go_to_step", "next_step", "previous_step", "stop", "repeat", null];
    const normalizedAction = allowedActions.includes(parsed.action) ? parsed.action : null;
    const normalizedStep = Number.isFinite(Number(parsed?.parameters?.step)) ? Number(parsed.parameters.step) : null;
    const normalizedResponse = String(parsed.response || fallback.response || "I can help with this recipe while we're cooking.").trim();

    return {
      intent: normalizedIntent,
      action: normalizedIntent === "action" ? normalizedAction : null,
      parameters: {
        step: normalizedAction === "go_to_step" && normalizedStep ? normalizedStep : null,
      },
      response: normalizedResponse,
    };
  } catch {
    return fallback;
  }
}
function extractIngredientNames(recipe = {}) {
  return (recipe.ingredients || [])
    .map((item) => String(item?.name || item || "").trim())
    .filter(Boolean);
}

function findIngredientMatch(recipe = {}, text = "") {
  const lower = String(text || "").toLowerCase();
  return extractIngredientNames(recipe).find((name) => lower.includes(name.toLowerCase())) || null;
}

function pickSubstitutions(target = "") {
  const normalized = String(target || "").toLowerCase().trim();
  if (!normalized) return ["a similar ingredient"];
  return SUBSTITUTION_MAP[normalized] || ["a similar ingredient", "a milder version of it"];
}

function replaceIngredientInText(text = "", target = "", replacement = "") {
  if (!text || !target || !replacement) return text;
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(escaped, "gi"), replacement);
}

function normalizeAdaptedRecipe(recipe = {}) {
  return {
    ...recipe,
    steps: Array.isArray(recipe.steps) ? recipe.steps.map((step, idx) => normalizeStep(step, idx)) : [],
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    substitutions: recipe.substitutions || {},
    adaptationNotes: Array.isArray(recipe.adaptationNotes) ? recipe.adaptationNotes : [],
  };
}

function parseChangeRequest(changeRequest = "", recipe = {}, previousMessages = []) {
  const raw = String(changeRequest || "").trim();
  const lower = raw.toLowerCase();
  const matchedIngredient = findIngredientMatch(recipe, lower);
  const explicitSwap = lower.match(/replace\s+(.+?)\s+with\s+(.+?)(?:$|[,.])/i) || lower.match(/use\s+(.+?)\s+instead of\s+(.+?)(?:$|[,.])/i);
  if (explicitSwap) {
    const first = explicitSwap[1].trim();
    const second = explicitSwap[2].trim();
    const firstIsPronoun = /^(it|this|that|them)$/.test(first);
    if (lower.includes("instead of")) {
      return { targetIngredient: firstIsPronoun ? (matchedIngredient || second) : second, replacementIngredient: first, reason: raw };
    }
    return { targetIngredient: firstIsPronoun ? (matchedIngredient || first) : first, replacementIngredient: second, reason: raw };
  }

  const missingMatch = lower.match(/(?:don't have|dont have|no|without|out of)\s+([a-zA-Z ]+)/i);
  const targetIngredient = matchedIngredient || missingMatch?.[1]?.trim() || resolveRecipeReference(raw, recipe, previousMessages) || extractIngredientNames(recipe)[0] || "the ingredient";
  const substitution = pickSubstitutions(targetIngredient)[0];
  return {
    targetIngredient,
    replacementIngredient: substitution,
    reason: raw || `Need an alternative for ${targetIngredient}`,
  };
}

function adaptRecipeFallback({ recipe, currentStepIndex = 0, changeRequest = "", previousMessages = [] }) {
  const normalizedRecipe = normalizeAdaptedRecipe(recipe);
  const { targetIngredient, replacementIngredient, reason } = parseChangeRequest(changeRequest, normalizedRecipe, previousMessages);
  const target = String(targetIngredient || "").trim();
  const replacement = String(replacementIngredient || "").trim();
  const suggestions = Array.from(new Set([replacement, ...pickSubstitutions(target).filter((item) => item !== replacement)]));

  const ingredients = normalizedRecipe.ingredients.map((item) => {
    const name = String(item?.name || item || "");
    if (!target || name.toLowerCase() !== target.toLowerCase()) return item;
    return {
      ...item,
      name: replacement,
      originalName: name,
      quantity: item.quantity || "same amount as needed",
      note: `Adjusted from ${name}`,
    };
  });

  const steps = normalizedRecipe.steps.map((step, idx) => {
    if (idx < currentStepIndex) return step;
    const replacedIngredients = replaceIngredientInText(step.ingredients || step.ingredient || "", target, replacement);
    const replacedInstruction = replaceIngredientInText(step.instruction || step.text || "", target, replacement);
    return {
      ...step,
      ingredients: replacedIngredients,
      ingredient: replacedIngredients,
      instruction: replacedInstruction,
      text: replacedInstruction,
      lookFor: idx === currentStepIndex
        ? `${step.lookFor || "Cooked texture"}. Since you switched ${target} to ${replacement}, taste a little earlier and adjust gently.`
        : step.lookFor,
    };
  });

  const substitutions = {
    ...(normalizedRecipe.substitutions || {}),
    [target]: suggestions,
  };
  const adaptationNotes = [
    ...(normalizedRecipe.adaptationNotes || []),
    {
      atStep: currentStepIndex + 1,
      targetIngredient: target,
      replacementIngredient: replacement,
      reason,
      createdAt: new Date().toISOString(),
    },
  ];
  const summary = `${replacement} will work in place of ${target}. I updated the remaining steps so you can keep going, and I would taste a little earlier than usual because the flavor may land faster.`;

  return {
    summary,
    recipe: {
      ...normalizedRecipe,
      ingredients,
      substitutions,
      adaptationNotes,
      steps,
    },
  };
}

export async function adaptRecipeInProgress(input = {}) {
  const fallback = adaptRecipeFallback(input);
  if (!openai) {
    return fallback;
  }

  try {
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You adapt in-progress recipes for home cooks. Update only the remaining steps from the current step onward. Keep completed steps untouched. Make substitutions realistic, preserve quantities when possible, and keep the reply spoken-word friendly. Return only JSON with keys summary and recipe.",
        },
        {
          role: "user",
          content: JSON.stringify(input),
        },
      ],
      response_format: { type: "json_object" },
    });

    const parsed = parseJson(completion.choices?.[0]?.message?.content || "{}", {});
    if (!parsed?.recipe) {
      return fallback;
    }

    return {
      summary: String(parsed.summary || fallback.summary),
      recipe: normalizeAdaptedRecipe({
        ...fallback.recipe,
        ...parsed.recipe,
        substitutions: {
          ...fallback.recipe.substitutions,
          ...(parsed.recipe?.substitutions || {}),
        },
        adaptationNotes: [...(fallback.recipe.adaptationNotes || []), ...(parsed.recipe?.adaptationNotes || [])],
      }),
    };
  } catch {
    return fallback;
  }
}














