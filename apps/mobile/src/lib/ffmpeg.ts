import type { FFmpeg } from "@ffmpeg/ffmpeg";
import type { StoredClip } from "./clip-store";
import type { ConcatProgress } from "@reelcoach/core";

const CORE_VERSION = "0.12.9";
const CLASS_WORKER_URL = "/ffmpeg/ffmpeg-worker.js";
const CDNS = [
  `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`,
  `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/umd`,
];
const LOAD_TIMEOUT_MS = 25_000;

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<FFmpeg> | null = null;
const logRing: string[] = [];
function pushLog(msg: string) {
  logRing.push(msg);
  if (logRing.length > 40) logRing.shift();
  // Surface to the page console so we can debug if anything stalls.
  // eslint-disable-next-line no-console
  console.debug("[ffmpeg]", msg);
}
export function lastFfmpegLogs(n = 10): string {
  return logRing.slice(-n).join("\n");
}

async function loadCore(base: string): Promise<FFmpeg> {
  const [{ FFmpeg }, util] = await Promise.all([import("@ffmpeg/ffmpeg"), import("@ffmpeg/util")]);
  const inst = new FFmpeg();
  inst.on("log", ({ message }) => pushLog(message));
  pushLog(`preload core assets from ${base}`);
  const abortController = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      abortController.abort();
      reject(
        new Error(`Încărcarea motorului video a depășit ${Math.round(LOAD_TIMEOUT_MS / 1000)}s.`),
      );
    }, LOAD_TIMEOUT_MS);
  });
  try {
    await Promise.race([
      inst.load(
        {
          classWorkerURL: CLASS_WORKER_URL,
          coreURL: await util.toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
          wasmURL: await util.toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
        },
        { signal: abortController.signal },
      ),
      timeout,
    ]);
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new Error(
        `Încărcarea motorului video a depășit ${Math.round(LOAD_TIMEOUT_MS / 1000)}s.`,
      );
    }
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
  return inst;
}

export async function loadFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (ffmpegLoadPromise) return ffmpegLoadPromise;
  ffmpegLoadPromise = (async () => {
    let lastErr: unknown;
    for (const base of CDNS) {
      try {
        pushLog(`loading core from ${base}`);
        ffmpegInstance = await loadCore(base);
        pushLog("core loaded");
        return ffmpegInstance;
      } catch (e) {
        lastErr = e;
        pushLog(`core load failed: ${(e as Error).message}`);
      }
    }
    throw new Error(`Nu pot încărca motorul video: ${(lastErr as Error)?.message ?? "unknown"}`);
  })();
  try {
    return await ffmpegLoadPromise;
  } finally {
    ffmpegLoadPromise = null;
  }
}

function extFor(mime: string): string {
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("webm")) return "webm";
  return "bin";
}

