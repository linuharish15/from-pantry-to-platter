import { useServerFn } from "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { ChefHat, CookingPot, LoaderCircle, MessageCircleQuestion, Salad, Sparkles, ShoppingBasket, Utensils } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import logoImage from "@/assets/ingredine-logo.jpg";
import { AuthAccount } from "@/components/AuthAccount";
import { CookingOptions, CuisinePicker, DishEntry, IngredientEntry } from "@/components/FoodInputs";
import { HistoryButton, HistoryPanel, useHistoryEntries } from "@/components/HistoryPanel";
import { KitchenConsultation } from "@/components/KitchenConsultation";
import { RecipeResults } from "@/components/RecipeResults";
import { Button } from "@/components/ui/button";
import { historyKeyFor, useAuthUser } from "@/lib/auth";
import { newId, saveHistoryEntry, type ChatMessage, type HistoryEntry, type RecipeHistoryEntry } from "@/lib/history";
import { WORLDWIDE_CUISINE } from "@/lib/recipes/options";
import { getRecipeRequestError, MAX_SERVINGS, recipeRequestSchema } from "@/lib/recipes/recipe-validation";
import { getRecipes } from "@/lib/recipes/recipes.functions";
import type { RecipeResponse } from "@/lib/recipes/recipes.server";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IngreDine | Your Smart Kitchen Assistant" },
      { name: "description", content: "Use what you have, discover recipes and cook happier. Get dishes from your ingredients, step-by-step recipes for any dish in the world, and answers from Chef." },
      { property: "og:title", content: "IngreDine | Your Smart Kitchen Assistant" },
      { property: "og:description", content: "Use what you have. Discover recipes. Cook happier." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IngreDine,
});

type Section = "ingredients" | "dish" | "consult";
type Mode = "ingredients" | "dish";
type Outcome = { response: RecipeResponse; request: RecipeHistoryEntry["request"] };

const sections: { id: Section; label: string; hint: string; icon: typeof ShoppingBasket }[] = [
  { id: "ingredients", label: "Use my ingredients", hint: "Tell us what you have", icon: ShoppingBasket },
  { id: "dish", label: "Make a specific dish", hint: "Name any dish", icon: ChefHat },
  { id: "consult", label: "Kitchen Consultation", hint: "Ask Chef anything", icon: MessageCircleQuestion },
];

function guessCurrency(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    if (/Kolkata|Calcutta/i.test(zone)) return "INR";
    if (/Dubai/i.test(zone)) return "AED";
    if (/Singapore/i.test(zone)) return "SGD";
    if (/^Australia/i.test(zone)) return "AUD";
    if (/London/i.test(zone)) return "GBP";
    if (/^Europe/i.test(zone)) return "EUR";
    if (/^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax)/i.test(zone)) return "CAD";
  } catch {
    // fall through to the default
  }
  return "USD";
}

