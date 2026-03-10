import { useEffect, useMemo, useState } from "react";
import { foodFallbackIcon, getIngredientImageCandidates } from "../utils/helpers";

export default function IngredientImage({ name, alt, className = "", loading = "lazy" }) {
  const candidates = useMemo(() => getIngredientImageCandidates(name), [name]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [name]);

  return (
    <img
      src={candidates[index] || foodFallbackIcon(80, 80)}
      alt={alt || name || "ingredient"}
      className={className}
      loading={loading}
      onError={(e) => {
        if (index < candidates.length - 1) {
          setIndex((v) => v + 1);
          return;
        }
        e.currentTarget.onerror = null;
        e.currentTarget.src = foodFallbackIcon(80, 80);
      }}
    />
  );
}

