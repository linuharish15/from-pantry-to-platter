import { useServerFn } from "@tanstack/react-start";
import { Camera, ChefHat, Lightbulb, LoaderCircle, Plus, Send, Siren, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { MediaButtons } from "@/components/MediaButtons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ChatMessage } from "@/lib/history";
import { compressFoodPhoto } from "@/lib/image-utils";
import { askKitchenChef } from "@/lib/recipes/consultation.functions";
import type { ConsultationAction } from "@/lib/recipes/consultation.shared";
import { consultationStarters, tips } from "@/lib/recipes/options";

type KitchenConsultationProps = {
  language: string;
  recipeTitle: string | undefined;
  servings: number;
  messages: ChatMessage[];
  onMessages: (update: (existing: ChatMessage[]) => ChatMessage[]) => void;
  onNewChat: () => void;
  appContext: {
    section: "ingredients" | "dish" | "consult";
    cuisine: string;
    ingredients: string[];
    dishPantry: string[];
    dishName: string;
    selectedRecipe: string | undefined;
    visibleRecipes: string[];
  };
  onApplyAction: (action: ConsultationAction) => void;
};

export function KitchenConsultation({ language, recipeTitle, servings, messages, onMessages, onNewChat, appContext, onApplyAction }: KitchenConsultationProps) {
  const ask = useServerFn(askKitchenChef);
  const endRef = useRef<HTMLDivElement>(null);
  const [question, setQuestion] = useState("");
  const [attachment, setAttachment] = useState<{ name: string; dataUrl: string }>();
  const [loading, setLoading] = useState(false);
  const [photoWorking, setPhotoWorking] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (messages.length) endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length, loading]);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError("Please use a photo smaller than 12 MB.");
      return;
    }
    setError(undefined);
    setPhotoWorking(true);
    try {
      setAttachment({ name: file.name || "Photo", dataUrl: await compressFoodPhoto(file) });
    } catch {
      setError("This photo could not be prepared. Please try another one, or type your question.");
    } finally {
      setPhotoWorking(false);
    }
  };

  const send = async (text: string) => {
    const cleanQuestion = text.trim() || (attachment ? "Please identify the food in this photo and help me with it." : "");
    if (cleanQuestion.length < 3 || loading || photoWorking) return;
    const sentAttachment = attachment;

    setLoading(true);
    setError(undefined);
    onMessages((existing) => [...existing, { role: "user", text: cleanQuestion, hasPhoto: Boolean(sentAttachment) }]);
    setQuestion("");

    try {
      const result = await ask({ data: {
        question: cleanQuestion,
        language,
        recipeTitle,
        servings,
        history: messages.slice(-10).map((message) => ({
          role: message.role === "chef" ? "assistant" as const : "user" as const,
          text: message.text,
        })),
        appContext: {
          ...appContext,
          servings,
          language,
          ...(appContext.selectedRecipe ? { selectedRecipe: appContext.selectedRecipe } : {}),
        },
        imageDataUrl: sentAttachment?.dataUrl,
      } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onMessages((existing) => [...existing, {
        role: "chef",
        text: result.data.answer,
        cautions: result.data.cautions,
        ...(result.data.followUp ? { followUp: result.data.followUp } : {}),
        ...(result.data.action ? { action: result.data.action } : {}),
      }]);
      setAttachment(undefined);
    } catch {
      setError("Chef could not answer right now. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void send(question);
  };

  return (
    <div className="consult">
      <div className="consult-tips" aria-label="Quick kitchen facts">
        <h3 className="consult-tips-title"><Lightbulb /> Good to know</h3>
        <ul>{tips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
      </div>

      <div className="consult-chat">
        <div className="chat-bar">
          <p className="chat-context">
            <ChefHat />
            {recipeTitle ? <span>Helping with <strong>{recipeTitle}</strong> for {servings} {servings === 1 ? "person" : "people"}</span> : <span>Ask about any dish, ingredient or technique</span>}
          </p>
          {messages.length > 0 && <Button type="button" variant="outline" size="sm" onClick={onNewChat}><Plus /> New chat</Button>}
        </div>

        <div className="chat-log" aria-live="polite" aria-label="Conversation with Chef">
          {messages.length === 0 && !loading && (
            <div className="chat-empty">
              <p className="chat-empty-title">Stuck while cooking? Ask Chef.</p>
              <p>Ask a general question, get cooking help, or ask how to use IngreDine. For page changes, Chef will suggest an action for you to confirm.</p>
              <div className="starter-list">
                {consultationStarters.map((starter) => <button key={starter} type="button" className="starter" onClick={() => void send(starter)}>{starter}</button>)}
              </div>
            </div>
          )}
          {messages.map((message, index) => (
            message.role === "user" ? (
              <div key={index} className="bubble bubble-user">
                <span className="bubble-who">You</span>
                {message.hasPhoto && <span className="bubble-photo"><Camera /> Photo shared</span>}
                <p className="bubble-user-text">{message.text}</p>
              </div>
            ) : (
              <div key={index} className="bubble bubble-chef">
                <span className="bubble-who"><ChefHat /> Chef</span>
                <p className="chef-answer">{message.text}</p>
                {message.cautions?.length ? (
                  <div className="chef-cautions">
                    <h4><Siren /> Please note</h4>
                    <ul>{message.cautions.map((caution) => <li key={caution}>{caution}</li>)}</ul>
                  </div>
                ) : null}
                {message.followUp && <p className="chef-followup">{message.followUp}</p>}
                {message.action && (
                  <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => { if (message.action) onApplyAction(message.action); }}>
                    {message.action.type === "navigate" ? `Open ${message.action.section === "consult" ? "Kitchen Consultation" : message.action.section === "dish" ? "Make a specific dish" : "Use my ingredients"}` :
                      message.action.type === "set_servings" ? `Set servings to ${message.action.servings}` :
                        message.action.type === "set_dish" ? `Use dish: ${message.action.dish}` :
                          message.action.ingredients.length ? `Use ${message.action.ingredients.length} ingredients` : "Clear ingredients"}
                  </Button>
                )}
              </div>
            )
          ))}
          {loading && <div className="bubble bubble-chef"><span className="bubble-who"><ChefHat /> Chef</span><p className="chef-thinking"><LoaderCircle className="animate-spin" /> Chef is thinking…</p></div>}
          <div ref={endRef} />
        </div>

        {attachment && (
          <div className="attachment">
            <img src={attachment.dataUrl} alt="Photo for Chef" />
            <span>{attachment.name}</span>
            <Button type="button" variant="ghost" size="icon" onClick={() => setAttachment(undefined)} aria-label="Remove photo"><X /></Button>
          </div>
        )}

        <form onSubmit={submit} className="chat-form">
          <label htmlFor="chef-question" className="sr-only">Your question for Chef</label>
          <Textarea
            id="chef-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(question); } }}
            rows={3}
            placeholder="Type your cooking question here, or use the photo and voice buttons…"
            className="chat-textarea"
          />
          <div className="chat-actions">
            <MediaButtons language={language} disabled={photoWorking} onFile={(file) => void handleFile(file)} onSpeech={(spoken) => setQuestion((existing) => (existing ? `${existing} ${spoken}` : spoken))} />
            <Button type="submit" className="ask-button" disabled={(!question.trim() && !attachment) || loading || photoWorking}>
              {loading ? <LoaderCircle className="animate-spin" /> : <Send />} Ask Chef
            </Button>
          </div>
          {photoWorking && <p className="field-help">Preparing your photo…</p>}
        </form>
        {error && <p className="error-note" role="alert">{error}</p>}
      </div>
    </div>
  );
}
