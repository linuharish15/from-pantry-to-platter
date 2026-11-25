import {
  AlarmClock, Check, ChevronDown, CircleDollarSign, Clock3, CookingPot, Eye, Gauge, Lightbulb, RefreshCw, ShoppingBasket, Soup, Users, UtensilsCrossed,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { RecipeResponse } from "@/lib/recipes/recipes.server";

type Recipe = RecipeResponse["recipes"][number];

type RecipeResultsProps = {
  response: RecipeResponse;
  /** People the form currently asks for. Used to offer a re-scale when it differs from the recipe. */
  requestedServings: number;
  openIndex: number | null;
  onOpen: (index: number | null) => void;
  onRescale: () => void;
  busy: boolean;
};

export function RecipeResults({ response, requestedServings, openIndex, onOpen, onRescale, busy }: RecipeResultsProps) {
  const refs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    if (openIndex === null) return;
    const node = refs.current[openIndex];
    node?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [openIndex]);

  const single = response.recipes.length === 1;

  return (
    <div className="results">
      <p className="results-intro">{response.introduction}</p>
      {!single && <p className="results-prompt"><Eye /> Tap a dish name to see how to make it.</p>}
      <ol className="dish-list">
        {response.recipes.map((recipe, index) => (
          <li key={`${recipe.title}-${index}`} ref={(node) => { refs.current[index] = node; }} className="dish-item">
            <RecipeCard
              recipe={recipe}
              index={index}
              open={openIndex === index}
              onToggle={() => onOpen(openIndex === index ? null : index)}
              requestedServings={requestedServings}
              onRescale={onRescale}
              busy={busy}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}

function RecipeCard({ recipe, index, open, onToggle, requestedServings, onRescale, busy }: {
  recipe: Recipe;
  index: number;
  open: boolean;
  onToggle: () => void;
  requestedServings: number;
  onRescale: () => void;
  busy: boolean;
}) {
  const panelId = `recipe-panel-${index}`;
  const haveCount = recipe.ingredients.filter((item) => item.haveIt).length;
  return (
    <article className={`dish-card ${open ? "dish-card-open" : ""}`}>
      <button type="button" className="dish-header" aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
        <span className="dish-header-icon" aria-hidden="true"><Soup /></span>
        <span className="dish-header-main">
          <span className="recipe-name">{recipe.title}</span>
          <span className="recipe-subtitle">{recipe.subtitle || recipe.description}</span>
          <span className="dish-header-chips">
            <span className="mini-chip"><Clock3 /> {recipe.timeMinutes} min</span>
            <span className="mini-chip"><Gauge /> {recipe.difficulty}</span>
            <span className="mini-chip"><Check /> {haveCount} of {recipe.ingredients.length} at home</span>
          </span>
        </span>
        <span className="dish-header-cta">{open ? "Hide steps" : "See how to make it"} <ChevronDown className={open ? "rotate-180" : ""} /></span>
      </button>

      {open && (
        <div id={panelId} className="dish-body">
          {recipe.servings !== requestedServings && (
            <div className="rescale-banner" role="status">
              <p>These amounts are for <strong>{recipe.servings} {recipe.servings === 1 ? "person" : "people"}</strong>. You now have <strong>{requestedServings}</strong> in the form.</p>
              <Button type="button" size="sm" onClick={onRescale} disabled={busy}><RefreshCw className={busy ? "animate-spin" : ""} /> Update for {requestedServings}</Button>
            </div>
          )}

          <p className="recipe-description">{recipe.description}</p>

          <dl className="stat-grid">
            <div><dt><AlarmClock /> Preparation time</dt><dd>{recipe.prepMinutes} min</dd></div>
            <div><dt><CookingPot /> Cooking time</dt><dd>{recipe.cookMinutes} min</dd></div>
            <div><dt><Clock3 /> Total time</dt><dd>{recipe.timeMinutes} min</dd></div>
            <div><dt><Gauge /> Difficulty</dt><dd>{recipe.difficulty}</dd></div>
            <div><dt><Users /> Serves</dt><dd>{recipe.servings} {recipe.servings === 1 ? "person" : "people"}</dd></div>
            <div><dt><CircleDollarSign /> Estimated cost</dt><dd>{recipe.estimatedCost}</dd></div>
          </dl>

          <IngredientsBlock recipe={recipe} />

          {(recipe.equipment.length > 0 || recipe.substitutions.length > 0) && (
            <div className="extras">
              {recipe.equipment.length > 0 && <div><h4 className="block-heading small"><UtensilsCrossed /> Equipment</h4><p>{recipe.equipment.join(", ")}</p></div>}
              {recipe.substitutions.length > 0 && (
                <div><h4 className="block-heading small"><RefreshCw /> If you’re missing something</h4><ul>{recipe.substitutions.map((sub) => <li key={sub}>{sub}</li>)}</ul></div>
              )}
            </div>
          )}

          <section className="steps" aria-labelledby={`${panelId}-steps`}>
            <div className="steps-heading">
              <h3 id={`${panelId}-steps`} className="block-heading">How to make {recipe.title}</h3>
              <details className="seven-cs">
                <summary>Written in the 7 Cs</summary>
                <p>Every step is <strong>Clear</strong>, <strong>Concise</strong>, <strong>Concrete</strong>, <strong>Correct</strong>, <strong>Complete</strong>, <strong>Coherent</strong> and <strong>Courteous</strong>.</p>
              </details>
            </div>
            <ol className="step-list">
              {recipe.steps.map((step, stepIndex) => (
                <li key={`${step.title}-${stepIndex}`} className="step">
                  <span className="step-number" aria-hidden="true">{stepIndex + 1}</span>
                  <div className="step-content">
                    <h4 className="step-title"><span className="sr-only">Step {stepIndex + 1}: </span>{step.title}</h4>
                    <p className="step-text">{step.instruction}</p>
                    <p className="step-meta">
                      <span className="step-time"><Clock3 /> {step.duration}</span>
                      <span className="step-check"><Check /> {step.checkpoint}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {recipe.tip && <p className="recipe-tip"><Lightbulb /> <span><strong>Chef’s tip:</strong> {recipe.tip}</span></p>}
        </div>
      )}
    </article>
  );
}

function IngredientsBlock({ recipe }: { recipe: Recipe }) {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const missing = recipe.ingredients.length - recipe.ingredients.filter((item) => item.haveIt).length;
  const toggle = (index: number) => setChecked((existing) => {
    const next = new Set(existing);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    return next;
  });

  return (
    <section className="ingredients-block">
      <h3 className="block-heading"><ShoppingBasket /> Required ingredients <span className="count-pill">{recipe.ingredients.length}</span></h3>
      <div className="have-missing">
        <div className="have-box">
          <h4>Available ingredients</h4>
          <p>{recipe.availableIngredients.length ? recipe.availableIngredients.join(", ") : "None from your list yet"}</p>
        </div>
        <div className="missing-box">
          <h4>Missing ingredients</h4>
          <p>{recipe.missingIngredients.length ? recipe.missingIngredients.join(", ") : "Nothing missing. You are all set!"}</p>
        </div>
      </div>
      <p className="field-help">{missing > 0 ? `${missing} to buy.` : "Everything is on hand."} Tap an item to tick it off as you gather it.</p>
      <ul className="ingredient-list">
        {recipe.ingredients.map((item, index) => {
          const done = checked.has(index);
          return (
            <li key={`${item.name}-${index}`}>
              <button type="button" className={`ingredient-row ${done ? "ingredient-row-done" : ""}`} aria-pressed={done} onClick={() => toggle(index)}>
                <span className={`tick ${done || item.haveIt ? "tick-on" : ""}`} aria-hidden="true">{(done || item.haveIt) && <Check />}</span>
                <span className="ingredient-name">{item.name}</span>
                <span className="ingredient-amount">{item.amount}</span>
                <span className={`ingredient-tag ${item.haveIt ? "tag-have" : "tag-buy"}`}>{item.haveIt ? "Have" : "To buy"}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
