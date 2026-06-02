"use client";

/**
 * Combobox — a text input with a dropdown of suggestions that filter as
 * the user types, but the user can also type anything not in the list.
 *
 * Used for the pattern field on each scene: editors get hints (Before,
 * Process, etc.) but can type "Tip 1", "Demo", or anything custom.
 *
 * Behavior:
 *   - Click input → dropdown opens with all suggestions
 *   - Type → suggestions filter (case-insensitive contains)
 *   - Click a suggestion → input is filled with that value, dropdown closes
 *   - Press Enter or blur → commits current value (whatever the user typed)
 *   - Press Escape → closes dropdown, keeps previous value
 */

import { useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";

type Suggestion = {
  value: string;
  label: string;
  desc?: string;
};

export default function Combobox({
  value,
  onCommit,
  suggestions,
  placeholder,
  allowClear = true,
}: {
  value: string | null;
  onCommit: (next: string | null) => void;
  suggestions: Suggestion[];
  placeholder?: string;
  allowClear?: boolean;
}) {
  const [draft, setDraft] = useState(value ?? "");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep draft in sync when external value changes (e.g. saved from server).
  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  // Close dropdown when clicking outside.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        commitDraft();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, draft]);

  const commitDraft = () => {
    const next = draft.trim() || null;
    // Only commit if it actually changed.
    if (next !== value) onCommit(next);
  };

  const filtered = draft.trim()
    ? suggestions.filter((s) =>
        s.label.toLowerCase().includes(draft.toLowerCase()) ||
        s.value.toLowerCase().includes(draft.toLowerCase()),
      )
    : suggestions;

  const selectSuggestion = (s: Suggestion) => {
    setDraft(s.label);
    onCommit(s.label);
    setOpen(false);
    inputRef.current?.blur();
  };

  const clear = () => {
    setDraft("");
    onCommit(null);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitDraft();
              setOpen(false);
              inputRef.current?.blur();
            } else if (e.key === "Escape") {
              e.preventDefault();
              setDraft(value ?? "");
              setOpen(false);
              inputRef.current?.blur();
            }
          }}
          placeholder={placeholder}
          className="input pr-16"
          autoComplete="off"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {allowClear && draft && (
            <button
              type="button"
              onClick={clear}
              aria-label="Șterge"
              className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white/85 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen((o) => !o);
              if (!open) inputRef.current?.focus();
            }}
            aria-label="Deschide sugestiile"
            className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white/85 transition"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 max-h-[260px] overflow-y-auto rounded-xl border border-[#E8D5B5]/22 bg-[#0F1419]/95 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          {filtered.length === 0 ? (
            <div className="px-3 py-2.5 text-[12px] text-white/50">
              Niciun rezultat. Tot poți tasta ce vrei tu.
            </div>
          ) : (
            <ul>
              {filtered.map((s) => (
                <li key={s.value}>
                  <button
                    type="button"
                    onClick={() => selectSuggestion(s)}
                    className="w-full text-left px-3 py-2 hover:bg-white/[0.06] transition flex flex-col gap-0.5"
                  >
                    <span className="text-[13px] text-white">{s.label}</span>
                    {s.desc && (
                      <span className="text-[10px] text-white/50 leading-snug">{s.desc}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
