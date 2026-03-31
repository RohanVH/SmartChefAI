import { useEffect, useState } from "react";
import { getApiErrorMessage } from "../services/api";
import { recipeService } from "../services/recipeService";

export function useRecipes() {
  const [recipes, setRecipesState] = useState(() => recipeService.getGeneratedRecipes());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const setRecipes = (value) => {
    const next = typeof value === "function" ? value(recipes) : value;
    setRecipesState(next);
    recipeService.saveGeneratedRecipes(next || []);
  };

  useEffect(() => {
    recipeService.saveGeneratedRecipes(recipes || []);
  }, [recipes]);

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
      setRecipesState(data.recipes || []);
      recipeService.saveGeneratedRecipes(data.recipes || []);
      if (!data.recipes?.length && data.message) setError(data.message);
    } catch (error) {
      setError(getApiErrorMessage(error, "Failed to generate recipes. Please try again."));
      setRecipesState([]);
      recipeService.saveGeneratedRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  return { recipes, setRecipes, loadRecipes, loading, error };
}
