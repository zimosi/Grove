"use client";
import { CONTAINERS } from "@/data/catalog";
import type { ContainerShape } from "@/types";

interface StepContainerProps {
  selected: ContainerShape | null;
  onSelect: (shape: ContainerShape) => void;
  onNext: () => void;
}

// SVG silhouettes for each container shape
const ShapeIcon = ({ shape, active }: { shape: ContainerShape; active: boolean }) => {
  const color = active ? "#4a7c59" : "rgba(107, 115, 110, 0.4)";
  if (shape === "jar")
    return (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <path d="M11 10 L10 30 Q10 31 11 31 L25 31 Q26 31 26 30 L25 10Z" stroke={color} strokeWidth="1.5" fill="none" />
        <path d="M10 10 Q18 8 26 10" stroke={color} strokeWidth="1.5" fill="none" />
      </svg>
    );
  // tank — open-top rectangle with perspective depth hint
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      {/* Front face: open-top rectangle */}
      <path d="M5 10 L5 28 L31 28 L31 10" stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round" />
      {/* Depth lines (top corners back) */}
      <line x1="5" y1="10" x2="9" y2="7" stroke={color} strokeWidth="1" strokeOpacity="0.6" />
      <line x1="31" y1="10" x2="35" y2="7" stroke={color} strokeWidth="1" strokeOpacity="0.6" />
      {/* Back top edge */}
      <line x1="9" y1="7" x2="35" y2="7" stroke={color} strokeWidth="1" strokeOpacity="0.6" />
    </svg>
  );
};

export default function StepContainer({ selected, onSelect, onNext }: StepContainerProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Step header */}
      <div className="mb-8">
        <p className="grove-step-label mb-3">Step 1 — Container</p>
        <h2 className="grove-heading text-[1.9rem] mb-3" style={{ fontFamily: "var(--font-display)" }}>
          Choose your<br />vessel
        </h2>
        <p className="grove-body text-[0.85rem]">
          Each container creates a different microworld. The glass is hand-blown with real optical clarity.
        </p>
      </div>

      {/* Container cards */}
      <div className="flex flex-col gap-3 flex-1">
        {CONTAINERS.map((c) => {
          const isActive = selected === c.shape;
          return (
            <button
              key={c.shape}
              onClick={() => onSelect(c.shape)}
              className={[
                "group w-full text-left rounded-2xl border transition-all duration-300 overflow-hidden",
                "relative",
                isActive
                  ? "border-grove-sage/50 bg-grove-sage/10 shadow-[0_0_0_1px_rgba(74,124,89,0.2)]"
                  : "border-grove-border bg-white/60 hover:border-grove-muted/30 hover:bg-white/80",
              ].join(" ")}
            >
              {/* Selected indicator bar */}
              {isActive && (
                <div className="absolute left-0 top-4 bottom-4 w-[3px] bg-grove-sage rounded-full" />
              )}

              <div className="flex items-center gap-4 px-5 py-4">
                {/* Icon */}
                <div
                  className={[
                    "w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-all",
                    isActive ? "bg-grove-sage/15" : "bg-grove-bg/80 group-hover:bg-grove-sage/10",
                  ].join(" ")}
                >
                  <ShapeIcon shape={c.shape} active={isActive} />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={[
                        "text-[0.95rem] font-semibold transition-colors",
                        isActive ? "text-grove-text" : "text-grove-text/80 group-hover:text-grove-text",
                      ].join(" ")}
                    >
                      {c.name}
                    </span>
                    <span
                      className={[
                        "text-[0.82rem] tabular-nums font-medium transition-colors",
                        isActive ? "text-grove-sage" : "text-grove-muted",
                      ].join(" ")}
                    >
                      ${c.price}
                    </span>
                  </div>
                  <p className="text-[0.75rem] grove-body leading-snug">
                    {c.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* CTA */}
      <div className="mt-6">
        <button
          onClick={onNext}
          disabled={!selected}
          className={[
            "w-full h-13 rounded-2xl text-[0.8rem] tracking-[0.1em] uppercase font-semibold",
            "transition-all duration-300",
            selected
              ? "bg-grove-sage text-white hover:bg-grove-moss shadow-md active:scale-[0.98]"
              : "bg-grove-bg text-grove-muted/60 cursor-not-allowed border border-grove-border",
          ].join(" ")}
        >
          {selected ? "Choose Base Material →" : "Select a container first"}
        </button>
      </div>
    </div>
  );
}