async function execWithTimeout(
  ffmpeg: FFmpeg,
  args: string[],
  label: string,
  ms: number,
): Promise<void> {
  pushLog(`exec ${label}: ${args.join(" ")}`);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      try {
        ffmpeg.terminate();
      } catch {
        /* noop */
      }
      ffmpegInstance = null;
      reject(
        new Error(
          `${label} a durat prea mult (>${Math.round(ms / 1000)}s). Ultimele log-uri:\n${lastFfmpegLogs(8)}`,
        ),
      );
    }, ms);
  });
  try {
    await Promise.race([ffmpeg.exec(args), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export interface RenderReelOptions {
  overlays?: (Blob | undefined)[];
  outroPng?: Blob;
  outroDuration?: number;
  musicBlob?: Blob;
  musicGain?: number;
  voiceGain?: number;
  overlayFadeIn?: number;
  width?: number;
  height?: number;
  fps?: number;
}

export async function concatClips(
  clips: StoredClip[],
  onProgress?: (p: ConcatProgress) => void,
): Promise<Blob> {
  return renderReel(clips, {}, onProgress);
}

export async function renderReel(
  clips: StoredClip[],
  opts: RenderReelOptions = {},
  onProgress?: (p: ConcatProgress) => void,
): Promise<Blob> {
  const ffmpeg = await loadFFmpeg();
  const { fetchFile } = await import("@ffmpeg/util");

  const fadeIn = opts.overlayFadeIn ?? 0.3;
  const segments: string[] = [];

  const W = opts.width ?? 540;
  const H = opts.height ?? 960;
  const FPS = opts.fps ?? 24;

  let stepStart = 0;
  let stepRange = 0;
  let stepLabel = "";
  const onFfProg = ({ progress }: { progress: number; time: number }) => {
    if (!onProgress || stepRange === 0) return;
    const p = Math.max(0, Math.min(1, progress));
    onProgress({ phase: "encoding", pct: stepStart + p * stepRange, message: stepLabel });
  };
  ffmpeg.on("progress", onFfProg);

  const setStep = (start: number, range: number, label: string) => {
    stepStart = start;
    stepRange = range;
    stepLabel = label;
    onProgress?.({ phase: "encoding", pct: start, message: label });
  };

  const totalSteps = clips.length;
  const perClip = 70 / totalSteps;

  // Per-exec timeout: be generous on mobile but fail fast enough to recover.
  const PER_EXEC_TIMEOUT_MS = 75_000;

  onProgress?.({ phase: "writing", pct: 0, message: "Pregătesc clipurile…" });

  try {
    for (let i = 0; i < clips.length; i++) {
      const c = clips[i];
      const inName = `in${i}.${extFor(c.mimeType)}`;
      const outName = `seg${i}.mp4`;
      const overlay = opts.overlays?.[i];
      const overlayName = overlay ? `ov${i}.png` : null;

      await ffmpeg.writeFile(inName, await fetchFile(c.blob));
      if (overlay && overlayName) {
        await ffmpeg.writeFile(overlayName, await fetchFile(overlay));
      }

      const args: string[] = ["-i", inName];
      if (overlayName) args.push("-i", overlayName);

      const baseVideoFilter = `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=${FPS}`;

      if (overlayName) {
        const overlayFilter =
          fadeIn > 0
            ? `[1:v]scale=${W}:${H},format=rgba,fade=t=in:st=0:d=${fadeIn}:alpha=1[ov]`
            : `[1:v]scale=${W}:${H},format=rgba[ov]`;
        args.push(
          "-filter_complex",
          `[0:v]${baseVideoFilter}[base];${overlayFilter};[base][ov]overlay=0:0:format=auto`,
        );
      } else {
        args.push("-vf", baseVideoFilter);
      }

      args.push(
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-tune",
        "zerolatency",
        "-crf",
        "28",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-ar",
        "44100",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        outName,
      );

      setStep(i * perClip, perClip, `Procesez scena ${i + 1}/${clips.length}…`);
      await execWithTimeout(ffmpeg, args, `scena ${i + 1}`, PER_EXEC_TIMEOUT_MS);
      segments.push(outName);

      await ffmpeg.deleteFile(inName).catch(() => {});
      if (overlayName) await ffmpeg.deleteFile(overlayName).catch(() => {});
    }

    if (opts.outroPng) {
      const outroDur = opts.outroDuration ?? 1.5;
      await ffmpeg.writeFile("outro.png", await fetchFile(opts.outroPng));
      const outroSeg = `seg_outro.mp4`;
      setStep(70, 8, "Adaug outro-ul brand…");
      await execWithTimeout(
        ffmpeg,
        [
          "-loop",
          "1",
          "-t",
          `${outroDur}`,
          "-i",
          "outro.png",
          "-f",
          "lavfi",
          "-t",
          `${outroDur}`,
          "-i",
          "anullsrc=channel_layout=stereo:sample_rate=44100",
          "-vf",
          `scale=${W}:${H},setsar=1,fps=${FPS}`,
          "-c:v",
          "libx264",
          "-preset",
          "ultrafast",
          "-crf",
          "30",
          "-pix_fmt",
          "yuv420p",
          "-c:a",
          "aac",
          "-shortest",
          "-movflags",
          "+faststart",
          outroSeg,
        ],
        "outro",
        PER_EXEC_TIMEOUT_MS,
      );
      segments.push(outroSeg);
      await ffmpeg.deleteFile("outro.png").catch(() => {});
    }

    setStep(78, 5, "Lipesc scenele…");
    const listTxt = segments.map((n) => `file '${n}'`).join("\n");
    await ffmpeg.writeFile("list.txt", new TextEncoder().encode(listTxt));

    const stitchedName = opts.musicBlob ? "stitched.mp4" : "final.mp4";
    await execWithTimeout(
      ffmpeg,
      [
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        "list.txt",
        "-c",
        "copy",
        "-movflags",
        "+faststart",
        stitchedName,
      ],
      "concat",
      PER_EXEC_TIMEOUT_MS,
    );

    if (opts.musicBlob) {
      setStep(83, 12, "Adaug muzica…");
      await ffmpeg.writeFile("music.mp3", await fetchFile(opts.musicBlob));
      const voiceGain = opts.voiceGain ?? 1.0;
      const musicGain = opts.musicGain ?? 0.3;
      await execWithTimeout(
        ffmpeg,
        [
          "-i",
          stitchedName,
          "-i",
          "music.mp3",
          "-filter_complex",
          `[0:a]volume=${voiceGain}[a0];[1:a]volume=${musicGain}[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
          "-map",
          "0:v",
          "-map",
          "[aout]",
          "-c:v",
          "copy",
          "-c:a",
          "aac",
          "-shortest",
          "-movflags",
          "+faststart",
          "final.mp4",
        ],
        "music mix",
        PER_EXEC_TIMEOUT_MS,
      );
      await ffmpeg.deleteFile("music.mp3").catch(() => {});
      await ffmpeg.deleteFile(stitchedName).catch(() => {});
    }

    onProgress?.({ phase: "reading", pct: 96, message: "Finalizez…" });
    const data = await ffmpeg.readFile("final.mp4");

    for (const n of segments) await ffmpeg.deleteFile(n).catch(() => {});
    await ffmpeg.deleteFile("list.txt").catch(() => {});
    await ffmpeg.deleteFile("final.mp4").catch(() => {});

    onProgress?.({ phase: "done", pct: 100 });
    const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
    return new Blob([bytes as BlobPart], { type: "video/mp4" });
  } finally {
    try {
      ffmpeg.off("progress", onFfProg);
    } catch {
      /* instance may be terminated */
    }
  }
}
