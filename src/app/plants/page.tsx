import { PLANTS } from "@/data/catalog";
import Link from "next/link";

const CATEGORIES = [
  { id: "all",     label: "All Plants" },
  { id: "fern",    label: "Ferns" },
  { id: "grass",   label: "Grasses" },
  { id: "flower",  label: "Flowering" },
];

export default function PlantsPage() {
  return (
    <main className="pt-14 min-h-screen bg-grove-bg">
      {/* Page header */}
      <div className="border-b border-grove-border bg-grove-panel/80">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <p className="grove-step-label mb-2 tracking-[0.25em]">Retail Shop</p>
          <h1 className="grove-heading text-[2.8rem]">Plants</h1>
          <p className="grove-body mt-3 max-w-md text-[0.9rem]">
            Hand-selected species for closed and open terrarium ecosystems.
            Each plant is grown to order and ships with care instructions.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Filter bar */}
        <div className="flex items-center gap-2 mb-8 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              className="h-8 px-4 rounded-full border border-grove-border bg-white/70 text-[0.75rem] font-medium text-grove-muted hover:border-grove-sage/40 hover:text-grove-sage transition-all first:border-grove-sage/50 first:bg-grove-sage/8 first:text-grove-sage"
            >
              {c.label}
            </button>
          ))}
          <div className="flex-1" />
          <span className="text-[0.72rem] grove-body">{PLANTS.length} species</span>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {PLANTS.map((item) => (
            <div
              key={item.id}
              className="group flex flex-col rounded-2xl border border-grove-border bg-white/70 hover:bg-white hover:border-grove-sage/30 hover:shadow-md transition-all duration-200 overflow-hidden"
            >
              {/* Image area */}
              <div
                className="h-44 flex items-center justify-center"
                style={{ backgroundColor: item.color + "14" }}
              >
                {item.iconUrl ? (
                  <img src={item.iconUrl} alt={item.name} className="w-20 h-20 object-contain" draggable={false} />
                ) : (
                  <div className="w-12 h-12 rounded-full" style={{ backgroundColor: item.color }} />
                )}
              </div>

              {/* Info */}
              <div className="p-4 flex flex-col gap-3">
                <div>
                  <h3 className="text-[0.88rem] font-semibold text-grove-text">{item.name}</h3>
                  {item.clusterCount && (
                    <p className="text-[0.68rem] grove-body mt-0.5">Cluster of {item.clusterCount}</p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[0.92rem] font-semibold text-grove-sage tabular-nums">
                    {item.price === 0 ? "Free" : `$${item.price.toFixed(2)}`}
                  </span>
                  <button className="h-7 px-3 rounded-lg bg-grove-sage text-white text-[0.65rem] tracking-[0.08em] uppercase font-semibold hover:bg-grove-moss transition-colors">
                    Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Builder upsell */}
        <div className="mt-16 p-8 rounded-2xl border border-grove-border bg-white/60 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <p className="grove-step-label mb-1">Can&apos;t decide?</p>
            <h3 className="grove-heading text-[1.4rem]">Try them in the 3D builder first</h3>
            <p className="grove-body text-[0.82rem] mt-1.5 max-w-sm">
              Place any plant inside a virtual terrarium before you buy — see how it looks with your chosen substrate and decorations.
            </p>
          </div>
          <Link
            href="/builder"
            className="shrink-0 h-11 px-7 rounded-xl bg-grove-sage text-white text-[0.78rem] tracking-[0.08em] uppercase font-semibold hover:bg-grove-moss transition-colors shadow-sm"
          >
            Open Builder
          </Link>
        </div>
      </div>
    </main>
  );
}
