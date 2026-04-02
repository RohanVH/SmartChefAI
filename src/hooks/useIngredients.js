import { useMemo, useState } from "react";
import { toTitleCase } from "../utils/helpers";

export function useIngredients() {
  const [ingredients, setIngredients] = useState([]);

  const addIngredient = (name) => {
    const normalized = toTitleCase(name.trim());
    if (!normalized) return;
    setIngredients((prev) =>
      prev.some((item) => item.toLowerCase() === normalized.toLowerCase()) ? prev : [...prev, normalized]
    );
  };

  const removeIngredient = (name) => setIngredients((prev) => prev.filter((v) => v !== name));
  const resetIngredients = () => setIngredients([]);

  return useMemo(
    () => ({
      ingredients,
      addIngredient,
      removeIngredient,
      resetIngredients,
      setIngredients,
    }),
    [ingredients]
  );
}
