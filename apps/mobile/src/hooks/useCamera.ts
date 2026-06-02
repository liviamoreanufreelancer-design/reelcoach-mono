import { useCallback, useEffect, useRef, useState } from "react";

export type CameraState =
  | "idle"
  | "requesting"
  | "ready"
  | "denied"
  | "unsupported"
  | "error"
  | "disconnected";

export type Facing = "user" | "environment";

export function useCamera(initialFacing: Facing = "user") {
  const [state, setState] = useState<CameraState>("idle");
  const [facing, setFacing] = useState<Facing>(initialFacing);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const start = useCallback(
    async (f: Facing = facing) => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setState("unsupported");
        return;
      }
      if (typeof window !== "undefined" && typeof window.MediaRecorder === "undefined") {
        setState("unsupported");
        return;
      }
      setState("requesting");
      setError(null);
      try {
        stop();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: f,
            width: { ideal: 1080 },
            height: { ideal: 1920 },
          },
          audio: true,
        });
        streamRef.current = stream;
        // Detect when the user revokes the device from the OS / browser
        // controls (track "ended"). Mark state as disconnected so the UI
        // can offer a reconnect button.
        stream.getTracks().forEach((track) => {
          track.addEventListener("ended", () => {
            if (streamRef.current === stream) {
              streamRef.current = null;
              if (videoRef.current) videoRef.current.srcObject = null;
              setState("disconnected");
            }
          });
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          await videoRef.current.play().catch(() => undefined);
        }
        setFacing(f);
        setState("ready");
      } catch (err) {
        const e = err as DOMException;
        if (e?.name === "NotAllowedError" || e?.name === "PermissionDeniedError") {
          setState("denied");
        } else {
          setState("error");
          setError(e?.message ?? "Eroare necunoscută la pornirea camerei.");
        }
      }
    },
    [facing, stop],
  );

  const switchCamera = useCallback(() => {
    const next: Facing = facing === "user" ? "environment" : "user";
    void start(next);
  }, [facing, start]);

  // Cleanup when the hook unmounts
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    state,
    facing,
    error,
    videoRef,
    streamRef,
    start,
    stop,
    switchCamera,
  };
}

export function pickRecorderMime(): string {
  if (typeof window === "undefined" || typeof window.MediaRecorder === "undefined") {
    return "";
  }
  const candidates = [
    "video/mp4;codecs=avc1,mp4a",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const m of candidates) {
    try {
      if (window.MediaRecorder.isTypeSupported(m)) return m;
    } catch {
      // ignore
    }
  }
  return "";
}
