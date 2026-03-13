import { PLANTS, DECORATIONS } from "@/data/catalog";

// Achievement definitions
const ACHIEVEMENTS = [
  { id: "first-build",   icon: "🌱", title: "First Build",      desc: "Complete your first terrarium",         earned: true  },
  { id: "rock-collector",icon: "🪨", title: "Rock Collector",   desc: "Place 10 decorations across builds",    earned: true  },
  { id: "botanist",      icon: "🌿", title: "Botanist",         desc: "Use 5 different plant species",         earned: false },
  { id: "sculptor",      icon: "⛰",  title: "Landscape Artist", desc: "Sculpt terrain in 3 builds",            earned: false },
  { id: "foam-master",   icon: "🫧", title: "Foam Master",      desc: "Create a foam structure taller than 0.3m", earned: false },
  { id: "community",     icon: "❤️", title: "Community Star",   desc: "Receive 50 likes on a shared build",    earned: false },
];

// Unlocked species (subset of catalog)
const UNLOCKED = PLANTS.slice(0, 3).concat(DECORATIONS.slice(0, 2));

export default function CollectionsPage() {
  const earnedCount = ACHIEVEMENTS.filter((a) => a.earned).length;

  return (
    <main className="min-h-screen bg-grove-bg">
      {/* Header */}
      <div className="border-b border-grove-border bg-grove-panel/80">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <p className="grove-step-label mb-2 tracking-[0.25em]">Rewards</p>
          <h1 className="grove-heading text-[2.8rem]">Collections</h1>
          <p className="grove-body mt-3 max-w-md text-[0.9rem]">
            Track your achievements, unlock rare species, and build your
            collector's shelf — one terrarium at a time.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-14">

        {/* Progress bar */}
        <div className="p-6 rounded-2xl border border-grove-border bg-white/70">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="grove-step-label mb-1">Achievement progress</p>
              <p className="grove-heading text-[1.6rem]">{earnedCount} / {ACHIEVEMENTS.length} earned</p>
            </div>
            <span className="text-[0.72rem] grove-body">Level 2 — Seedling</span>
          </div>
          <div className="h-2 rounded-full bg-grove-forest overflow-hidden">
            <div
              className="h-full rounded-full bg-grove-sage transition-all duration-700"
              style={{ width: `${(earnedCount / ACHIEVEMENTS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Achievements grid */}
        <section>
          <p className="grove-step-label mb-5 tracking-[0.2em]">Achievements</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ACHIEVEMENTS.map((a) => (
              <div
                key={a.id}
                className={[
                  "flex gap-4 p-5 rounded-2xl border transition-all",
                  a.earned
                    ? "border-grove-sage/30 bg-grove-sage/5"
                    : "border-grove-border bg-white/40 opacity-60",
                ].join(" ")}
              >
                <span className="text-2xl shrink-0">{a.icon}</span>
                <div>
                  <p className="text-[0.85rem] font-semibold text-grove-text">{a.title}</p>
                  <p className="text-[0.73rem] grove-body mt-0.5">{a.desc}</p>
                  {a.earned && (
                    <span className="inline-block mt-2 text-[0.6rem] font-semibold text-grove-sage tracking-[0.08em] uppercase">
                      ✓ Earned
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Unlocked species */}
        <section>
          <p className="grove-step-label mb-5 tracking-[0.2em]">Your species shelf</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {UNLOCKED.map((item) => (
              <div
                key={item.id}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-grove-border bg-white/70"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: item.color + "18" }}
                >
                  {item.iconUrl ? (
                    <img src={item.iconUrl} alt={item.name} className="w-9 h-9 object-contain" />
                  ) : (
                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: item.color }} />
                  )}
                </div>
                <span className="text-[0.68rem] font-medium text-grove-text text-center leading-tight">{item.name}</span>
              </div>
            ))}
            {/* Locked slots */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={`locked-${i}`}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-dashed border-grove-border bg-grove-forest/30 opacity-50"
              >
                <div className="w-12 h-12 rounded-xl bg-grove-border flex items-center justify-center text-grove-muted text-lg">
                  🔒
                </div>
                <span className="text-[0.65rem] grove-body text-center">Locked</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
