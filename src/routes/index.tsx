import { useServerFn } from "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import logo from "../../logo-mark.png";
import { Button } from "@/components/ui/button";
import { getRecipeRequestError, recipeRequestSchema, type RecipeRequestInput } from "@/lib/recipes/recipe-validation";
import { getRecipes } from "@/lib/recipes/recipes.functions";
import type { RecipeResponse } from "@/lib/recipes/recipes.server";
import { KitchenConsultation } from "@/components/KitchenConsultation";
import type { ConsultationAction } from "@/lib/recipes/consultation.shared";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IngreDine | Your Ingredients , Endless Possibilities" },
      { name: "description", content: "Turn ingredients into worldwide dish ideas or get complete recipes with ingredients and clear cooking steps." },
      { property: "og:title", content: "IngreDine | Your Ingredients , Endless Possibilities" },
      { property: "og:description", content: "Turn ingredients into worldwide dish ideas or get complete recipes with ingredients and clear cooking steps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RecipeAssistant,
});

type Mode = "ingredients" | "dish";
const cuisines = [
  "All Worldwide Cuisines", "Indian", "Italian", "Chinese", "Japanese", "Thai", "Korean",
  "Mexican", "Mediterranean", "Middle Eastern", "French", "African", "Caribbean", "American",
  "British", "Spanish", "Southeast Asian", "Vietnamese", "Filipino", "Indonesian", "Turkish",
  "Greek", "Brazilian", "Ethiopian", "West African", "Nordic", "Persian", "Vegetarian", "Vegan",
  "Gluten-free", "Quick meals", "Desserts", "Snacks",
] as const;
const ideas = ["Chicken biryani", "Pasta", "Chocolate cake", "Dosa", "Vegetable curry", "Pancakes"];

