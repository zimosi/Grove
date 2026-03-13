"use client";
import type { SubstrateType } from "@/types";

interface StepSubstrateProps {
  selected: SubstrateType | null;
  onSelect: (s: SubstrateType) => void;
  onNext: () => void;
  onBack: () => void;
}

const OPTIONS: {
  type: SubstrateType;
  name: string;
  tagline: string;
  description: string;
  swatch: string;
  swatchAlt: string;
  price: number;
}[] = [
  {
    type: "sand",
    name: "Desert Sand",
    tagline: "Warm & arid",
    description: "Golden quartz sand — perfect for succulents, cacti, and minimalist desert scapes.",
    swatch: "linear-gradient(135deg, #d4a96a 0%, #e8c88a 50%, #c89050 100%)",
    swatchAlt: "#c8965a",
    price: 3.99,
  },
  {
    type: "soil",
    name: "Rich Soil",
    tagline: "Dark & lush",
    description: "Nutrient-dense tropical soil — ideal for ferns, moss, and dense green environments.",
    swatch: "linear-gradient(135deg, #3a2010 0%, #5a3820 50%, #2e180c 100%)",
    swatchAlt: "#4a3020",
    price: 3.99,
  },
];

export default function StepSubstrate({ selected, onSelect, onNext, onBack }: StepSubstrateProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-8">
        <p className="grove-step-label mb-3">Step 2 — Base Material</p>
        <h2 className="grove-heading text-[1.9rem] mb-3" style={{ fontFamily: "var(--font-display)" }}>
          Choose your<br />foundation
        </h2>
        <p className="grove-body text-[0.85rem]">
          The substrate defines the mood of your world. Choose the base that fits your vision.
        </p>
      </div>

      {/* Substrate cards */}
      <div className="flex flex-col gap-4 flex-1">
        {OPTIONS.map((opt) => {
          const isActive = selected === opt.type;
          return (
            <button
              key={opt.type}
              onClick={() => onSelect(opt.type)}
              className={[
                "group w-full text-left rounded-2xl border transition-all duration-300 overflow-hidden relative",
                isActive
                  ? "border-grove-sage/50 shadow-[0_0_0_1px_rgba(74,124,89,0.2)]"
                  : "border-grove-border hover:border-grove-muted/30",
              ].join(" ")}
            >
              {/* Large texture swatch at top */}
              <div
                className="h-20 w-full relative"
                style={{ background: opt.swatch }}
              >
                {/* Subtle noise overlay */}
                <div className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
                    backgroundSize: "120px",
                  }}
                />
                {/* Selection checkmark */}
                {isActive && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-grove-sage flex items-center justify-center shadow-md">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Content */}
              <div
                className={[
                  "px-5 py-4 transition-colors",
                  isActive ? "bg-grove-sage/10" : "bg-white/60 group-hover:bg-white/80",
                ].join(" ")}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div>
                    <div
                      className={[
                        "text-[0.95rem] font-semibold transition-colors",
                        isActive ? "text-grove-text" : "text-grove-text/80",
                      ].join(" ")}
                    >
                      {opt.name}
                    </div>
                    <div className="text-[0.65rem] tracking-[0.12em] uppercase text-grove-muted mt-0.5 font-medium">
                      {opt.tagline}
                    </div>
                  </div>
                  <span className="text-[0.82rem] text-grove-sage font-medium tabular-nums mt-0.5">
                    +${opt.price}
                  </span>
                </div>
                <p className="text-[0.75rem] grove-body leading-snug">
                  {opt.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* CTAs */}
      <div className="mt-6 flex gap-2.5">
        <button
          onClick={onBack}
          className="h-13 px-5 rounded-2xl border border-grove-border text-[0.75rem] tracking-[0.1em] uppercase font-medium text-grove-muted hover:border-grove-muted/40 hover:text-grove-text transition-all active:scale-[0.97]"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={!selected}
          className={[
            "flex-1 h-13 rounded-2xl text-[0.8rem] tracking-[0.1em] uppercase font-semibold",
            "transition-all duration-300",
            selected
              ? "bg-grove-sage text-white hover:bg-grove-moss shadow-md active:scale-[0.98]"
              : "bg-grove-bg text-grove-muted/60 cursor-not-allowed border border-grove-border",
          ].join(" ")}
        >
          {selected ? "Add Plants →" : "Select a base first"}
        </button>
      </div>
    </div>
  );
}
