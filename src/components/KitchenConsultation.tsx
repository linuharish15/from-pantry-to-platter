import { useServerFn } from "@tanstack/react-start";
import { Camera, Mic, Send, Upload, X } from "lucide-react";
import { useRef, useState, useEffect, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AuthAccount } from "@/components/AuthAccount";
import { compressFoodPhoto } from "@/lib/image-utils";
import { askKitchenChef } from "@/lib/recipes/consultation.functions";

type KitchenConsultationProps = {
  language: string;
  recipeTitle: string | undefined;
  servings: number;
};

type ChatMessage = {
  role: "user" | "chef";
  text: string;
  cautions?: string[];
  followUp?: string;
  hasPhoto?: boolean;
};

export function KitchenConsultation({ language, recipeTitle, servings }: KitchenConsultationProps) {
  const ask = useServerFn(askKitchenChef);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [attachment, setAttachment] = useState<{ name: string; dataUrl: string }>();
  const [loading, setLoading] = useState(false);
  const [photoWorking, setPhotoWorking] = useState(false);
  const [error, setError] = useState<string>();
  const [listening, setListening] = useState(false);

  const startVoice = () => {
    const SpeechRecognition = (window as unknown as {
      SpeechRecognition?: new () => {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        start: () => void;
        stop: () => void;
        onresult: (event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void;
        onend: () => void;
        onerror: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        start: () => void;
        stop: () => void;
        onresult: (event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void;
        onend: () => void;
        onerror: () => void;
      };
    }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition as
      | (new () => {
          lang: string;
          continuous: boolean;
          interimResults: boolean;
          start: () => void;
          stop: () => void;
          onresult: (event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void;
          onend: () => void;
          onerror: () => void;
        })
      | undefined;

    if (!SpeechRecognition) {
      setError("Voice recognition is not supported by this browser. You can still type your question.");
      return;
    }

    const recognition = new SpeechRecognition();
    const recognitionLocales: Record<string, string> = {
      English: "en-US", Tamil: "ta-IN", Hindi: "hi-IN", Spanish: "es-ES", French: "fr-FR",
      Japanese: "ja-JP", Korean: "ko-KR", "Mandarin Chinese": "zh-CN", Arabic: "ar-SA",
      Portuguese: "pt-BR", German: "de-DE", Italian: "it-IT", Bengali: "bn-BD", Telugu: "te-IN",
      Marathi: "mr-IN", Urdu: "ur-PK", Indonesian: "id-ID", Vietnamese: "vi-VN", Thai: "th-TH",
      Turkish: "tr-TR", Russian: "ru-RU", Dutch: "nl-NL", Greek: "el-GR", Swahili: "sw-KE",
      Polish: "pl-PL", Ukrainian: "uk-UA", Persian: "fa-IR", Malayalam: "ml-IN",
    };
    recognition.lang = recognitionLocales[language] ?? "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) setQuestion((existing) => existing ? `${existing} ${transcript}` : transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      setError("Voice input was unavailable. Please check microphone permission or type your question.");
    };
    setListening(true);
    recognition.start();
  };

  const handleAttachment = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Please use an image smaller than 8 MB.");
      return;
    }
    setError(undefined);
    setPhotoWorking(true);
    try {
      const dataUrl = await compressFoodPhoto(file);
      setAttachment({ name: file.name, dataUrl });
    } catch {
      setError("This photo could not be prepared. Try another image or type your question.");
    } finally {
      setPhotoWorking(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanQuestion = question.trim() || (attachment ? "Please identify the food in this photo and help me with it." : "");
    if (cleanQuestion.length < 3 || loading || photoWorking) return;
    const sentAttachment = attachment;

    setLoading(true);
    setError(undefined);
    setMessages((existing) => [...existing, { role: "user", text: cleanQuestion, hasPhoto: Boolean(sentAttachment) }]);
    setQuestion("");

    try {
      const result = await ask({ data: {
        question: cleanQuestion,
        language,
        recipeTitle,
        servings,
        imageDataUrl: sentAttachment?.dataUrl,
      } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessages((existing) => [...existing, {
        role: "chef",
        text: result.data.answer,
        cautions: result.data.cautions,
        ...(result.data.followUp ? { followUp: result.data.followUp } : {}),
      }]);
      setAttachment(undefined);
    } catch {
      setError("The chef could not answer right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!messages.length) return;
    const transcript = messages.map((message) => [
      `${message.role === "user" ? "You" : "Chef"}: ${message.text}${message.hasPhoto ? " (photo attached)" : ""}`,
      ...(message.cautions?.length ? [`Safety notes: ${message.cautions.join("; ")}`] : []),
      ...(message.followUp ? [`Chef follow-up: ${message.followUp}`] : []),
    ].join("\n")).slice(-20);
    localStorage.setItem("pantry-plate-chat-history", JSON.stringify(transcript));
    window.dispatchEvent(new Event("pantry-plate-history-updated"));
  }, [messages]);

  return (
    <section className="consultation-section mt-8 border-t border-border/70 pt-6" aria-labelledby="consultation-title">
      <div className="consultation-heading mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold uppercase text-primary">Cooking support, when you need it</div>
          <h2 id="consultation-title" className="mt-1 font-display text-[28px] leading-tight">Kitchen Consultation</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Ask about substitutions, doneness, temperatures, allergies, preparation, timing, or the best next step.
          </p>
        </div>
        <AuthAccount />
      </div>

      {messages.length > 0 && (
        <div className="mb-4 max-h-[360px] space-y-3 overflow-y-auto rounded-lg border border-border/70 bg-card p-3" aria-live="polite">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`rounded-md px-3 py-2.5 ${message.role === "user" ? "ml-8 bg-secondary" : "mr-8 border-l-2 border-primary bg-primary/5"}`}>
              <div className={`text-[10px] font-bold uppercase ${message.role === "user" ? "text-muted-foreground" : "text-primary"}`}>{message.role === "user" ? "You" : "Chef"}</div>
              {message.hasPhoto && <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground"><Camera size={12} /> Photo shared</p>}
              <p className="mt-1 text-sm leading-6">{message.text}</p>
              {message.cautions?.length ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  {message.cautions.map((caution) => <li key={caution}>{caution}</li>)}
                </ul>
              ) : null}
              {message.followUp && <p className="mt-2 text-sm font-medium text-primary">{message.followUp}</p>}
            </div>
          ))}
          {loading && <p className="mr-8 rounded-md border-l-2 border-primary bg-primary/5 px-3 py-2 text-sm text-muted-foreground">The chef is considering your question…</p>}
        </div>
      )}

      {attachment && (
        <div className="mb-2 flex items-center gap-3 rounded-md border border-border bg-card p-2">
          <img src={attachment.dataUrl} alt="Question attachment preview" className="size-12 rounded object-cover" />
          <span className="min-w-0 flex-1 truncate text-xs">{attachment.name}</span>
          <Button type="button" variant="ghost" size="icon" onClick={() => setAttachment(undefined)} aria-label="Remove photo"><X size={15} /></Button>
        </div>
      )}

      <form onSubmit={submit} className="rounded-lg border border-border bg-card p-2 shadow-sm">
        <Textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={3} placeholder="Ask Chef about your dish…" className="min-h-[76px] resize-none border-0 shadow-none focus-visible:ring-0" />
        <div className="flex items-center justify-between gap-2 border-t border-border/70 pt-2">
          <div className="flex items-center gap-1">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => { void handleAttachment(event.target.files?.[0]); event.target.value = ""; }} />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { void handleAttachment(event.target.files?.[0]); event.target.value = ""; }} />
            <Button type="button" variant="ghost" size="icon" onClick={() => fileRef.current?.click()} aria-label="Upload a photo" title="Upload a photo"><Upload size={17} /></Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => cameraRef.current?.click()} aria-label="Take a photo" title="Take a photo"><Camera size={17} /></Button>
            <Button type="button" variant="ghost" size="icon" onClick={startVoice} aria-label="Use voice recognition" title="Voice recognition" className={listening ? "text-destructive" : ""}><Mic size={17} /></Button>
            <span className="hidden text-[11px] text-muted-foreground sm:inline">{photoWorking ? "Preparing photo…" : listening ? "Listening…" : "Photo or voice optional"}</span>
          </div>
          <Button type="submit" disabled={(!question.trim() && !attachment) || loading || photoWorking} className="gap-2"><Send size={15} /> Ask Chef</Button>
        </div>
      </form>
      {error && <p className="mt-2 border-l-2 border-destructive px-3 py-2 text-sm text-destructive" role="alert">{error}</p>}
    </section>
  );
}