function IngreDine() {
  const generate = useServerFn(getRecipes);
  const user = useAuthUser();
  const userKey = historyKeyFor(user);
  const historyEntries = useHistoryEntries(userKey);
  const resultsRef = useRef<HTMLDivElement>(null);

  const [section, setSection] = useState<Section>("ingredients");
  const [historyOpen, setHistoryOpen] = useState(false);

  // Shared cooking options
  const [peopleText, setPeopleText] = useState("2");
  const [servings, setServings] = useState(2);
  const [cuisine, setCuisine] = useState<string>(WORLDWIDE_CUISINE);
  const [language, setLanguage] = useState("English");
  const [currency, setCurrency] = useState("INR");
  useEffect(() => { setCurrency(guessCurrency()); }, []);

  // Inputs for each section
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [dishName, setDishName] = useState("");
  const [dishPantry, setDishPantry] = useState<string[]>([]);

  // Results for each section stay separate
  const [results, setResults] = useState<Partial<Record<Mode, Outcome>>>({});
  const [openIndex, setOpenIndex] = useState<Record<Mode, number | null>>({ ingredients: null, dish: null });
  const [errors, setErrors] = useState<Partial<Record<Mode, string>>>({});
  const [loading, setLoading] = useState<Mode | null>(null);
  const [focusTitle, setFocusTitle] = useState<string>();

  // Kitchen Consultation chat
  const [chatId, setChatId] = useState(() => newId());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const setPeople = (text: string) => {
    setPeopleText(text);
    const value = Number(text);
    if (/^\d+$/.test(text) && value >= 1 && value <= MAX_SERVINGS) setServings(value);
  };

  const stepPeople = (delta: number) => {
    const base = /^\d+$/.test(peopleText) && Number(peopleText) >= 1 ? Number(peopleText) : servings;
    const next = Math.min(MAX_SERVINGS, Math.max(1, base + delta));
    setPeopleText(String(next));
    setServings(next);
  };

  const run = useCallback(async (mode: Mode, servingsOverride?: number) => {
    if (loading) return;
    const raw = servingsOverride !== undefined ? String(servingsOverride) : peopleText;
    const count = Number(raw);
    const fail = (message: string) => setErrors((existing) => ({ ...existing, [mode]: message }));
    if (!/^\d+$/.test(raw) || count < 1 || count > MAX_SERVINGS) {
      fail(`Please enter a number of people from 1 to ${MAX_SERVINGS}.`);
      return;
    }

    const request = {
      mode,
      ingredients: mode === "ingredients" ? ingredients : dishPantry,
      dish: mode === "dish" ? dishName.trim() : "",
      servings: count,
      cuisine,
      language,
      currency,
    };
    const problem = getRecipeRequestError(request);
    if (problem) { fail(problem); return; }
    const parsed = recipeRequestSchema.safeParse(request);
    if (!parsed.success) { fail("Please check your entries. You can add up to 24 ingredients."); return; }

    setLoading(mode);
    setErrors((existing) => ({ ...existing, [mode]: undefined }));
    try {
      const result = await generate({ data: parsed.data });
      if (!result.ok) { fail(result.error); return; }
      setServings(count);
      setPeopleText(String(count));
      const outcome: Outcome = {
        response: result.data,
        request: { mode, ingredients: parsed.data.ingredients, dish: parsed.data.dish, servings: count, cuisine: parsed.data.cuisine },
      };
      setResults((existing) => ({ ...existing, [mode]: outcome }));
      const only = result.data.recipes.length === 1;
      setOpenIndex((existing) => ({ ...existing, [mode]: only ? 0 : null }));
      if (only) setFocusTitle(result.data.recipes[0]?.title);
      saveHistoryEntry(userKey, {
        id: newId(),
        kind: "recipes",
        createdAt: Date.now(),
        title: mode === "dish" ? parsed.data.dish : `Ideas from ${parsed.data.ingredients.slice(0, 3).join(", ")}${parsed.data.ingredients.length > 3 ? "…" : ""}`,
        request: outcome.request,
        response: outcome.response,
      });
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
      }
    } catch {
      fail("We could not prepare your recipes right now. Please try again.");
    } finally {
      setLoading(null);
    }
  }, [loading, peopleText, ingredients, dishPantry, dishName, cuisine, language, currency, generate, userKey]);

  const submit = (mode: Mode) => (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void run(mode);
  };

  const openRecipe = (mode: Mode) => (index: number | null) => {
    setOpenIndex((existing) => ({ ...existing, [mode]: index }));
    if (index !== null) setFocusTitle(results[mode]?.response.recipes[index]?.title);
  };

  // Save the current Kitchen Consultation chat in history whenever it changes.
  useEffect(() => {
    if (!chatMessages.length) return;
    const first = chatMessages.find((message) => message.role === "user")?.text ?? "Kitchen question";
    saveHistoryEntry(userKey, {
      id: chatId,
      kind: "chat",
      createdAt: Date.now(),
      title: first.length > 60 ? `${first.slice(0, 57)}…` : first,
      messages: chatMessages,
    });
  }, [chatMessages, chatId, userKey]);

  const openHistoryEntry = (entry: HistoryEntry) => {
    if (entry.kind === "chat") {
      setChatId(entry.id);
      setChatMessages(entry.messages);
      setSection("consult");
      return;
    }
    const { mode } = entry.request;
    setResults((existing) => ({ ...existing, [mode]: { response: entry.response, request: entry.request } }));
    setOpenIndex((existing) => ({ ...existing, [mode]: entry.response.recipes.length === 1 ? 0 : null }));
    if (mode === "ingredients") setIngredients(entry.request.ingredients);
    else { setDishName(entry.request.dish); setDishPantry(entry.request.ingredients); }
    setCuisine(entry.request.cuisine);
    setPeople(String(entry.request.servings));
    setSection(mode);
  };

  const startNewChat = () => {
    setChatMessages([]);
    setChatId(newId());
  };

  const renderResults = (mode: Mode) => {
    const outcome = results[mode];
    if (loading === mode) {
      return (
        <div className="state-card" role="status">
          <LoaderCircle className="state-icon animate-spin" />
          <h3 className="state-title">{mode === "dish" ? "Chef is writing your recipe…" : "Chef is picking dishes for you…"}</h3>
          <p>This usually takes a few seconds.</p>
        </div>
      );
    }
    if (outcome) {
      return (
        <RecipeResults
          response={outcome.response}
          requestedServings={servings}
          openIndex={openIndex[mode]}
          onOpen={openRecipe(mode)}
          onRescale={() => void run(mode, servings)}
          busy={loading !== null}
        />
      );
    }
    return (
      <div className="state-card state-empty">
        {mode === "ingredients" ? <Salad className="state-icon" /> : <CookingPot className="state-icon" />}
        <h3 className="state-title">{mode === "ingredients" ? "Your dishes will appear here" : "Your recipe will appear here"}</h3>
        <p>{mode === "ingredients" ? "Add a few ingredients and choose how many people you are cooking for. Then tap a dish name to see the steps." : "Type a dish name and choose how many people you are cooking for. Every step will be written out for you."}</p>
      </div>
    );
  };

  const busy = loading !== null;

  return (
    <div className="app">
      <a href="#content" className="skip-link">Skip to content</a>
      <header className="topbar">
        <a href="#top" className="brand" aria-label="IngreDine home">
          <img src="/logo-mark.png" alt="" width={48} height={48} />
          <span className="brand-word"><span className="brand-ingre">Ingre</span><span className="brand-dine">Dine</span></span>
        </a>
        <div className="topbar-actions">
          <HistoryButton onClick={() => setHistoryOpen(true)} count={historyEntries.length} />
          <AuthAccount user={user} />
        </div>
      </header>

      <section id="top" className="hero">
        <img src={logoImage} width={1254} height={1254} alt="IngreDine, your smart kitchen assistant: use what you have, discover recipes, cook happier" className="hero-logo" />
        <div className="hero-copy">
          <h1 className="hero-title">What shall we cook today?</h1>
          <p className="hero-text">Tell us what is in your kitchen, or name any dish from anywhere in the world. Tap a dish to see every step, scaled for the number of people you are feeding.</p>
        </div>
      </section>

      <nav className="section-nav" aria-label="Choose what you want to do">
        <div role="tablist" className="section-tabs">
          {sections.map(({ id, label, hint, icon: Icon }) => (
            <button key={id} type="button" role="tab" id={`tab-${id}`} aria-selected={section === id} aria-controls={`panel-${id}`} className={`section-tab section-tab-${id}`} onClick={() => setSection(id)}>
              <Icon />
              <span><span className="section-tab-label">{label}</span><span className="section-tab-hint">{hint}</span></span>
            </button>
          ))}
        </div>
      </nav>

      <main id="content" className="content">
        {section !== "consult" ? (
          <section role="tabpanel" id={`panel-${section}`} aria-labelledby={`tab-${section}`} className={`panel panel-${section}`}>
            <header className="panel-head">
              <h2 className="panel-title">{section === "ingredients" ? "Use my ingredients" : "Make a specific dish"}</h2>
              <p className="panel-sub">{section === "ingredients" ? "Add what you have at home. We will suggest three dishes you can cook." : "Name a dish and get the full recipe, with exact amounts for your group."}</p>
            </header>
            <div className="workspace">
              <form className="form-card" onSubmit={submit(section)} noValidate>
                {section === "ingredients" ? (
                  <IngredientEntry
                    id="ingredient-input"
                    label="What ingredients do you have?"
                    help="Type one at a time and press Enter, or separate them with commas."
                    ingredients={ingredients}
                    onChange={setIngredients}
                    language={language}
                    dishAction={{ label: (dish) => `Cook “${dish}” instead`, onUse: (dish) => { setDishName(dish); setSection("dish"); } }}
                  />
                ) : (
                  <>
                    <DishEntry value={dishName} onChange={setDishName} language={language} />
                    <details className="pantry-details">
                      <summary>I already have some ingredients <span>(optional)</span></summary>
                      <IngredientEntry id="dish-pantry-input" label="Ingredients at home" help="We will tell you which ones you still need to buy." ingredients={dishPantry} onChange={setDishPantry} language={language} withTools={false} />
                    </details>
                  </>
                )}

                <CuisinePicker value={cuisine} onChange={setCuisine} />
                <CookingOptions peopleText={peopleText} onPeopleText={setPeople} onStep={stepPeople} language={language} onLanguage={setLanguage} currency={currency} onCurrency={setCurrency} />

                <Button type="submit" className="submit-button" disabled={busy}>
                  {loading === section ? <LoaderCircle className="animate-spin" /> : section === "ingredients" ? <Sparkles /> : <Utensils />}
                  {loading === section ? "Please wait…" : section === "ingredients" ? "Show me dishes" : "Show me the recipe"}
                </Button>
                {errors[section] && <p className="error-note" role="alert">{errors[section]}</p>}
                <p className="privacy-note">Photos are only sent when you choose to add one. Your history stays on this device.</p>
              </form>

              <div className="results-column" ref={resultsRef} aria-live="polite">
                {renderResults(section)}
              </div>
            </div>
          </section>
        ) : (
          <section role="tabpanel" id="panel-consult" aria-labelledby="tab-consult" className="panel panel-consult">
            <header className="panel-head">
              <h2 className="panel-title">Kitchen Consultation</h2>
              <p className="panel-sub">Cooking and a doubt comes up? Ask Chef about substitutions, timing, doneness, spice levels or food safety.</p>
            </header>
            <KitchenConsultation language={language} recipeTitle={focusTitle} servings={servings} messages={chatMessages} onMessages={(update) => setChatMessages(update)} onNewChat={startNewChat} />
          </section>
        )}
      </main>

      <footer className="footer">
        <img src="/logo-mark.png" alt="" width={36} height={36} />
        <p>IngreDine: use what you have, discover recipes, cook happier.</p>
      </footer>

      <HistoryPanel open={historyOpen} onOpenChange={setHistoryOpen} userKey={userKey} signedIn={Boolean(user)} onOpenEntry={openHistoryEntry} />
    </div>
  );
}
