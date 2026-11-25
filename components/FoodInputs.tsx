import { Globe2, Minus, Plus, Search, X } from "lucide-react";
import { useMemo, useState, type KeyboardEvent } from "react";

import { MediaButtons } from "@/components/MediaButtons";
import { Button } from "@/components/ui/button";
import { useFoodPhoto } from "@/lib/food-photo";
import {
  currencyOptions, cuisineGroups, dishSuggestions, ingredientSuggestions, languageOptions, WORLDWIDE_CUISINE,
} from "@/lib/recipes/options";
import { MAX_SERVINGS } from "@/lib/recipes/recipe-validation";

const MAX_INGREDIENTS = 24;

function splitItems(raw: string) {
  return raw.split(/[,\n;]|\band\b/i).map((item) => item.trim()).filter(Boolean);
}

function matches(list: readonly string[], query: string, exclude: (item: string) => boolean, limit = 6) {
  const q = query.trim().toLowerCase();
  if (q.length < 1) return [];
  const starts = list.filter((item) => item.toLowerCase().startsWith(q));
  const contains = list.filter((item) => !item.toLowerCase().startsWith(q) && item.toLowerCase().includes(q));
  return [...starts, ...contains].filter((item) => !exclude(item)).slice(0, limit);
}

type PhotoAssistProps = {
  language: string;
  onIngredients: (items: string[]) => void;
  onSpeech: (text: string) => void;
  dishAction?: { label: (dish: string) => string; onUse: (dish: string) => void };
};

/** Upload, camera and voice tools with a short result line. Used under the ingredient and dish boxes. */
function PhotoAssist({ language, onIngredients, onSpeech, dishAction }: PhotoAssistProps) {
  const photo = useFoodPhoto(language, onIngredients);
  return (
    <div className="photo-assist" aria-busy={photo.loading}>
      <p className="tools-hint">Don’t know the name? Add a photo or say it aloud.</p>
      <MediaButtons language={language} disabled={photo.loading} onFile={(file) => void photo.handleFile(file)} onSpeech={onSpeech} />
      {(photo.photo || photo.status) && (
        <div className="photo-result" aria-live="polite">
          {photo.photo && <img src={photo.photo} alt="Your photo" className="photo-thumb" />}
          <div className="photo-result-text">
            <p>{photo.status}</p>
            {photo.dishGuess && dishAction && (
              <Button type="button" variant="link" className="photo-dish-link" onClick={() => dishAction.onUse(photo.dishGuess!)}>
                {dishAction.label(photo.dishGuess)}
              </Button>
            )}
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={photo.clear} aria-label="Remove photo"><X /></Button>
        </div>
      )}
    </div>
  );
}

type IngredientEntryProps = {
  id: string;
  label: string;
  help: string;
  ingredients: string[];
  onChange: (items: string[]) => void;
  language: string;
  withTools?: boolean;
  placeholder?: string;
  dishAction?: PhotoAssistProps["dishAction"];
};

