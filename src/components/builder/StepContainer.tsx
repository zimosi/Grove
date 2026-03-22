"use client";
import { CONTAINERS } from "@/data/catalog";
import type { ContainerShape } from "@/types";

interface StepContainerProps {
  selected: ContainerShape | null;
  onSelect: (shape: ContainerShape) => void;
  onNext: () => void;
}

const ShapeIcon = ({ shape, active }: { shape: ContainerShape; active: boolean }) => {
  const stroke = active ? "#5cbf75" : "rgba(216,232,220,0.25)";
  if (shape === "jar")
    return (
      <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
        <path d="M11 10 L10 30 Q10 31 11 31 L25 31 Q26 31 26 30 L25 10Z"
          stroke={stroke} strokeWidth="1.4"
          fill={active ? "rgba(92,191,117,0.08)" : "none"} />
        <path d="M10 10 Q18 8 26 10" stroke={stroke} strokeWidth="1.4" fill="none"/>
      </svg>
    );
  return (
    <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
      <path d="M5 10 L5 28 L31 28 L31 10"
        stroke={stroke} strokeWidth="1.4"
        fill={active ? "rgba(92,191,117,0.08)" : "none"} strokeLinejoin="round"/>
      <line x1="5"  y1="10" x2="9"  y2="7" stroke={stroke} strokeWidth="1" strokeOpacity="0.5"/>
      <line x1="31" y1="10" x2="35" y2="7" stroke={stroke} strokeWidth="1" strokeOpacity="0.5"/>
      <line x1="9"  y1="7"  x2="35" y2="7" stroke={stroke} strokeWidth="1" strokeOpacity="0.5"/>
    </svg>
  );
};

export default function StepContainer({ selected, onSelect, onNext }: StepContainerProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="mb-8">
        <p className="grove-step-label mb-3">Step 1 — Container</p>
        <h2 className="grove-heading text-[1.85rem] mb-3" style={{ fontFamily: "var(--font-display)" }}>
          Choose your<br />vessel
        </h2>
        <p className="grove-body text-[0.82rem]">
          Each container creates a different microworld. Hand-blown glass with real optical clarity.
        </p>
      </div>

      <div className="flex flex-col gap-3 flex-1">
        {CONTAINERS.map((c) => {
          const isActive = selected === c.shape;
          return (
            <button
              key={c.shape}
              onClick={() => onSelect(c.shape)}
              className="group w-full text-left rounded-2xl overflow-hidden relative transition-all duration-200"
              style={{
                border: isActive ? "1px solid rgba(92,191,117,0.35)" : "1px solid rgba(255,255,255,0.07)",
                background: isActive ? "rgba(92,191,117,0.07)" : "rgba(255,255,255,0.03)",
                boxShadow: isActive ? "0 0 0 1px rgba(92,191,117,0.12), 0 0 28px rgba(92,191,117,0.05)" : "none",
              }}
              onMouseEnter={e => { if (!isActive) { (e.currentTarget.style.borderColor = "rgba(255,255,255,0.13)"); (e.currentTarget.style.background = "rgba(255,255,255,0.05)"); } }}
              onMouseLeave={e => { if (!isActive) { (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"); (e.currentTarget.style.background = "rgba(255,255,255,0.03)"); } }}
            >
              {isActive && (
                <div className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full"
                  style={{ background: "linear-gradient(180deg, transparent, #5cbf75, transparent)" }} />
              )}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200"
                  style={{
                    background: isActive ? "rgba(92,191,117,0.1)" : "rgba(255,255,255,0.04)",
                    border: "1px solid " + (isActive ? "rgba(92,191,117,0.2)" : "rgba(255,255,255,0.06)"),
                  }}>
                  <ShapeIcon shape={c.shape} active={isActive} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[0.88rem] font-semibold" style={{ color: isActive ? "#d8e8dc" : "rgba(216,232,220,0.65)" }}>
                      {c.name}
                    </span>
                    <span className="text-[0.78rem] tabular-nums font-medium" style={{ color: isActive ? "#5cbf75" : "rgba(216,232,220,0.3)" }}>
                      ${c.price}
                    </span>
                  </div>
                  <p className="text-[0.72rem] leading-snug" style={{ color: "rgba(190,220,200,0.65)" }}>
                    {c.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        <button
          onClick={onNext}
          disabled={!selected}
          className="w-full h-11 rounded-xl text-[0.75rem] tracking-[0.08em] uppercase font-semibold transition-all duration-200 active:scale-[0.98]"
          style={selected ? {
            background: "linear-gradient(135deg, #5cbf75 0%, #3d9156 100%)",
            color: "#fff",
            boxShadow: "0 4px 20px rgba(92,191,117,0.28)",
          } : {
            background: "rgba(255,255,255,0.04)",
            color: "rgba(216,232,220,0.22)",
            border: "1px solid rgba(255,255,255,0.06)",
            cursor: "not-allowed",
          }}
        >
          {selected ? "Choose Base Material →" : "Select a container first"}
        </button>
      </div>
    </div>
  );
}
