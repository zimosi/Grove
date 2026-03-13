import { DECORATIONS } from "@/data/catalog";
import Link from "next/link";

export default function DecorationsPage() {
  return (
    <main className="pt-20 min-h-screen bg-grove-bg">
      {/* Page header */}
      <div className="border-b border-grove-border bg-grove-panel/80">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <p className="grove-step-label mb-2 tracking-[0.25em]">Retail Shop</p>
          <h1 className="grove-heading text-[2.8rem]">Decorations</h1>
          <p className="grove-body mt-3 max-w-md text-[0.9rem]">
            Driftwood, sculpted rocks, and miniature statues — curated for
            texture, contrast, and natural character inside your terrarium.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex gap-2">
            {["All", "Rocks", "Wood", "Statues"].map((f, i) => (
              <button
                key={f}
                className={[
                  "h-8 px-4 rounded-full border text-[0.75rem] font-medium transition-all",
                  i === 0
                    ? "border-grove-sage/50 bg-grove-sage/8 text-grove-sage"
                    : "border-grove-border bg-white/70 text-grove-muted hover:border-grove-sage/40 hover:text-grove-sage",
                ].join(" ")}
              >
                {f}
              </button>
            ))}
          </div>
          <span className="text-[0.72rem] grove-body">{DECORATIONS.length} items</span>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {DECORATIONS.map((item) => (
            <div
              key={item.id}
              className="group flex flex-col rounded-2xl border border-grove-border bg-white/70 hover:bg-white hover:border-grove-sage/30 hover:shadow-md transition-all duration-200 overflow-hidden"
            >
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
              <div className="p-4 flex flex-col gap-3">
                <h3 className="text-[0.88rem] font-semibold text-grove-text">{item.name}</h3>
                <div className="flex items-center justify-between">
                  <span className="text-[0.92rem] font-semibold text-grove-sage tabular-nums">
                    ${item.price.toFixed(2)}
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
            <p className="grove-step-label mb-1">Visualise before you buy</p>
            <h3 className="grove-heading text-[1.4rem]">Place rocks in the 3D builder</h3>
            <p className="grove-body text-[0.82rem] mt-1.5 max-w-sm">
              Drag, rotate and position every rock inside a virtual terrarium
              before your order is placed.
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
