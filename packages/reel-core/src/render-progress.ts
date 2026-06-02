export type ConcatProgress = {
  phase: "loading" | "writing" | "encoding" | "reading" | "done";
  pct: number;
  message?: string;
};