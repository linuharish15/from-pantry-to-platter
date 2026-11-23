import { useServerFn } from "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowLeft, ArrowRight, Camera, Check, ChefHat, Clock3, CookingPot, Flame, Globe2, ImagePlus, Leaf, LoaderCircle, Minus, Plus, RotateCcw, ShoppingBasket, Sparkles, WandSparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import biryaniImage from "@/assets/biryani-editorial.jpg";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getRecipeRequestError, recipeRequestSchema, type RecipeRequestInput } from "@/lib/recipes/recipe-validation";
import { getRecipes } from "@/lib/recipes/recipes.functions";
import type { RecipeResponse } from "@/lib/recipes/recipes.server";
import { KitchenConsultation } from "@/components/KitchenConsultation";
import { compressFoodPhoto } from "@/lib/image-utils";
import { identifyFoodPhoto } from "@/lib/recipes/food-image.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pantry & Plate | Recipes from what you have" },
      { name: "description", content: "Tell Pantry & Plate what's in your kitchen for tailored dish ideas, complete recipes and ingredient shopping lists." },
      { property: "og:title", content: "Pantry & Plate | Recipes from what you have" },
      { property: "og:description", content: "Turn the ingredients in your kitchen into your next favorite meal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RecipeAssistant,
});

type Mode = "ingredients" | "dish";

const sampleIngredients = ["Basmati rice", "Chicken", "Onion", "Yogurt"];
const ingredientSuggestions = [
  "Tomato", "Potato", "Garlic", "Ginger", "Spinach", "Carrot", "Bell pepper", "Egg", "Lentils",
  "Chickpeas", "Coconut milk", "Flour", "Butter", "Cheese", "Mushroom", "Tofu", "Lemon", "Cilantro",
];
const dishSuggestions = [
  "Chicken biryani", "Vegetable biryani", "Creamy tomato pasta", "Vegetable curry", "Pad Thai",
  "Tacos al pastor", "Miso soup", "Shakshuka", "Falafel", "Sushi rolls", "Mango lassi",
  "Chocolate cake", "Banana pancakes", "Vegetable dumplings", "Lentil soup", "Greek salad",
];
const cuisineOptions = [
  "All Worldwide Cuisines", "Indian", "Italian", "Chinese", "Japanese", "Thai", "Korean",
  "Mexican", "Mediterranean", "Middle Eastern", "French", "African", "Caribbean", "American",
  "British", "Spanish", "Southeast Asian", "Vietnamese", "Filipino", "Indonesian", "Turkish",
  "Greek", "Brazilian", "Ethiopian", "West African", "Nordic", "Persian", "Vegetarian", "Vegan",
  "Gluten-free", "Quick meals", "Desserts", "Snacks",
] as const;
const languageOptions = [
  { label: "English", value: "English" }, { label: "தமிழ்", value: "Tamil" },
  { label: "हिन्दी", value: "Hindi" }, { label: "Español", value: "Spanish" },
  { label: "Français", value: "French" }, { label: "日本語", value: "Japanese" },
  { label: "한국어", value: "Korean" }, { label: "中文", value: "Mandarin Chinese" },
  { label: "العربية", value: "Arabic" }, { label: "Português", value: "Portuguese" },
  { label: "Deutsch", value: "German" }, { label: "Italiano", value: "Italian" },
  { label: "বাংলা", value: "Bengali" }, { label: "తెలుగు", value: "Telugu" },
  { label: "मराठी", value: "Marathi" }, { label: "اردو", value: "Urdu" },
  { label: "Bahasa Indonesia", value: "Indonesian" }, { label: "Tiếng Việt", value: "Vietnamese" },
  { label: "ไทย", value: "Thai" }, { label: "Türkçe", value: "Turkish" },
  { label: "Русский", value: "Russian" }, { label: "Nederlands", value: "Dutch" },
  { label: "Ελληνικά", value: "Greek" }, { label: "Kiswahili", value: "Swahili" },
  { label: "Polski", value: "Polish" }, { label: "Українська", value: "Ukrainian" },
  { label: "فارسی", value: "Persian" }, { label: "മലയാളം", value: "Malayalam" },
];

