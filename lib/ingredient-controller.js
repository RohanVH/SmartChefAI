import { detectIngredientsFromImage } from "./vision.js";

const commonIngredients = [
  "lemon",
  "lime",
  "tomato",
  "onion",
  "potato",
  "garlic",
  "ginger",
  "egg",
  "milk",
  "spinach",
  "rice",
  "carrot",
  "capsicum",
  "chili",
  "coriander",
  "paneer",
  "chicken",
  "cauliflower",
  "cabbage",
  "broccoli",
  "beans",
  "peas",
  "corn",
  "mushroom",
  "beetroot",
  "cucumber",
  "mint",
  "turmeric",
  "mustard seeds",
  "cumin",
  "black pepper",
  "salt",
  "oil",
  "ghee",
  "yogurt",
  "curd",
  "butter",
  "cheese",
  "tofu",
  "fish",
  "prawn",
  "mutton",
  "flour",
  "wheat flour",
  "maida",
  "oats",
  "poha",
  "semolina",
  "chickpea",
  "rajma",
  "lentils",
  "green chili",
  "red chili",
];

export async function autocompleteIngredients(req, res) {
  const query = String(req.query.q || "").trim().toLowerCase();
  if (!query) return res.json({ suggestions: [] });

  const suggestions = commonIngredients
    .filter((item) => item.includes(query))
    .slice(0, 8)
    .map((name) => ({
      name,
      image: `https://spoonacular.com/cdn/ingredients_100x100/${encodeURIComponent(name.replace(/\s+/g, "-"))}.png`,
    }));

  return res.json({ suggestions });
}

export async function detectIngredients(req, res) {
  try {
    const { imageBase64 } = req.body;
    const detected = await detectIngredientsFromImage(imageBase64);
    return res.json({ ingredients: detected });
  } catch {
    return res.status(500).json({ error: "Failed to detect ingredients" });
  }
}
