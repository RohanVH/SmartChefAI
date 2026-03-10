import { useState } from "react";
import { recipeService } from "../services/recipeService";

export function useRecipes() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadRecipes = async (payload, mode = "generate") => {
    setLoading(true);
    setError("");
    try {
      const data =
        mode === "surprise"
          ? await recipeService.surpriseMe(payload)
          : mode === "leftover"
            ? await recipeService.leftoverSaver(payload)
            : await recipeService.generateRecipes(payload);
      setRecipes(data.recipes || []);
      if (!data.recipes?.length && data.message) setError(data.message);
    } catch {
      setError("Failed to generate recipes. Please try again.");
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  return { recipes, setRecipes, loadRecipes, loading, error };
}
