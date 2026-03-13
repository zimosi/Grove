import Link from "next/link";

// ── Community posts (placeholder data) ───────────────────────────────────────
const COMMUNITY_POSTS = [
  { user: "Mia R.",       title: "Desert canyon jar",       likes: 142, tag: "desert"   },
  { user: "Theo K.",      title: "Mossy forest tank",        likes: 98,  tag: "forest"   },
  { user: "Yuna S.",      title: "Lavender meadow",          likes: 211, tag: "floral"   },
  { user: "Carlos W.",    title: "Coastal driftwood scene",  likes: 76,  tag: "coastal"  },
  { user: "Priya N.",     title: "Mountain ridge miniature", likes: 183, tag: "mountain" },
  { user: "Louis G.",     title: "Spider plant paradise",    likes: 64,  tag: "tropical" },
];

const TAG_COLORS: Record<string, string> = {
  desert:   "bg-amber-100 text-amber-700",
  forest:   "bg-emerald-100 text-emerald-700",
  floral:   "bg-pink-100 text-pink-700",
  coastal:  "bg-sky-100 text-sky-700",
  mountain: "bg-slate-100 text-slate-600",
  tropical: "bg-lime-100 text-lime-700",
};

export default function HomePage() {
  return (
    <main className="pt-14">

      {/* ── Hero ── */}
      <section className="relative min-h-[92vh] flex flex-col items-center justify-center text-center overflow-hidden px-6">
        {/* Ambient background blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[12%] left-[8%]  w-80 h-80 rounded-full bg-grove-sage/10 blur-[80px]" />
          <div className="absolute bottom-[15%] right-[6%] w-96 h-96 rounded-full bg-emerald-200/20 blur-[100px]" />
          <div className="absolute top-[40%] left-[55%] w-56 h-56 rounded-full bg-amber-100/30 blur-[60px]" />
        </div>

        {/* Floating botanical marks */}
        <div className="absolute top-24 left-[12%] text-5xl opacity-10 select-none rotate-[-15deg]">🌿</div>
        <div className="absolute bottom-32 right-[10%] text-6xl opacity-10 select-none rotate-[10deg]">🪴</div>
        <div className="absolute top-[55%] left-[4%] text-3xl opacity-10 select-none rotate-[5deg]">🌱</div>

        {/* Eye-line label */}
        <p className="grove-step-label mb-6 tracking-[0.3em]">Living Terrarium Studio</p>

        {/* Main headline */}
        <h1 className="grove-heading text-[clamp(3rem,8vw,6.5rem)] leading-[1.05] max-w-3xl mb-8">
          Build miniature
          <br />
          worlds that breathe.
        </h1>

        {/* Sub-headline */}
        <p className="text-[1.05rem] grove-body max-w-lg mb-12 leading-relaxed">
          Design handcrafted glass terrariums in 3D — sculpt the terrain, paint
          foam rockwork, plant rare species, and order a bespoke ecosystem made
          just for you.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/builder"
            className="h-13 px-8 rounded-2xl bg-grove-sage text-white text-[0.82rem] tracking-[0.1em] uppercase font-semibold hover:bg-grove-moss shadow-md active:scale-[0.98] transition-all duration-200"
          >
            Start Building — Free
          </Link>
          <Link
            href="/plants"
            className="h-13 px-8 rounded-2xl border border-grove-border bg-white/80 text-grove-text text-[0.82rem] tracking-[0.08em] uppercase font-medium hover:border-grove-sage/40 hover:bg-white transition-all duration-200"
          >
            Shop Plants
          </Link>
        </div>

        {/* Scroll nudge */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30">
          <div className="w-px h-12 bg-grove-text" />
          <span className="text-[0.6rem] tracking-[0.2em] uppercase text-grove-muted">Scroll</span>
        </div>
      </section>

      {/* ── Community teaser ── */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="grove-step-label mb-2 tracking-[0.2em]">Shared by the community</p>
            <h2 className="grove-heading text-[2rem]">Terrarium Gallery</h2>
          </div>
          <Link
            href="/communities"
            className="text-[0.78rem] font-semibold text-grove-sage hover:underline underline-offset-2"
          >
            Join community →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {COMMUNITY_POSTS.map((post) => (
            <Link
              key={post.title}
              href="/communities"
              className="group flex flex-col rounded-2xl border border-grove-border bg-white/60 hover:bg-white hover:border-grove-sage/30 hover:shadow-md transition-all duration-200 overflow-hidden"
            >
              <div className="h-28 bg-gradient-to-br from-grove-sage/10 to-emerald-50 flex items-center justify-center text-3xl opacity-50 group-hover:opacity-70 transition-opacity">
                🌿
              </div>
              <div className="p-3 flex flex-col gap-1.5">
                <span className={`self-start text-[0.58rem] font-semibold px-2 py-0.5 rounded-full ${TAG_COLORS[post.tag] ?? "bg-gray-100 text-gray-600"}`}>
                  {post.tag}
                </span>
                <p className="text-[0.75rem] font-semibold text-grove-text leading-tight">{post.title}</p>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[0.65rem] grove-body">{post.user}</span>
                  <span className="text-[0.65rem] grove-body">♥ {post.likes}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-grove-border bg-grove-panel">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-[1.1rem] font-light text-grove-text tracking-[-0.03em]" style={{ fontFamily: "var(--font-display)" }}>
            Grove
          </span>
          <p className="text-[0.72rem] grove-body text-center">
            Handcrafted terrariums, shipped to your door. © 2026 Grove Studio.
          </p>
          <div className="flex gap-5">
            {["Privacy", "Terms", "Contact"].map((l) => (
              <span key={l} className="text-[0.72rem] grove-body hover:text-grove-text cursor-pointer transition-colors">
                {l}
              </span>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
