import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { compressFoodPhoto } from "@/lib/image-utils";
import { identifyFoodPhoto } from "@/lib/recipes/food-image.functions";

/** Reads a food photo with the AI and reports the ingredients or dish it can see. */
export function useFoodPhoto(language: string, onIngredients: (items: string[]) => void) {
  const identify = useServerFn(identifyFoodPhoto);
  const [photo, setPhoto] = useState<string>();
  const [status, setStatus] = useState<string>();
  const [dishGuess, setDishGuess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const clear = () => {
    setPhoto(undefined);
    setStatus(undefined);
    setDishGuess(null);
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setStatus("Please choose an image file.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setStatus("Please choose a photo smaller than 12 MB.");
      return;
    }
    setLoading(true);
    setStatus("Looking at your photo…");
    setDishGuess(null);
    try {
      const imageDataUrl = await compressFoodPhoto(file);
      setPhoto(imageDataUrl);
      const result = await identify({ data: { imageDataUrl, language } });
      if (!result.ok) {
        setStatus(result.error);
        return;
      }
      const items = result.data.ingredients;
      if (items.length) onIngredients(items);
      setDishGuess(result.data.dishName);
      setStatus(`${result.data.observation}${items.length ? ` I added ${items.length} ingredient${items.length === 1 ? "" : "s"} for you to review.` : ""}`);
    } catch {
      setStatus("This photo could not be read. Please try another one, or type instead.");
    } finally {
      setLoading(false);
    }
  };

  return { photo, status, dishGuess, loading, handleFile, clear };
}
