import { Camera, ImagePlus, Mic, Square } from "lucide-react";
import { useRef, useState } from "react";

import { CameraDialog } from "@/components/CameraDialog";
import { Button } from "@/components/ui/button";
import { useVoiceInput } from "@/lib/voice";

type MediaButtonsProps = {
  language: string;
  disabled?: boolean;
  /** Called with the chosen or captured photo. */
  onFile: (file: File) => void;
  /** Called with the words the person spoke. */
  onSpeech: (text: string) => void;
};

/** Three clearly labelled input options: upload a photo, take a photo, speak. */
export function MediaButtons({ language, disabled, onFile, onSpeech }: MediaButtonsProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const voice = useVoiceInput(language, onSpeech);

  return (
    <div className="media-buttons">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
      <Button type="button" variant="outline" className="media-button" disabled={disabled} onClick={() => fileRef.current?.click()}>
        <ImagePlus /> <span>Upload photo</span>
      </Button>
      <Button type="button" variant="outline" className="media-button" disabled={disabled} onClick={() => setCameraOpen(true)}>
        <Camera /> <span>Use camera</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        className={`media-button ${voice.listening ? "media-button-live" : ""}`}
        disabled={disabled}
        onClick={voice.listening ? voice.stop : voice.start}
        aria-pressed={voice.listening}
      >
        {voice.listening ? <Square /> : <Mic />} <span>{voice.listening ? "Listening… tap to stop" : "Speak"}</span>
      </Button>
      {voice.error && <p className="media-error" role="alert">{voice.error}</p>}
      <CameraDialog open={cameraOpen} onOpenChange={setCameraOpen} onCapture={onFile} onUseFilePicker={() => fileRef.current?.click()} />
    </div>
  );
}
