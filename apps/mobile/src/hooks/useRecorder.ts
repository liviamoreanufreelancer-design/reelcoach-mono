import { useCallback, useRef, useState } from "react";
import { pickRecorderMime } from "./useCamera";

export type RecorderState = "idle" | "recording" | "stopping";

export function useRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const resolveRef = useRef<((b: { blob: Blob; mimeType: string } | null) => void) | null>(null);

  const start = useCallback((stream: MediaStream) => {
    if (state !== "idle") return;
    const mimeType = pickRecorderMime();
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const type = recorder.mimeType || mimeType || "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      chunksRef.current = [];
      resolveRef.current?.({ blob, mimeType: type });
      resolveRef.current = null;
      setState("idle");
    };
    recorder.start(250);
    recRef.current = recorder;
    setState("recording");
  }, [state]);

  const stop = useCallback((): Promise<{ blob: Blob; mimeType: string } | null> => {
    return new Promise((resolve) => {
      const recorder = recRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve(null);
        return;
      }
      resolveRef.current = resolve;
      setState("stopping");
      recorder.stop();
    });
  }, []);

  const cancel = useCallback(() => {
    const recorder = recRef.current;
    if (recorder && recorder.state !== "inactive") {
      try { recorder.stop(); } catch { /* ignore */ }
    }
    chunksRef.current = [];
    resolveRef.current?.(null);
    resolveRef.current = null;
    setState("idle");
  }, []);

  return { state, start, stop, cancel };
}