function RecipeAssistant() {
  const generate = useServerFn(getRecipes);
  const [mode, setMode] = useState<Mode>("ingredients");
  const [ingredientText, setIngredientText] = useState("");
  const [dish, setDish] = useState("");
  const [peopleText, setPeopleText] = useState("2");
  const [cuisine, setCuisine] = useState<(typeof cuisines)[number]>("All Worldwide Cuisines");
  const [language, setLanguage] = useState("English");
  const [response, setResponse] = useState<RecipeResponse>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const applyAssistantAction = (action: ConsultationAction) => {
    switch (action.type) {
      case "set_mode":
        setMode(action.mode);
        break;
      case "set_servings":
        setPeopleText(String(action.servings));
        break;
      case "set_dish":
        setDish(action.dish);
        setMode("dish");
        break;
      case "set_ingredients":
        setIngredientText(action.ingredients.join(", "));
        setMode("ingredients");
        break;
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    const people = Number(peopleText.trim());
    const request: RecipeRequestInput = {
      mode,
      ingredients: ingredientText.split(/[\n,]+/).map((value) => value.trim()).filter(Boolean),
      dish: dish.trim(),
      servings: people,
      cuisine,
      language,
    };
    const validationError = getRecipeRequestError(request);
    if (validationError) {
      setError(validationError);
      setResponse(undefined);
      return;
    }
    const parsed = recipeRequestSchema.safeParse(request);
    if (!parsed.success) {
              setError("Please check your entries. Add up to 24 ingredients and enter a positive whole-number people count.");
      setResponse(undefined);
      return;
    }

    setError("");
    setResponse(undefined);
    setLoading(true);
    try {
      const result = await generate({ data: parsed.data });
      if (!result.ok) {
        setError(result.error);
      } else if (!result.data.recipes.length) {
        setError("The recipe service returned no dishes. Please try again with more details.");
      } else {
        setResponse(result.data);
      }
    } catch (reason) {
      console.error("Recipe request failed", reason);
      setError(reason instanceof Error ? reason.message : "Recipe generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex items-center justify-between border-b border-border pb-4">
          <a href="#home" className="flex items-center gap-3" aria-label="IngreDine home">
            <img src={logo} alt="IngreDine chef and cooking pot logo" className="h-14 w-14 rounded-full object-cover" />
            <span className="font-display text-2xl font-bold">Ingre<span className="text-primary">Dine</span></span>
          </a>
          <span className="text-sm text-muted-foreground">Your smart kitchen assistant</span>
        </header>

        <section id="home" className="mb-7 rounded-2xl border border-border bg-card p-5 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-widest text-primary">Your Ingredients , Endless Possibilities</p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">What would you like to cook?</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Get recipe ideas from your ingredients, or ask for a complete recipe for any dish. Select a dish below to open its cooking steps.</p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(300px,0.9fr)_minmax(0,1.1fr)]">
          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1" role="group" aria-label="Recipe request type">
              <Button type="button" variant={mode === "ingredients" ? "default" : "ghost"} aria-pressed={mode === "ingredients"} onClick={() => { setMode("ingredients"); setError(""); setResponse(undefined); }}>Use my ingredients</Button>
              <Button type="button" variant={mode === "dish" ? "default" : "ghost"} aria-pressed={mode === "dish"} onClick={() => { setMode("dish"); setError(""); setResponse(undefined); }}>Make a specific dish</Button>
            </div>

            <form onSubmit={submit} className="mt-5 space-y-5" noValidate>
              {mode === "ingredients" ? (
                <div>
                  <label htmlFor="ingredients" className="block text-sm font-semibold">Ingredients you have</label>
                  <p className="mt-1 text-sm text-muted-foreground">Separate items with commas or put each on a new line.</p>
                  <textarea id="ingredients" value={ingredientText} onChange={(event) => setIngredientText(event.target.value)} placeholder="For example: rice, tomatoes, eggs, spinach" rows={4} className="mt-2 w-full rounded-lg border border-input bg-background p-3 text-base" />
                  <div className="mt-2 flex flex-wrap gap-2" aria-label="Ingredient examples">
                    {["Tomato", "Potato", "Egg", "Rice", "Spinach"].map((item) => <Button key={item} type="button" variant="outline" size="sm" onClick={() => setIngredientText((current) => current.trim() ? `${current.trim()}, ${item}` : item)}>{item}</Button>)}
                  </div>
                </div>
              ) : (
                <div>
                  <label htmlFor="dish" className="block text-sm font-semibold">Dish name</label>
                  <input id="dish" value={dish} onChange={(event) => setDish(event.target.value)} placeholder="Type any dish, dessert, or snack" className="mt-2 h-12 w-full rounded-lg border border-input bg-background px-3 text-base" />
                  <div className="mt-2 flex flex-wrap gap-2" aria-label="Dish suggestions">
                    {ideas.map((idea) => <Button key={idea} type="button" variant="outline" size="sm" onClick={() => setDish(idea)}>{idea}</Button>)}
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="people-count" className="block text-sm font-semibold">How many people are you cooking for?</label>
                <input id="people-count" type="text" inputMode="numeric" autoComplete="off" value={peopleText} onChange={(event) => { if (/^\d*$/.test(event.target.value)) setPeopleText(event.target.value); }} placeholder="Type any number of people" className="mt-2 h-12 w-full rounded-lg border border-input bg-background px-3 text-base" />
                <p className="mt-1 text-xs text-muted-foreground">Enter a whole number; recipe quantities will be scaled for your group.</p>
              </div>

              <div>
                <label htmlFor="cuisine" className="block text-sm font-semibold">Cuisine preference</label>
                <select id="cuisine" value={cuisine} onChange={(event) => setCuisine(event.target.value as (typeof cuisines)[number])} className="mt-2 h-12 w-full rounded-lg border border-input bg-background px-3 text-base">
                  {cuisines.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="language" className="block text-sm font-semibold">Recipe language</label>
                <select id="language" value={language} onChange={(event) => setLanguage(event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-input bg-background px-3 text-base">
                  {["English", "Tamil", "Hindi", "Spanish", "French", "German", "Italian", "Japanese", "Korean", "Mandarin Chinese", "Arabic", "Portuguese", "Bengali", "Telugu", "Malayalam"].map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>

              <Button type="submit" disabled={loading} className="h-12 w-full text-base font-bold">
                {loading ? "Preparing your dishes…" : mode === "ingredients" ? "Find dishes" : "Get recipe steps"}
              </Button>
              {error && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
            </form>
          </section>

          <section aria-live="polite" className="space-y-4">
            {!response && !loading && <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-8 text-center"><span className="text-4xl" aria-hidden="true">🥕</span><h2 className="mt-3 font-display text-2xl font-semibold">Your dishes will show up here</h2><p className="mt-2 max-w-md text-sm text-muted-foreground">Enter ingredients or a dish, choose your people count, then press the button to get started.</p></div>}
            {loading && <div role="status" className="rounded-2xl border border-border bg-card p-8 text-center"><p className="font-display text-xl">The chef is finding your recipe…</p><p className="mt-2 text-sm text-muted-foreground">Please keep this page open for a moment.</p></div>}
            {response && <>
              <div className="rounded-xl bg-secondary p-4"><h2 className="font-display text-xl font-bold">Your recipe ideas</h2><p className="mt-1 text-sm text-muted-foreground">{response.introduction || "Choose a dish to open its complete recipe and steps."}</p></div>
              {response.recipes.map((recipe, index) => <details key={`${recipe.title}-${index}`} open={mode === "dish" && response.recipes.length === 1} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <summary className="cursor-pointer list-none p-5 hover:bg-secondary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                  <span className="block font-display text-xl font-bold text-primary sm:text-2xl">{recipe.title}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{recipe.subtitle || recipe.description}</span>
                  <span className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium"><span>Prep: {recipe.prepMinutes} min</span><span>Cook: {recipe.cookMinutes} min</span><span>Difficulty: {recipe.difficulty}</span><span>Serves: {recipe.servings}</span></span>
                  <span className="mt-3 block text-sm font-semibold text-primary">Select to see ingredients and steps ↓</span>
                </summary>
                <div className="border-t border-border p-5">
                  <h3 className="font-display text-lg font-bold">Required ingredients</h3>
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2">{recipe.ingredients.map((item, itemIndex) => <li key={`${item.name}-${itemIndex}`} className="flex justify-between gap-3 rounded-lg bg-secondary/60 px-3 py-2 text-sm"><span>{item.name}{item.haveIt ? " · Have" : " · Missing"}</span><span className="font-medium">{item.amount}</span></li>)}</ul>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2"><p className="rounded-lg border border-border p-3 text-sm"><strong>Available:</strong> {recipe.availableIngredients.join(", ") || "None listed"}</p><p className="rounded-lg border border-border p-3 text-sm"><strong>Missing:</strong> {recipe.missingIngredients.join(", ") || "None"}</p></div>
                  <p className="mt-3 text-sm"><strong>Estimated cost:</strong> {recipe.estimatedCost}</p>
                  <h3 className="mt-5 font-display text-lg font-bold">Step-by-step method</h3>
                  <ol className="mt-3 space-y-4">{recipe.steps.map((step, stepIndex) => <li key={`${step.title}-${stepIndex}`} className="flex gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">{stepIndex + 1}</span><div><h4 className="font-semibold">{step.title}</h4><p className="mt-1 text-sm leading-6 text-muted-foreground">{step.instruction}</p></div></li>)}</ol>
                  {recipe.tip && <p className="mt-5 rounded-lg bg-secondary p-3 text-sm"><strong>Chef’s tip:</strong> {recipe.tip}</p>}
                </div>
              </details>)}
            </>}
          </section>
        </div>

        <KitchenConsultation
          language={language}
          recipeTitle={response?.recipes[0]?.title}
          servings={Number.isSafeInteger(Number(peopleText)) && Number(peopleText) > 0 ? Number(peopleText) : 2}
          appContext={{
            mode,
            cuisine,
            ingredients: ingredientText.split(/[\n,]+/).map((value) => value.trim()).filter(Boolean).slice(0, 24).map((value) => value.slice(0, 60)),
            dish: dish.trim().slice(0, 100),
            recipes: (response?.recipes ?? []).slice(0, 3).map((recipe) => recipe.title.slice(0, 160)),
          }}
          onApplyAction={applyAssistantAction}
        />
        <footer className="mt-8 border-t border-border py-5 text-center text-sm text-muted-foreground">IngreDine — use what you have, discover recipes, cook happier.</footer>
      </div>
    </main>
  );
}
