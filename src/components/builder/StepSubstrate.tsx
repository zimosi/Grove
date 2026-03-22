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
  price: number;
}[] = [
  {
    type: "sand",
    name: "Desert Sand",
    tagline: "Warm & arid",
    description: "Golden quartz sand — perfect for succulents, cacti, and minimalist desert scapes.",
    swatch: "linear-gradient(135deg, #c8924a 0%, #e8b870 50%, #b07840 100%)",
    price: 3.99,
  },
  {
    type: "soil",
    name: "Rich Soil",
    tagline: "Dark & lush",
    description: "Nutrient-dense tropical soil — ideal for ferns, moss, and dense green environments.",
    swatch: "linear-gradient(135deg, #2e1608 0%, #4a2810 50%, #241004 100%)",
    price: 3.99,
  },
];

export default function StepSubstrate({ selected, onSelect, onNext, onBack }: StepSubstrateProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="mb-8">
        <p className="grove-step-label mb-3">Step 2 — Base Material</p>
        <h2 className="grove-heading text-[1.85rem] mb-3" style={{ fontFamily: "var(--font-display)" }}>
          Choose your<br />foundation
        </h2>
        <p className="grove-body text-[0.82rem]">
          The substrate defines the mood of your world. Choose the base that fits your vision.
        </p>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        {OPTIONS.map((opt) => {
          const isActive = selected === opt.type;
          return (
            <button
              key={opt.type}
              onClick={() => onSelect(opt.type)}
              className="group w-full text-left rounded-2xl overflow-hidden relative transition-all duration-200"
              style={{
                border: isActive ? "1px solid rgba(92,191,117,0.35)" : "1px solid rgba(255,255,255,0.07)",
                boxShadow: isActive ? "0 0 0 1px rgba(92,191,117,0.12), 0 0 28px rgba(92,191,117,0.05)" : "none",
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget.style.borderColor = "rgba(255,255,255,0.13)"); }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"); }}
            >
              {/* Texture swatch */}
              <div className="h-[4.5rem] w-full relative" style={{ background: opt.swatch }}>
                <div className="absolute inset-0"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
                    backgroundSize: "120px",
                    opacity: 0.25,
                    mixBlendMode: "overlay",
                  }}
                />
                {/* Dark fade at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-6"
                  style={{ background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.5))" }} />
                {isActive && (
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center shadow-lg"
                    style={{ background: "#5cbf75" }}>
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>

              {/* Content */}
              <div
                className="px-4 py-3.5 transition-colors duration-150"
                style={{ background: isActive ? "rgba(92,191,117,0.07)" : "rgba(255,255,255,0.03)" }}
              >
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <div className="text-[0.88rem] font-semibold mb-0.5" style={{ color: isActive ? "#d8e8dc" : "rgba(216,232,220,0.7)" }}>
                      {opt.name}
                    </div>
                    <div className="text-[0.6rem] tracking-[0.14em] uppercase font-semibold" style={{ color: isActive ? "rgba(92,191,117,0.7)" : "rgba(190,220,200,0.35)" }}>
                      {opt.tagline}
                    </div>
                  </div>
                  <span className="text-[0.78rem] font-medium tabular-nums mt-0.5" style={{ color: isActive ? "#5cbf75" : "rgba(216,232,220,0.3)" }}>
                    +${opt.price}
                  </span>
                </div>
                <p className="text-[0.72rem] leading-snug mt-1" style={{ color: "rgba(190,220,200,0.65)" }}>
                  {opt.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex gap-2.5">
        <button
          onClick={onBack}
          className="h-11 px-5 rounded-xl text-[0.73rem] tracking-[0.06em] uppercase font-medium transition-all duration-150 active:scale-[0.97]"
          style={{
            border: "1px solid rgba(255,255,255,0.09)",
            color: "rgba(216,232,220,0.4)",
            background: "rgba(255,255,255,0.03)",
          }}
          onMouseEnter={e => { (e.currentTarget.style.borderColor = "rgba(255,255,255,0.16)"); (e.currentTarget.style.color = "rgba(216,232,220,0.7)"); }}
          onMouseLeave={e => { (e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"); (e.currentTarget.style.color = "rgba(216,232,220,0.4)"); }}
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={!selected}
          className="flex-1 h-11 rounded-xl text-[0.75rem] tracking-[0.08em] uppercase font-semibold transition-all duration-200 active:scale-[0.98]"
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
          {selected ? "Add Plants →" : "Select a base first"}
        </button>
      </div>
    </div>
  );
}
