import { useEffect, useState } from "react";
import { foodFallbackIcon } from "../utils/helpers";
import { recipeService } from "../services/recipeService";

export default function FoodImage({ query, seed = "", alt, className = "", loading = "lazy" }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loadingState, setLoadingState] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoadingState(true);
    setError(false);
    
    async function fetchImage() {
      if (!query) {
        setImageUrl(foodFallbackIcon(800, 600));
        setLoadingState(false);
        return;
      }
      
      try {
        // Use the new recipe image API with caching
        const result = await recipeService.getRecipeImage(query);
        
        if (mounted && result.image) {
          setImageUrl(result.image);
        } else if (mounted) {
          // No image found, use fallback
          setError(true);
          setImageUrl(foodFallbackIcon(800, 600));
        }
      } catch (err) {
        if (mounted) {
          setError(true);
          setImageUrl(foodFallbackIcon(800, 600));
        }
      } finally {
        if (mounted) {
          setLoadingState(false);
        }
      }
    }
    
    fetchImage();
    
    return () => {
      mounted = false;
    };
  }, [query, seed]);

  // Reset when query changes
  useEffect(() => {
    setError(false);
  }, [query]);

  return (
    <img
      src={imageUrl || foodFallbackIcon(800, 600)}
      alt={alt || query || "food image"}
      className={className}
      loading={loading}
      onError={(e) => {
        if (!error) {
          setError(true);
          e.currentTarget.src = foodFallbackIcon(800, 600);
        }
      }}
    />
  );
}
