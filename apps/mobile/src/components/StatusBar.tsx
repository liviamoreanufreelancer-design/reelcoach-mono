/* Mock iOS-style status bar — subtle premium signature */
export function StatusBar({ time = "9:41" }: { time?: string }) {
  return (
    <div className="flex items-center justify-between px-2 text-white/85 text-[13px] font-semibold tracking-tight"
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      <span>{time}</span>
      <div className="flex items-center gap-1.5">
        {/* Signal */}
        <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden>
          <rect x="0"  y="6" width="3" height="4" rx="0.5" fill="currentColor" />
          <rect x="5"  y="4" width="3" height="6" rx="0.5" fill="currentColor" />
          <rect x="10" y="2" width="3" height="8" rx="0.5" fill="currentColor" />
          <rect x="15" y="0" width="3" height="10" rx="0.5" fill="currentColor" />
        </svg>
        {/* Wifi */}
        <svg width="15" height="11" viewBox="0 0 15 11" fill="none" aria-hidden>
          <path d="M7.5 10a1 1 0 100-2 1 1 0 000 2z" fill="currentColor"/>
          <path d="M3.7 6.5a5.5 5.5 0 017.6 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          <path d="M1 4a9 9 0 0113 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        {/* Battery */}
        <svg width="26" height="11" viewBox="0 0 26 11" fill="none" aria-hidden>
          <rect x="0.5" y="0.5" width="22" height="10" rx="2.5" stroke="currentColor" strokeOpacity="0.6"/>
          <rect x="2"   y="2"   width="17" height="7"  rx="1.5" fill="currentColor"/>
          <rect x="24"  y="3.5" width="1.5" height="4" rx="0.5" fill="currentColor" fillOpacity="0.6"/>
        </svg>
      </div>
    </div>
  );
}
