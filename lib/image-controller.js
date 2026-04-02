import { buildRecipeImageQuery, getCuratedFoodImage, getRecipeImageFromMealDB, getRecipeImagesBatch, getUnsplashRecipeImage } from "./image-core.js";

export async function getRecipeImageController(req, res) {
  const recipeName = String(req.query.name || "").trim();

  if (!recipeName) {
    return res.json({ image: null, error: "Recipe name is required" });
  }

  try {
    const query = buildRecipeImageQuery(recipeName);
    let image = await getRecipeImageFromMealDB(recipeName);
    let source = "themealdb";

    if (!image) {
      image = getCuratedFoodImage(recipeName);
      source = image ? "curated" : source;
    }

    if (!image) {
      image = getUnsplashRecipeImage(recipeName);
      source = "unsplash";
    }

    return res.json({ image, recipeName, query, source });
  } catch {
    return res.status(500).json({ image: null, error: "Failed to fetch recipe image" });
  }
}

export async function getRecipeImagesBatchController(req, res) {
  const { recipes } = req.body;

  if (!Array.isArray(recipes) || recipes.length === 0) {
    return res.json({ images: [] });
  }

  try {
    const results = await getRecipeImagesBatch(recipes);
    return res.json({ images: results });
  } catch {
    return res.status(500).json({ images: [], error: "Failed to fetch recipe images" });
  }
}