function RecipeAssistant() {
  const generate = useServerFn(getRecipes);
  const identifyPhoto = useServerFn(identifyFoodPhoto);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("ingredients");
  const [ingredientText, setIngredientText] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [dishName, setDishName] = useState("");
  const [servings, setServings] = useState(2);
  const [servingsText, setServingsText] = useState("2");
  const [cuisine, setCuisine] = useState<(typeof cuisineOptions)[number]>("All Worldwide Cuisines");
  const [language, setLanguage] = useState("English");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [response, setResponse] = useState<RecipeResponse>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [foodPhoto, setFoodPhoto] = useState<string>();
  const [photoStatus, setPhotoStatus] = useState<string>();
  const [photoDish, setPhotoDish] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const resultsRef = useRef<HTMLElement>(null);
  const selectedRecipe = response?.recipes[selectedIndex];

  const readyCount = useMemo(() => selectedRecipe?.ingredients.filter((item) => item.haveIt).length ?? 0, [selectedRecipe]);

  const setServingCount = (value: number) => {
    const next = Math.min(100, Math.max(1, Math.round(value)));
    setServings(next);
    setServingsText(String(next));
  };

  useEffect(() => {
    if (response && !loading) {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [response, loading]);

  const addIngredient = (rawValue: string) => {
    const additions = rawValue.split(/[,\n]/).map((ingredient) => ingredient.trim()).filter(Boolean);
    if (!additions.length) return;
    setIngredients((existing) => {
      const known = new Set(existing.map((ingredient) => ingredient.toLocaleLowerCase()));
      return [...existing, ...additions.filter((ingredient) => {
        const key = ingredient.toLocaleLowerCase();
        if (known.has(key)) return false;
        known.add(key);
        return true;
      })].slice(0, 24);
    });
    setIngredientText("");
    setError(undefined);
  };

  const handleIngredientKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      addIngredient(ingredientText);
      return;
    }
    if (event.key === "Backspace" && !ingredientText && ingredients.length) {
      setIngredients((existing) => existing.slice(0, -1));
    }
  };

  const handleFoodPhoto = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoStatus("Choose an image file to identify ingredients or a dish.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setPhotoStatus("Choose a photo smaller than 12 MB.");
      return;
    }

    setPhotoLoading(true);
    setPhotoStatus("Looking for recognizable ingredients and dishes…");
    setPhotoDish(null);
    try {
      const imageDataUrl = await compressFoodPhoto(file);
      setFoodPhoto(imageDataUrl);
      const result = await identifyPhoto({ data: { imageDataUrl, language } });
      if (!result.ok) {
        setPhotoStatus(result.error);
        return;
      }

      const detectedIngredients = result.data.ingredients;
      if (detectedIngredients.length) addIngredient(detectedIngredients.join(", "));
      setPhotoDish(result.data.dishName);
      const ingredientNote = detectedIngredients.length
        ? ` Added ${detectedIngredients.length} ingredient suggestions for you to review.`
        : " No clear ingredients were identified; you can type them or use the dish suggestion.";
      setPhotoStatus(`${result.data.observation}${ingredientNote}`);
    } catch {
      setPhotoStatus("This photo could not be prepared. Try another image or type your ingredients.");
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading || photoLoading) return;

    const requestedServings = Number(servingsText);
    if (!/^\d+$/.test(servingsText) || requestedServings < 1 || requestedServings > 100) {
      setError("Enter a serving count from 1 to 100 people.");
      return;
    }
    setServingCount(requestedServings);

    const request: RecipeRequestInput = {
      mode,
      ingredients,
      dish: dishName.trim(),
      servings: requestedServings,
      cuisine,
      language,
    };
    const validationError = getRecipeRequestError(request);
    if (validationError) {
      setError(validationError);
      return;
    }
    const parsed = recipeRequestSchema.safeParse(request);
    if (!parsed.success) {
      setError("Please use up to 24 ingredients and choose between 1 and 100 people.");
      return;
    }

    setLoading(true);
    setError(undefined);
    setResponse(undefined);
    setCheckedIngredients(new Set());
    try {
      const result = await generate({ data: parsed.data });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setResponse(result.data);
      setSelectedIndex(0);
    } catch {
      setError("We couldn’t prepare recipes right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setIngredients([]);
    setIngredientText("");
    setDishName("");
    setResponse(undefined);
    setError(undefined);
    setCheckedIngredients(new Set());
    setFoodPhoto(undefined);
    setPhotoStatus(undefined);
    setPhotoDish(null);
  };

  const toggleIngredient = (index: number) => {
    setCheckedIngredients((existing) => {
      const next = new Set(existing);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="mx-auto max-w-[1420px] px-5 sm:px-8 lg:px-14">
        <header className="site-header flex h-[72px] items-center justify-between border-b border-border/70">
          <a href="#top" className="brand-lockup flex items-center gap-2.5" aria-label="Pantry & Plate home">
            <span className="brand-mark flex size-9 items-center justify-center bg-primary text-primary-foreground">
              <CookingPot size={19} strokeWidth={1.7} />
            </span>
            <span className="brand-name font-display text-[21px]">Pantry <span className="brand-amp">&</span> Plate</span>
          </a>
          <div className="flex items-center gap-4">
            <span className="top-note hidden items-center gap-2 text-xs font-medium text-muted-foreground sm:flex"><Sparkles size={14} className="text-primary" /> A little inspiration, a lot less waste</span>
            <Button variant="ghost" size="icon" className="fresh-button" onClick={clearForm} aria-label="Start a new recipe search" title="Start fresh">
              <RotateCcw size={17} />
            </Button>
          </div>
        </header>

        <section id="top" className="intro-section relative grid min-h-[276px] grid-cols-1 overflow-hidden border-b border-border/70 lg:grid-cols-[1fr_390px]">
          <div className="intro-copy relative z-10 flex flex-col justify-center py-8 md:py-10 lg:py-12">
            <div className="intro-overline mb-3 flex items-center gap-2 text-[11px] font-bold uppercase text-primary">
              <span className="overline-line inline-block h-px w-6 bg-primary" /> YOUR KITCHEN, YOUR STARTING POINT
            </div>
            <h1 className="intro-title max-w-[660px] font-display text-[40px] leading-[1.04] sm:text-[52px] lg:text-[56px]">
              Good things begin <span className="title-italic">in your kitchen.</span>
            </h1>
            <p className="intro-description mt-3 max-w-[460px] text-sm leading-6 text-muted-foreground">
              Tell us what you have. We’ll find something wonderful to make.
            </p>
            <div className="intro-stats mt-5 flex items-center gap-5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Leaf size={14} className="text-recipe-green" /> Make more of what you have</span>
              <span className="stats-divider h-4 w-px bg-border" />
              <span className="flex items-center gap-1.5"><Clock3 size={14} className="text-primary" /> Weeknight-friendly</span>
            </div>
          </div>
          <div className="intro-photo relative hidden lg:block">
            <img src={biryaniImage} width={1600} height={1008} alt="A bowl of freshly made chicken biryani with rice, herbs and lemon" className="intro-photo-image absolute inset-0 h-full w-full object-cover object-center" />
            <div className="intro-photo-note absolute bottom-4 right-4 flex items-center gap-2 bg-card/95 px-3 py-2 text-xs text-foreground shadow-sm">
              <Flame size={14} className="text-primary" /> A good meal starts here
            </div>
          </div>
        </section>

        <div className="workspace-grid grid grid-cols-1 gap-8 py-7 lg:grid-cols-[minmax(0,1.03fr)_minmax(360px,0.97fr)] lg:gap-14 lg:py-10">
          <section className="finder-column">
            <div className="section-kicker flex items-center gap-2 text-[11px] font-bold uppercase text-muted-foreground"><WandSparkles size={15} className="text-primary" /> A fresh idea for tonight</div>
            <h2 className="finder-title mt-2 font-display text-[30px] leading-tight">What sounds good?</h2>

            <div className="mode-switch mt-5 grid grid-cols-2 border border-border bg-card p-1">
              <Button type="button" variant="ghost" onClick={() => { setMode("ingredients"); setError(undefined); }} className={`mode-option justify-center ${mode === "ingredients" ? "mode-option-active" : ""}`} aria-pressed={mode === "ingredients"}>
                <ShoppingBasket size={16} /> <span>Use my ingredients</span>
              </Button>
              <Button type="button" variant="ghost" onClick={() => { setMode("dish"); setError(undefined); }} className={`mode-option justify-center ${mode === "dish" ? "mode-option-active" : ""}`} aria-pressed={mode === "dish"}>
                <ChefHat size={16} /> <span>Make a specific dish</span>
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="recipe-form mt-5">
              {mode === "ingredients" ? (
                <div className="form-field">
                  <label htmlFor="ingredient-input" className="field-label block text-sm font-semibold">What’s in your kitchen?</label>
                  <p id="ingredient-hint" className="field-help mt-1 text-xs text-muted-foreground">Add anything you’d like to cook with. We’ll do the thinking.</p>
                  <div className="ingredient-entry mt-3 border border-input bg-card px-3 py-2.5 focus-within:ring-2 focus-within:ring-ring/30">
                    {ingredients.length > 0 && (
                      <ul className="ingredient-chips mb-2 flex flex-wrap gap-1.5" aria-label="Your ingredients">
                        {ingredients.map((ingredient, index) => (
                          <li key={`${ingredient.toLowerCase()}-${index}`} className="ingredient-chip inline-flex items-center gap-1.5 bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                            <span>{ingredient}</span>
                            <button type="button" onClick={() => setIngredients((existing) => existing.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${ingredient}`} className="chip-remove inline-flex size-4 items-center justify-center text-muted-foreground"><X size={12} /></button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <Textarea id="ingredient-input" aria-describedby="ingredient-hint" value={ingredientText} onChange={(event) => setIngredientText(event.target.value)} onKeyDown={handleIngredientKey} onBlur={() => ingredientText.trim() && addIngredient(ingredientText)} rows={2} placeholder={ingredients.length ? "Add another ingredient…" : "Try rice, chicken, tomatoes…"} className="ingredient-textarea min-h-[48px] resize-y border-0 bg-transparent px-0 py-1 shadow-none focus-visible:ring-0" />
                  </div>
                  {ingredientText.trim().length > 1 && (
                    <div className="suggestion-row mt-2 flex flex-wrap items-center gap-2" aria-label="Ingredient suggestions">
                      <span className="text-[11px] text-muted-foreground">Suggestions:</span>
                      {ingredientSuggestions.filter((item) => item.toLowerCase().includes(ingredientText.trim().toLowerCase()) && !ingredients.some((added) => added.toLowerCase() === item.toLowerCase())).slice(0, 4).map((item) => (
                        <Button key={item} type="button" variant="outline" size="sm" className="sample-button h-7 rounded-full px-2.5 text-[11px]" onClick={() => addIngredient(item)}>{item}</Button>
                      ))}
                    </div>
                  )}
                  {ingredients.length < 4 && (
                    <div className="examples-row mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">Try:</span>
                      {sampleIngredients.filter((item) => !ingredients.some((added) => added.toLowerCase() === item.toLowerCase())).slice(0, 4 - Math.min(ingredients.length, 3)).map((sample) => (
                        <Button key={sample} variant="outline" size="sm" type="button" className="sample-button h-7 rounded-full px-2.5 text-[11px]" onClick={() => addIngredient(sample)}>{sample}</Button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="form-field">
                  <label htmlFor="dish-input" className="field-label block text-sm font-semibold">What would you like to make?</label>
                  <p className="field-help mt-1 text-xs text-muted-foreground">Name the dish and we’ll bring you a complete recipe.</p>
                  <Textarea id="dish-input" value={dishName} onChange={(event) => setDishName(event.target.value)} rows={2} placeholder="Chicken biryani, for example…" className="dish-textarea mt-3 min-h-[94px] resize-y rounded-none border-input bg-card" />
                  {dishName.trim().length > 1 && (
                    <div className="suggestion-row mt-2 flex flex-wrap items-center gap-2" aria-label="Dish suggestions">
                      <span className="text-[11px] text-muted-foreground">Suggestions:</span>
                      {dishSuggestions.filter((dish) => dish.toLowerCase().includes(dishName.trim().toLowerCase()) && dish.toLowerCase() !== dishName.trim().toLowerCase()).slice(0, 4).map((dish) => (
                        <Button key={dish} type="button" variant="outline" size="sm" className="sample-button h-7 rounded-full px-2.5 text-[11px]" onClick={() => setDishName(dish)}>{dish}</Button>
                      ))}
                    </div>
                  )}
                  <div className="quick-searches mt-3 flex flex-wrap gap-2" aria-label="Popular dish ideas">
                    {["Chicken biryani", "Creamy tomato pasta", "Vegetable curry"].map((dish) => (
                      <Button type="button" variant="outline" size="sm" key={dish} className="sample-button h-7 rounded-full px-2.5 text-[11px]" onClick={() => setDishName(dish)}>{dish}</Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="photo-assist mt-5 rounded-lg border border-border/70 bg-secondary/35 p-3" aria-busy={photoLoading}>
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => { void handleFoodPhoto(event.target.files?.[0]); event.target.value = ""; }} />
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { void handleFoodPhoto(event.target.files?.[0]); event.target.value = ""; }} />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="photo-assist-icon mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-card text-primary"><ImagePlus size={16} /></span>
                    <div><p className="text-sm font-semibold">Prefer a photo?</p><p className="mt-0.5 text-xs leading-5 text-muted-foreground">We’ll suggest visible ingredients or identify a dish for you to review.</p></div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => photoInputRef.current?.click()} disabled={photoLoading}><ImagePlus size={14} /> Upload photo</Button>
                    <Button type="button" variant="outline" size="icon" className="size-9" aria-label="Take a photo" title="Take a photo" onClick={() => cameraInputRef.current?.click()} disabled={photoLoading}><Camera size={15} /></Button>
                  </div>
                </div>
                {(foodPhoto || photoStatus) && (
                  <div className="photo-assist-result mt-3 flex items-start gap-3 border-t border-border/60 pt-3" aria-live="polite">
                    {foodPhoto && <img src={foodPhoto} alt="Selected food photo" className="size-14 shrink-0 rounded-md object-cover" />}
                    <div className="min-w-0 flex-1">
                      {photoLoading ? <p className="text-xs text-muted-foreground">Looking at your photo…</p> : <p className="text-xs leading-5 text-muted-foreground">{photoStatus}</p>}
                      {photoDish && <Button type="button" variant="link" className="mt-1 h-auto p-0 text-xs" onClick={() => { setMode("dish"); setDishName(photoDish); }}>Use dish suggestion: {photoDish}</Button>}
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => { setFoodPhoto(undefined); setPhotoStatus(undefined); setPhotoDish(null); }} aria-label="Remove selected photo"><X size={14} /></Button>
                  </div>
                )}
              </div>

              <div className="servings-row mt-5 flex items-center justify-between border-y border-border/70 py-3">
                <div><div className="field-label text-sm font-semibold">Cooking for</div><div className="text-xs text-muted-foreground">Enter any quantity from 1–100 people</div></div>
                <div className="servings-control flex items-center gap-2">
                  <Button type="button" variant="outline" size="icon" className="stepper-button size-8" aria-label="One fewer person" onClick={() => setServingCount(servings - 1)} disabled={servings <= 1}><Minus size={14} /></Button>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={3}
                    value={servingsText}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (/^\d{0,3}$/.test(value)) {
                        setServingsText(value);
                        if (value && Number(value) >= 1 && Number(value) <= 100) setServings(Number(value));
                      }
                    }}
                    onBlur={() => {
                      const value = Number(servingsText);
                      if (!/^\d+$/.test(servingsText) || value < 1 || value > 100) setServingsText(String(servings));
                    }}
                    className="serving-count h-9 w-16 border border-border bg-card text-center text-sm font-semibold outline-none focus:ring-2 focus:ring-ring/30"
                    aria-label="Number of people"
                  />
                  <span className="text-xs text-muted-foreground">people</span>
                  <Button type="button" variant="outline" size="icon" className="stepper-button size-8" aria-label="One more person" onClick={() => setServingCount(servings + 1)} disabled={servings >= 100}><Plus size={14} /></Button>
                </div>
              </div>

              <Button type="submit" className="generate-button mt-5 h-12 w-full justify-between px-4 text-sm" disabled={loading || photoLoading}>
                <span className="flex items-center gap-2.5">{loading || photoLoading ? <LoaderCircle className="animate-spin" size={17} /> : <Sparkles size={17} />} {photoLoading ? "Reading your photo…" : loading ? "Finding something delicious…" : mode === "ingredients" ? "Find me something delicious" : "Show me how to make it"}</span>
                {!loading && !photoLoading && <ArrowRight size={18} />}
              </Button>
              {error && <p className="error-message mt-3 border-l-2 border-destructive px-3 py-2 text-sm text-destructive" role="alert">{error}</p>}
              <p className="privacy-note mt-3 text-center text-[11px] text-muted-foreground">Chat history stays in this browser. Photos are only shared when you choose to upload or take one.</p>
            </form>

            <div className="inspiration-section mt-8 border-t border-border/70 pt-5">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display text-[19px]">Cuisine preference</h3>
                <span className="text-[11px] text-muted-foreground">Choose one style</span>
              </div>
              <div className="cuisine-strip mt-3 flex max-h-28 flex-wrap gap-2 overflow-y-auto pr-1">
                {cuisineOptions.map((option) => (
                  <Button key={option} variant={cuisine === option ? "default" : "outline"} size="sm" className="sample-button rounded-full" type="button" onClick={() => setCuisine(option)}>
                    {option}{option === "All Worldwide Cuisines" && <Globe2 size={13} />}
                  </Button>
                ))}
              </div>
              <label className="mt-5 flex items-center justify-between gap-3 border-t border-border/70 pt-4">
                <span className="flex items-center gap-2 text-sm font-semibold"><Globe2 size={15} className="text-primary" /> Recipe language</span>
                <select value={language} onChange={(event) => setLanguage(event.target.value)} className="h-9 max-w-[190px] rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30">
                  {languageOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>
          </section>

          <section className={`idea-column ${response || loading ? "idea-column-ready" : ""}`} aria-live="polite" ref={resultsRef}>
            {loading ? <LoadingState /> : response && selectedRecipe ? (
              <RecipeResults response={response} selectedIndex={selectedIndex} onSelect={(index) => { setSelectedIndex(index); setCheckedIngredients(new Set()); }} selectedRecipe={selectedRecipe} readyCount={readyCount} checkedIngredients={checkedIngredients} onToggleIngredient={toggleIngredient} onBack={clearForm} />
            ) : <WelcomePanel onQuickStart={() => { setMode("ingredients"); addIngredient("Rice, Chicken, Onion, Yogurt"); }} />}
          </section>
        </div>

        <KitchenConsultation language={language} recipeTitle={selectedRecipe?.title} servings={servings} />

        <footer className="site-footer flex flex-col items-start justify-between gap-2 border-t border-border/70 py-4 text-[11px] text-muted-foreground sm:flex-row sm:items-center">
          <span className="footer-brand flex items-center gap-1.5"><CookingPot size={13} /> A little less waste. A lot more what’s for dinner.</span>
          <span className="footer-credit">Made for the food already in your kitchen.</span>
        </footer>
      </div>
    </main>
  );
}

function WelcomePanel({ onQuickStart }: { onQuickStart: () => void }) {
  return (
    <div className="welcome-panel relative min-h-[380px] overflow-hidden bg-secondary/65 px-5 py-6 sm:px-7">
      <div className="welcome-rule mb-5 flex items-center gap-2 text-[10px] font-bold uppercase text-primary"><span className="welcome-dot size-1.5 rounded-full bg-primary" /> A thought from the kitchen</div>
      <h3 className="welcome-heading max-w-[370px] font-display text-[29px] leading-[1.14] sm:text-[34px]">The good stuff is probably already in your fridge.</h3>
      <p className="welcome-copy mt-3 max-w-[385px] text-sm leading-6 text-muted-foreground">A handful of ingredients, a little inspiration, and suddenly dinner takes care of itself.</p>
      <Button variant="outline" className="quick-start-button mt-5 gap-2 bg-card" onClick={onQuickStart}><Sparkles size={15} /> Try a little kitchen magic <ArrowRight size={15} /></Button>
      <div className="welcome-artwork absolute -bottom-2 -right-1 hidden text-primary/15 sm:block" aria-hidden="true"><CookingPot size={168} strokeWidth={0.8} /></div>
      <div className="welcome-note absolute bottom-5 left-5 flex items-center gap-2 text-xs text-muted-foreground sm:left-7"><Leaf size={14} className="text-recipe-green" /> Cook with what you have</div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="loading-panel flex min-h-[390px] flex-col items-center justify-center border border-border/75 bg-card px-5 text-center" role="status" aria-live="polite">
      <span className="loading-icon mb-4 flex size-14 items-center justify-center border border-border text-primary"><CookingPot size={25} className="animate-pulse" /></span>
      <p className="loading-overline text-[10px] font-bold uppercase text-primary">Just a moment</p>
      <h3 className="mt-2 font-display text-[27px]">Something lovely is simmering.</h3>
      <p className="mt-2 max-w-[290px] text-sm leading-6 text-muted-foreground">Finding recipes for the ingredients in your kitchen.</p>
      <span className="loading-progress mt-6 block h-px w-20 overflow-hidden bg-border"><span className="loading-progress-bar block h-full w-1/2 bg-primary" /></span>
    </div>
  );
}

function RecipeResults({
  response,
  selectedIndex,
  onSelect,
  selectedRecipe,
  readyCount,
  checkedIngredients,
  onToggleIngredient,
  onBack,
}: {
  response: RecipeResponse;
  selectedIndex: number;
  onSelect: (index: number) => void;
  selectedRecipe: RecipeResponse["recipes"][number];
  readyCount: number;
  checkedIngredients: Set<number>;
  onToggleIngredient: (index: number) => void;
  onBack: () => void;
}) {
  const missingCount = selectedRecipe.ingredients.length - readyCount;
  return (
    <div className="results-panel border-t border-primary/50 pt-5">
      <div className="results-intro flex items-start justify-between gap-3">
        <div><div className="results-kicker flex items-center gap-2 text-[10px] font-bold uppercase text-primary"><Sparkles size={13} /> FRESH FROM THE KITCHEN</div><p className="mt-2 max-w-[440px] text-sm leading-6 text-muted-foreground">{response.introduction}</p></div>
        <Button type="button" variant="ghost" size="icon" className="results-reset shrink-0" aria-label="Start a new search" onClick={onBack}><RotateCcw size={15} /></Button>
      </div>

      {response.recipes.length > 1 && (
        <div className="recipe-picker mt-5" role="group" aria-label="Recipe ideas">
          {response.recipes.map((recipe, index) => {
            const alreadyHave = recipe.ingredients.filter((item) => item.haveIt).length;
            const selected = index === selectedIndex;
            return (
              <button type="button" key={`${recipe.title}-${index}`} className={`recipe-choice w-full text-left ${selected ? "recipe-choice-selected" : ""}`} aria-pressed={selected} onClick={() => onSelect(index)}>
                <span className="recipe-choice-number font-display">0{index + 1}</span>
                <span className="recipe-choice-content min-w-0 flex-1"><span className="recipe-choice-title block truncate font-display text-[17px] leading-tight">{recipe.title}</span><span className="recipe-choice-meta mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground"><span className="flex items-center gap-1"><Clock3 size={12} /> {recipe.timeMinutes} min</span><span className="recipe-choice-ready">{alreadyHave}/{recipe.ingredients.length} ingredients at home</span></span></span>
                <ArrowRight size={15} className="recipe-choice-arrow shrink-0 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      )}

      <article className="recipe-detail mt-5 border border-border bg-card">
        <div className="recipe-detail-cover relative flex min-h-[152px] flex-col justify-end overflow-hidden bg-secondary px-5 py-4">
          {selectedRecipe.title.toLowerCase().includes("biryani") && <img src={biryaniImage} width={1600} height={1008} alt="Freshly prepared biryani topped with herbs" loading="lazy" className="recipe-detail-image absolute inset-0 h-full w-full object-cover" />}
          <div className="recipe-cover-scrim absolute inset-0" />
          <div className="recipe-cover-content relative z-10">
            <div className="recipe-cover-kicker flex items-center gap-1.5 text-[10px] font-semibold uppercase"><Flame size={12} /> COOK THIS TONIGHT</div>
            <h3 className="recipe-cover-title mt-1 font-display text-[30px] leading-none">{selectedRecipe.title}</h3>
            <p className="recipe-cover-subtitle mt-1 max-w-[390px] text-xs leading-5">{selectedRecipe.subtitle || selectedRecipe.description}</p>
          </div>
          <div className="recipe-cover-stats absolute right-3 top-3 flex items-center gap-1.5 bg-card/92 px-2.5 py-1.5 text-[11px] text-foreground"><Clock3 size={12} className="text-primary" /> {selectedRecipe.timeMinutes} min</div>
        </div>

        <div className="recipe-detail-body px-4 py-4 sm:px-5">
          <div className="recipe-meta-row grid grid-cols-2 gap-2 border-b border-border/70 pb-3 text-xs sm:grid-cols-4">
            <span className="rounded-md bg-secondary/70 px-2.5 py-2"><span className="block text-[10px] font-bold uppercase text-muted-foreground">Prepare</span><strong className="mt-0.5 block text-sm text-foreground">{selectedRecipe.prepMinutes} min</strong></span>
            <span className="rounded-md bg-secondary/70 px-2.5 py-2"><span className="block text-[10px] font-bold uppercase text-muted-foreground">Cook</span><strong className="mt-0.5 block text-sm text-foreground">{selectedRecipe.cookMinutes} min</strong></span>
            <span className="rounded-md bg-secondary/70 px-2.5 py-2"><span className="block text-[10px] font-bold uppercase text-muted-foreground">Difficulty</span><strong className="mt-0.5 block text-sm text-foreground">{selectedRecipe.difficulty}</strong></span>
            <span className="rounded-md bg-secondary/70 px-2.5 py-2"><span className="block text-[10px] font-bold uppercase text-muted-foreground">For</span><strong className="mt-0.5 block text-sm text-foreground">{selectedRecipe.servings} people</strong></span>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="ingredient-progress flex items-center gap-1.5"><span className="progress-numbers font-semibold text-foreground">{readyCount}/{selectedRecipe.ingredients.length}</span> already in your kitchen</span>
            <span className="rounded-full bg-accent/35 px-3 py-1.5 font-semibold text-accent-foreground">Estimated cost: {selectedRecipe.estimatedCost}</span>
          </div>

          <div className="recipe-ingredients mt-4">
            <div className="ingredient-heading-row flex items-center justify-between gap-2"><h4 className="font-display text-[20px]">Required ingredients</h4>{missingCount > 0 ? <span className="shopping-label flex items-center gap-1 text-[10px] font-semibold uppercase"><ShoppingBasket size={12} /> {missingCount} to shop for</span> : <span className="shopping-label flex items-center gap-1 text-[10px] font-semibold uppercase"><Check size={12} /> All on hand</span>}</div>
            <div className="ingredient-summary mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-md bg-secondary/45 px-3 py-2.5"><p className="text-[10px] font-bold uppercase text-muted-foreground">Available ingredients</p><p className="mt-1 text-xs leading-5">{selectedRecipe.availableIngredients.length ? selectedRecipe.availableIngredients.join(", ") : "None from your list yet"}</p></div>
              <div className="rounded-md bg-accent/15 px-3 py-2.5"><p className="text-[10px] font-bold uppercase text-muted-foreground">Missing ingredients</p><p className="mt-1 text-xs leading-5">{selectedRecipe.missingIngredients.length ? selectedRecipe.missingIngredients.join(", ") : "Nothing missing from your list"}</p></div>
            </div>
            <ul className="ingredient-list mt-2">
              {selectedRecipe.ingredients.map((item, index) => {
                const checked = checkedIngredients.has(index);
                return (
                  <li key={`${item.name}-${index}`}>
                    <button type="button" className={`detail-ingredient flex w-full items-center gap-2.5 border-b border-border/55 py-2 text-left ${checked ? "detail-ingredient-checked" : ""}`} onClick={() => onToggleIngredient(index)} aria-pressed={checked}>
                      <span className={`ingredient-check flex size-[17px] shrink-0 items-center justify-center border ${checked || item.haveIt ? "ingredient-check-on" : ""}`}>{(checked || item.haveIt) && <Check size={11} />}</span>
                      <span className="ingredient-name min-w-0 flex-1 truncate text-xs">{item.name}</span>
                      <span className="ingredient-amount shrink-0 text-[11px] text-muted-foreground">{item.amount}</span>
                      <span className={`ingredient-status shrink-0 text-[9px] font-semibold uppercase ${item.haveIt ? "ingredient-have" : "ingredient-buy"}`}>{item.haveIt ? "Have" : "To buy"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="recipe-steps mt-5">
            <div className="flex items-baseline justify-between"><h4 className="font-display text-[20px]">Let’s make it</h4><span className="text-[10px] uppercase text-muted-foreground">{selectedRecipe.steps.length} simple steps</span></div>
            <ol className="steps-list mt-3 space-y-3">
              {selectedRecipe.steps.map((step, index) => (
                <li key={`${step.title}-${index}`} className="recipe-step flex gap-3">
                  <span className="step-index flex size-6 shrink-0 items-center justify-center border border-primary/35 font-display text-sm text-primary">{index + 1}</span>
                  <div className="min-w-0 pt-0.5"><h5 className="step-title text-sm font-semibold">{step.title}</h5><p className="step-copy mt-1 text-sm leading-6 text-muted-foreground">{step.instruction}</p></div>
                </li>
              ))}
            </ol>
          </div>

          {selectedRecipe.tip && <p className="recipe-tip mt-5 border-l-2 border-primary/55 bg-secondary/50 px-3 py-2.5 text-xs leading-5"><span className="font-semibold">A little kitchen tip</span> <span className="text-muted-foreground">{selectedRecipe.tip}</span></p>}
          <Button type="button" variant="outline" className="back-button mt-4 h-9 w-full gap-2" onClick={onBack}><ArrowLeft size={14} /> Find another recipe</Button>
        </div>
      </article>
      <div className="results-end-note mt-3 flex justify-center gap-2 text-[10px] text-muted-foreground"><ArrowDown size={12} /> Check off ingredients as you gather them</div>
    </div>
  );
}
