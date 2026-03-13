// Placeholder order data
const MOCK_ORDERS = [
  {
    id: "GRV-00412",
    date: "2026-02-18",
    status: "Delivered",
    statusColor: "text-emerald-700 bg-emerald-100",
    items: ["Jar Container", "Black Sand", "Fern × 2", "Driftwood"],
    total: 38.46,
  },
  {
    id: "GRV-00389",
    date: "2026-01-29",
    status: "In Production",
    statusColor: "text-amber-700 bg-amber-100",
    items: ["Tank Container", "Peat Mix", "Lavender", "Crown Rock", "Low Poly Rock × 2"],
    total: 61.93,
  },
  {
    id: "GRV-00351",
    date: "2025-12-04",
    status: "Delivered",
    statusColor: "text-emerald-700 bg-emerald-100",
    items: ["Jar Container", "Coco Coir", "Spider Plant", "Pebble Rock × 3"],
    total: 29.95,
  },
];

export default function OrdersPage() {
  return (
    <main className="min-h-screen bg-grove-bg">
      {/* Header */}
      <div className="border-b border-grove-border bg-grove-panel/80">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <p className="grove-step-label mb-2 tracking-[0.25em]">Account</p>
          <h1 className="grove-heading text-[2.8rem]">Your Orders</h1>
          <p className="grove-body mt-3 text-[0.9rem]">
            Track the terrariums you've designed and ordered.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Sign-in notice */}
        <div className="mb-8 p-4 rounded-xl border border-amber-200 bg-amber-50/80 flex items-center gap-3">
          <span className="text-amber-600 text-lg">🔒</span>
          <p className="text-[0.8rem] text-amber-800">
            Sign in to see your real order history. Showing sample data below.
          </p>
          <button className="ml-auto shrink-0 h-8 px-4 rounded-lg bg-amber-600 text-white text-[0.7rem] tracking-[0.06em] uppercase font-semibold hover:bg-amber-700 transition-colors">
            Sign in
          </button>
        </div>

        {/* Order list */}
        <div className="space-y-4">
          {MOCK_ORDERS.map((order) => (
            <div
              key={order.id}
              className="rounded-2xl border border-grove-border bg-white/70 p-6 flex flex-col sm:flex-row sm:items-center gap-5"
            >
              {/* Order info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[0.88rem] font-semibold text-grove-text font-mono">
                    {order.id}
                  </span>
                  <span className={`text-[0.65rem] font-semibold px-2.5 py-0.5 rounded-full ${order.statusColor}`}>
                    {order.status}
                  </span>
                </div>
                <p className="text-[0.72rem] grove-body mb-3">{order.date}</p>
                <div className="flex flex-wrap gap-1.5">
                  {order.items.map((item) => (
                    <span
                      key={item}
                      className="text-[0.68rem] px-2.5 py-1 rounded-lg bg-grove-forest border border-grove-border text-grove-muted"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* Price + action */}
              <div className="flex flex-col items-end gap-3 shrink-0">
                <span className="grove-heading text-[1.4rem]">${order.total.toFixed(2)}</span>
                <button className="h-8 px-4 rounded-lg border border-grove-border text-[0.7rem] font-medium text-grove-muted hover:text-grove-text hover:border-grove-muted/40 transition-all">
                  View details →
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state hint */}
        <p className="text-center grove-body text-[0.78rem] mt-12">
          Ready to create your first terrarium?{" "}
          <a href="/builder" className="text-grove-sage hover:underline font-medium underline-offset-2">
            Open the builder →
          </a>
        </p>
      </div>
    </main>
  );
}
