import { memo, useEffect, useState } from "react";
import { foodFallbackIcon } from "../utils/helpers";
import { recipeService } from "../services/recipeService";

function FoodImageComponent({ query, seed = "", alt, className = "", loading = "lazy", sizes = "100vw" }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loadingState, setLoadingState] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoadingState(true);

    async function fetchImage() {
      if (!query) {
        if (mounted) {
          setImageUrl(foodFallbackIcon(800, 600));
          setLoadingState(false);
        }
        return;
      }

      try {
        const result = await recipeService.getRecipeImage(query);
        if (mounted) setImageUrl(result.image || foodFallbackIcon(800, 600));
      } catch {
        if (mounted) setImageUrl(foodFallbackIcon(800, 600));
      } finally {
        if (mounted) setLoadingState(false);
      }
    }

    fetchImage();
    return () => {
      mounted = false;
    };
  }, [query, seed]);

  return (
    <div className={`relative overflow-hidden bg-slate-900 ${className}`}>
      {loadingState ? <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900" /> : null}
      <img
        src={imageUrl || foodFallbackIcon(800, 600)}
        alt={alt || query || "food image"}
        className="h-full w-full object-cover"
        loading={loading}
        sizes={sizes}
        decoding="async"
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = foodFallbackIcon(800, 600);
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
    </div>
  );
}

const FoodImage = memo(FoodImageComponent);
export default FoodImage;
