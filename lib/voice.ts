import { useCallback, useEffect, useRef, useState } from "react";

import { speechLocales } from "@/lib/recipes/options";

type SpeechResultEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/** Browser voice recognition. Calls onText with the spoken words once the person stops speaking. */
export function useVoiceInput(language: string, onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string>();
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onTextRef = useRef(onText);

  useEffect(() => { onTextRef.current = onText; }, [onText]);
  useEffect(() => () => recognitionRef.current?.stop(), []);

  const stop = useCallback(() => recognitionRef.current?.stop(), []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError("Voice input is not supported in this browser. Please try Chrome, Edge or Safari, or type instead.");
      return;
    }
    if (recognitionRef.current && listening) {
      recognitionRef.current.stop();
      return;
    }
    setError(undefined);
    const recognition = new Ctor();
    recognition.lang = speechLocales[language] ?? "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) onTextRef.current(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = (event) => {
      setListening(false);
      setError(event.error === "not-allowed"
        ? "Microphone access is blocked. Please allow the microphone in your browser, or type instead."
        : "We could not hear you clearly. Please try again, or type instead.");
    };
    recognitionRef.current = recognition;
    setListening(true);
    try {
      recognition.start();
    } catch {
      setListening(false);
    }
  }, [language, listening]);

  return { listening, error, start, stop, clearError: () => setError(undefined) };
}