/** Ingredient chips with suggestions while typing. Enter or comma adds an ingredient. */
export function IngredientEntry({ id, label, help, ingredients, onChange, language, withTools = true, placeholder, dishAction }: IngredientEntryProps) {
  const [text, setText] = useState("");

  const addMany = (items: string[], base: string[] = ingredients) => {
    const known = new Set(base.map((item) => item.toLowerCase()));
    const fresh = items.filter((item) => {
      const key = item.toLowerCase();
      if (known.has(key)) return false;
      known.add(key);
      return true;
    });
    onChange([...base, ...fresh].slice(0, MAX_INGREDIENTS));
  };

  // Only the part after the last comma is still being typed.
  const lastComma = Math.max(text.lastIndexOf(","), text.lastIndexOf("\n"));
  const typing = text.slice(lastComma + 1);
  const finished = splitItems(text.slice(0, lastComma + 1));
  const suggestions = useMemo(
    () => matches(ingredientSuggestions, typing, (item) => ingredients.some((added) => added.toLowerCase() === item.toLowerCase())),
    [typing, ingredients],
  );

  const commit = () => {
    const items = splitItems(text);
    if (items.length) addMany(items);
    setText("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      if (text.trim()) {
        event.preventDefault();
        commit();
      }
      return;
    }
    if (event.key === "Backspace" && !text && ingredients.length) onChange(ingredients.slice(0, -1));
  };

  const quick = ["Rice", "Onion", "Tomato", "Egg", "Paneer"].filter((item) => !ingredients.some((added) => added.toLowerCase() === item.toLowerCase()));

  return (
    <div className="entry-field">
      <label htmlFor={id} className="field-label">{label}</label>
      <p className="field-help" id={`${id}-help`}>{help}</p>
      <div className="entry-box">
        {ingredients.length > 0 && (
          <ul className="chip-list" aria-label="Ingredients added">
            {ingredients.map((item, index) => (
              <li key={`${item}-${index}`} className="chip">
                <span>{item}</span>
                <button type="button" onClick={() => onChange(ingredients.filter((_, i) => i !== index))} aria-label={`Remove ${item}`}><X /></button>
              </li>
            ))}
          </ul>
        )}
        <input
          id={id}
          type="text"
          className="entry-input"
          autoComplete="off"
          aria-describedby={`${id}-help`}
          value={text}
          placeholder={placeholder ?? (ingredients.length ? "Add another ingredient…" : "Type an ingredient, like tomato")}
          onChange={(event) => {
            const value = event.target.value;
            if (value.endsWith(",")) {
              addMany(splitItems(value));
              setText("");
            } else setText(value);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => { if (text.trim() && !suggestions.length) commit(); }}
        />
        <Button type="button" size="sm" className="entry-add" onClick={commit} disabled={!text.trim()}><Plus /> Add</Button>
      </div>
      {typing.trim() && suggestions.length > 0 && (
        <div className="suggestion-row" role="group" aria-label="Ingredient suggestions">
          <span className="suggestion-label"><Search /> Suggestions</span>
          {suggestions.map((item) => (
            <button key={item} type="button" className="suggestion" onClick={() => { addMany([...finished, item]); setText(""); }}>{item}</button>
          ))}
        </div>
      )}
      {!text.trim() && ingredients.length < 3 && quick.length > 0 && (
        <div className="suggestion-row" role="group" aria-label="Quick add">
          <span className="suggestion-label">Quick add</span>
          {quick.slice(0, 5).map((item) => <button key={item} type="button" className="suggestion" onClick={() => addMany([item])}>{item}</button>)}
        </div>
      )}
      {withTools && (
        <PhotoAssist
          language={language}
          onIngredients={(items) => addMany(items)}
          onSpeech={(spoken) => addMany(splitItems(spoken))}
          dishAction={dishAction}
        />
      )}
    </div>
  );
}

type DishEntryProps = { value: string; onChange: (value: string) => void; language: string };

/** Dish name box with suggestions while typing, plus photo and voice help. */
export function DishEntry({ value, onChange, language }: DishEntryProps) {
  const suggestions = useMemo(
    () => matches(dishSuggestions, value, (dish) => dish.toLowerCase() === value.trim().toLowerCase(), 7),
    [value],
  );
  const popular = ["Chicken biryani", "Masala dosa", "Chocolate cake", "Pad Thai"];

  return (
    <div className="entry-field">
      <label htmlFor="dish-input" className="field-label">Which dish would you like to make?</label>
      <p className="field-help" id="dish-help">Any dish, dessert, snack or drink from anywhere in the world.</p>
      <div className="entry-box">
        <input
          id="dish-input"
          type="text"
          className="entry-input entry-input-large"
          autoComplete="off"
          aria-describedby="dish-help"
          value={value}
          placeholder="Type a dish, like masala dosa"
          maxLength={100}
          onChange={(event) => onChange(event.target.value)}
        />
        {value && <Button type="button" variant="ghost" size="icon" onClick={() => onChange("")} aria-label="Clear dish name"><X /></Button>}
      </div>
      {value.trim() && suggestions.length > 0 && (
        <div className="suggestion-row" role="group" aria-label="Dish suggestions">
          <span className="suggestion-label"><Search /> Suggestions</span>
          {suggestions.map((dish) => <button key={dish} type="button" className="suggestion" onClick={() => onChange(dish)}>{dish}</button>)}
        </div>
      )}
      {!value.trim() && (
        <div className="suggestion-row" role="group" aria-label="Popular dishes">
          <span className="suggestion-label">Popular</span>
          {popular.map((dish) => <button key={dish} type="button" className="suggestion" onClick={() => onChange(dish)}>{dish}</button>)}
        </div>
      )}
      <PhotoAssist
        language={language}
        onIngredients={() => undefined}
        onSpeech={(spoken) => onChange(spoken.replace(/[.!?]+$/, ""))}
        dishAction={{ label: (dish) => `Make “${dish}”`, onUse: onChange }}
      />
    </div>
  );
}

