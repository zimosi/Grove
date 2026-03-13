import Link from "next/link";

const POSTS = [
  { user: "Mia R.",       title: "Desert canyon jar",         likes: 142, comments: 18, tag: "desert",   gradient: "from-amber-100 to-orange-50"  },
  { user: "Theo K.",      title: "Mossy forest tank",          likes: 98,  comments: 11, tag: "forest",   gradient: "from-emerald-100 to-green-50"  },
  { user: "Yuna S.",      title: "Lavender meadow",            likes: 211, comments: 34, tag: "floral",   gradient: "from-purple-100 to-pink-50"    },
  { user: "Carlos W.",    title: "Coastal driftwood scene",    likes: 76,  comments: 9,  tag: "coastal",  gradient: "from-sky-100 to-blue-50"       },
  { user: "Priya N.",     title: "Mountain ridge miniature",   likes: 183, comments: 22, tag: "mountain", gradient: "from-slate-100 to-gray-50"     },
  { user: "Louis G.",     title: "Spider plant paradise",      likes: 64,  comments: 7,  tag: "tropical", gradient: "from-lime-100 to-green-50"     },
  { user: "Aiko T.",      title: "Zen pebble garden",          likes: 129, comments: 15, tag: "minimal",  gradient: "from-stone-100 to-zinc-50"     },
  { user: "Finn M.",      title: "Wild grass steppe",          likes: 55,  comments: 6,  tag: "steppe",   gradient: "from-yellow-100 to-amber-50"   },
  { user: "Serena B.",    title: "Jasmine in glass",           likes: 204, comments: 27, tag: "floral",   gradient: "from-rose-100 to-pink-50"      },
];

const TAG_COLORS: Record<string, string> = {
  desert:   "bg-amber-100 text-amber-700",
  forest:   "bg-emerald-100 text-emerald-700",
  floral:   "bg-pink-100 text-pink-700",
  coastal:  "bg-sky-100 text-sky-700",
  mountain: "bg-slate-100 text-slate-600",
  tropical: "bg-lime-100 text-lime-700",
  minimal:  "bg-zinc-100 text-zinc-600",
  steppe:   "bg-yellow-100 text-yellow-700",
};

const FEATURED = POSTS[2]; // Yuna's lavender

export default function CommunitiesPage() {
  return (
    <main className="pt-14 min-h-screen bg-grove-bg">
      {/* Header */}
      <div className="border-b border-grove-border bg-grove-panel/80">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col sm:flex-row sm:items-end gap-6 justify-between">
          <div>
            <p className="grove-step-label mb-2 tracking-[0.25em]">Community</p>
            <h1 className="grove-heading text-[2.8rem]">Terrarium Gallery</h1>
            <p className="grove-body mt-3 max-w-md text-[0.9rem]">
              Share your creations, discover others' ecosystems, and get inspired
              by the Grove community.
            </p>
          </div>
          <Link
            href="/builder"
            className="shrink-0 h-11 px-7 rounded-xl bg-grove-sage text-white text-[0.78rem] tracking-[0.08em] uppercase font-semibold hover:bg-grove-moss transition-colors shadow-sm"
          >
            + Share a Build
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* Featured post */}
        <section className="mb-12">
          <p className="grove-step-label mb-4 tracking-[0.2em]">Featured this week</p>
          <div className={`rounded-3xl overflow-hidden border border-grove-border bg-gradient-to-br ${FEATURED.gradient} flex flex-col sm:flex-row`}>
            {/* Artwork placeholder */}
            <div className="sm:w-80 h-48 sm:h-auto flex items-center justify-center text-7xl opacity-30">
              🌿
            </div>
            <div className="flex-1 p-8 flex flex-col justify-center gap-4">
              <span className={`self-start text-[0.65rem] font-semibold px-2.5 py-0.5 rounded-full ${TAG_COLORS[FEATURED.tag] ?? "bg-gray-100 text-gray-600"}`}>
                {FEATURED.tag}
              </span>
              <h2 className="grove-heading text-[1.8rem]">{FEATURED.title}</h2>
              <p className="grove-body text-[0.85rem]">by {FEATURED.user}</p>
              <div className="flex gap-5 text-[0.78rem] grove-body">
                <span>♥ {FEATURED.likes} likes</span>
                <span>💬 {FEATURED.comments} comments</span>
              </div>
              <button className="self-start h-9 px-5 rounded-xl border border-grove-border bg-white/80 text-[0.72rem] font-medium text-grove-text hover:bg-white hover:border-grove-sage/30 transition-all">
                View build details →
              </button>
            </div>
          </div>
        </section>

        {/* Filter bar */}
        <div className="flex items-center gap-2 mb-8 flex-wrap">
          {["All", "Forest", "Floral", "Desert", "Coastal", "Tropical"].map((f, i) => (
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
          <div className="flex-1" />
          <span className="text-[0.72rem] grove-body">{POSTS.length} builds</span>
        </div>

        {/* Post grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {POSTS.map((post) => (
            <div
              key={post.title}
              className="group rounded-2xl border border-grove-border bg-white/70 hover:bg-white hover:border-grove-sage/30 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer"
            >
              {/* Artwork */}
              <div className={`h-48 bg-gradient-to-br ${post.gradient} flex items-center justify-center text-5xl opacity-30 group-hover:opacity-50 transition-opacity`}>
                🌿
              </div>
              {/* Meta */}
              <div className="p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[0.9rem] font-semibold text-grove-text leading-tight">{post.title}</h3>
                  <span className={`shrink-0 text-[0.6rem] font-semibold px-2 py-0.5 rounded-full ${TAG_COLORS[post.tag] ?? "bg-gray-100 text-gray-600"}`}>
                    {post.tag}
                  </span>
                </div>
                <p className="text-[0.75rem] grove-body">by {post.user}</p>
                <div className="flex items-center gap-4 text-[0.72rem] grove-body pt-1 border-t border-grove-border">
                  <span>♥ {post.likes}</span>
                  <span>💬 {post.comments}</span>
                  <button className="ml-auto text-grove-sage font-medium hover:underline underline-offset-2 text-[0.7rem]">
                    View →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Share CTA */}
        <div className="mt-16 p-8 rounded-2xl border border-grove-border bg-white/60 text-center">
          <p className="grove-step-label mb-2">Show off your work</p>
          <h3 className="grove-heading text-[1.6rem] mb-3">Share your terrarium with the world</h3>
          <p className="grove-body text-[0.85rem] max-w-sm mx-auto mb-6">
            Design in the builder, then share directly to the gallery. Collect likes, answer questions, inspire others.
          </p>
          <Link
            href="/builder"
            className="inline-flex h-11 px-8 rounded-xl bg-grove-sage text-white text-[0.78rem] tracking-[0.08em] uppercase font-semibold hover:bg-grove-moss transition-colors shadow-sm items-center"
          >
            Build &amp; Share
          </Link>
        </div>
      </div>
    </main>
  );
}
