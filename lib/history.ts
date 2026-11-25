import type { RecipeRequestInput } from "@/lib/recipes/recipe-validation";
import type { RecipeResponse } from "@/lib/recipes/recipes.server";
import type { ConsultationAction } from "@/lib/recipes/consultation.shared";

export type ChatMessage = {
  role: "user" | "chef";
  text: string;
  cautions?: string[];
  followUp?: string;
  hasPhoto?: boolean;
  action?: ConsultationAction;
};

export type RecipeHistoryEntry = {
  id: string;
  kind: "recipes";
  title: string;
  createdAt: number;
  request: Pick<RecipeRequestInput, "mode" | "ingredients" | "dish" | "servings" | "cuisine">;
  response: RecipeResponse;
};

export type ChatHistoryEntry = {
  id: string;
  kind: "chat";
  title: string;
  createdAt: number;
  messages: ChatMessage[];
};

export type HistoryEntry = RecipeHistoryEntry | ChatHistoryEntry;

export const HISTORY_EVENT = "ingredine-history-updated";
const MAX_ENTRIES = 40;

const storageKey = (userKey: string) => `ingredine-history:${userKey}`;

export function loadHistory(userKey: string): HistoryEntry[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(storageKey(userKey)) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter((item): item is HistoryEntry => Boolean(item) && typeof item === "object" && "id" in item && "kind" in item);
  } catch {
    return [];
  }
}

function write(userKey: string, entries: HistoryEntry[]) {
  try {
    localStorage.setItem(storageKey(userKey), JSON.stringify(entries.slice(0, MAX_ENTRIES)));
    window.dispatchEvent(new Event(HISTORY_EVENT));
  } catch {
    // Storage can be full or blocked. History is a convenience, so fail quietly.
  }
}

/** Adds an entry, or updates the one with the same id and moves it to the top. */
export function saveHistoryEntry(userKey: string, entry: HistoryEntry) {
  const others = loadHistory(userKey).filter((item) => item.id !== entry.id);
  write(userKey, [entry, ...others]);
}

export function deleteHistoryEntry(userKey: string, id: string) {
  write(userKey, loadHistory(userKey).filter((item) => item.id !== id));
}

export function clearHistory(userKey: string) {
  write(userKey, []);
}

export function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