type CuisinePickerProps = { value: string; onChange: (value: string) => void };

/** Cuisine preference. All Worldwide Cuisines is the last option and means every cuisine is allowed. */
export function CuisinePicker({ value, onChange }: CuisinePickerProps) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const groups = cuisineGroups
    .map((group) => ({ label: group.label, options: group.options.filter((option) => !q || option.toLowerCase().includes(q)) }))
    .filter((group) => group.options.length);

  return (
    <fieldset className="cuisine-picker">
      <legend className="field-label">Cuisine preference</legend>
      <p className="field-help">Currently chosen: <strong>{value}</strong></p>
      <div className="cuisine-search">
        <Search aria-hidden="true" />
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search cuisines, like Kerala or vegan" aria-label="Search cuisines" />
      </div>
      <div className="cuisine-scroll" role="radiogroup" aria-label="Cuisine preference">
        {groups.map((group) => (
          <div key={group.label} className="cuisine-group">
            <h4>{group.label}</h4>
            <div className="cuisine-chips">
              {group.options.map((option) => (
                <button key={option} type="button" role="radio" aria-checked={value === option} className={`cuisine-chip ${value === option ? "cuisine-chip-on" : ""}`} onClick={() => onChange(option)}>{option}</button>
              ))}
            </div>
          </div>
        ))}
        {!groups.length && <p className="field-help">No cuisine matches “{query}”. Choose All Worldwide Cuisines below to include everything.</p>}
      </div>
      <button type="button" role="radio" aria-checked={value === WORLDWIDE_CUISINE} className={`worldwide-chip ${value === WORLDWIDE_CUISINE ? "worldwide-chip-on" : ""}`} onClick={() => onChange(WORLDWIDE_CUISINE)}>
        <Globe2 /> <span>{WORLDWIDE_CUISINE}</span> <small>Includes every cuisine</small>
      </button>
    </fieldset>
  );
}

type CookingOptionsProps = {
  peopleText: string;
  onPeopleText: (value: string) => void;
  onStep: (delta: number) => void;
  language: string;
  onLanguage: (value: string) => void;
  currency: string;
  onCurrency: (value: string) => void;
};

/** Number of people (typed by hand), recipe language and cost currency. */
export function CookingOptions({ peopleText, onPeopleText, onStep, language, onLanguage, currency, onCurrency }: CookingOptionsProps) {
  return (
    <div className="options-row">
      <div className="option people-option">
        <label htmlFor="people-input" className="field-label">How many people are you cooking for?</label>
        <div className="people-control">
          <Button type="button" variant="outline" size="icon" onClick={() => onStep(-1)} aria-label="One fewer person"><Minus /></Button>
          <input
            id="people-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={3}
            value={peopleText}
            onChange={(event) => { if (/^\d{0,3}$/.test(event.target.value)) onPeopleText(event.target.value); }}
            aria-describedby="people-help"
            className="people-input"
          />
          <Button type="button" variant="outline" size="icon" onClick={() => onStep(1)} aria-label="One more person"><Plus /></Button>
          <span className="people-unit">people</span>
        </div>
        <p className="field-help" id="people-help">Type any number from 1 to {MAX_SERVINGS}. Ingredient amounts adjust to match.</p>
      </div>
      <div className="option">
        <label htmlFor="language-select" className="field-label">Recipe language</label>
        <select id="language-select" className="select-input" value={language} onChange={(event) => onLanguage(event.target.value)}>
          {languageOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
      <div className="option">
        <label htmlFor="currency-select" className="field-label">Show cost in</label>
        <select id="currency-select" className="select-input" value={currency} onChange={(event) => onCurrency(event.target.value)}>
          {currencyOptions.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
        </select>
      </div>
    </div>
  );
}
