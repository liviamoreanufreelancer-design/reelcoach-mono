import type { ReactNode } from "react";

/* Fullscreen mobile-first shell. Holds children in a fixed viewport. */
export function PhoneShell({ children }: { children: ReactNode }) {
  return (
    <div className="phone-frame">
      <div className="relative w-full h-full max-w-[480px] mx-auto overflow-hidden">
        {children}
      </div>
    </div>
  );
}
