import { Camera, ImagePlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type CameraDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File) => void;
  /** Used when the browser cannot open a live camera (for example, permission denied). */
  onUseFilePicker: () => void;
};

/** Live camera preview with a capture button. Photos are only used when the person presses Take photo. */
export function CameraDialog({ open, onOpenChange, onCapture, onUseFilePicker }: CameraDialogProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    let active: MediaStream | null = null;
    setError(undefined);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser cannot open the camera here. You can choose a photo from your device instead.");
      return undefined;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then((media) => {
        if (cancelled) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        active = media;
        setStream(media);
      })
      .catch(() => {
        if (!cancelled) setError("The camera is not available. Please allow camera access in your browser, or choose a photo from your device.");
      });

    return () => {
      cancelled = true;
      active?.getTracks().forEach((track) => track.stop());
      setStream(null);
    };
  }, [open]);

  const attachStream = (element: HTMLVideoElement | null) => {
    videoRef.current = element;
    if (element && stream && element.srcObject !== stream) {
      element.srcObject = stream;
      void element.play().catch(() => undefined);
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setError("The photo could not be captured. Please try again.");
        return;
      }
      onCapture(new File([blob], "camera-photo.jpg", { type: "image/jpeg" }));
      onOpenChange(false);
    }, "image/jpeg", 0.9);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="camera-dialog">
        <DialogHeader>
          <DialogTitle className="dialog-title">Take a photo</DialogTitle>
          <DialogDescription className="dialog-copy">Point the camera at your ingredients or a finished dish.</DialogDescription>
        </DialogHeader>
        {error ? (
          <div className="camera-error" role="alert">
            <p>{error}</p>
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); onUseFilePicker(); }}><ImagePlus /> Choose a photo instead</Button>
          </div>
        ) : (
          <>
            <video ref={attachStream} className="camera-video" playsInline muted autoPlay aria-label="Live camera preview" />
            <Button type="button" className="camera-shutter" onClick={capture} disabled={!stream}><Camera /> Take photo</Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
