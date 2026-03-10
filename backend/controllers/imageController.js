import { getRecipeImageFromMealDB, getCuratedFoodImage, getRecipeImagesBatch } from "../services/imageService.js";

export async function getRecipeImageController(req, res) {
  const recipeName = String(req.query.name || "").trim();
  
  if (!recipeName) {
    return res.json({ image: null, error: "Recipe name is required" });
  }

  try {
    // First try TheMealDB API
    let image = await getRecipeImageFromMealDB(recipeName);
    
    // If not found, try curated fallback
    if (!image) {
      image = getCuratedFoodImage(recipeName);
    }
    
    if (!image) {
      return res.json({ 
        image: null, 
        message: "No image found for this recipe" 
      });
    }
    
    return res.json({ image, recipeName });
  } catch (error) {
    return res.status(500).json({ 
      image: null, 
      error: "Failed to fetch recipe image" 
    });
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
  } catch (error) {
    return res.status(500).json({ 
      images: [], 
      error: "Failed to fetch recipe images" 
    });
  }
}

