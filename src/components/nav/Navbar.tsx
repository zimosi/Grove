"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/builder",      label: "Terrarium Builder" },
  { href: "/plants",       label: "Plants" },
  { href: "/decorations",  label: "Decorations" },
  { href: "/orders",       label: "Orders" },
  { href: "/collections",  label: "Collections" },
  { href: "/communities",  label: "Communities" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-grove-border bg-grove-panel/80 backdrop-blur-md">
      <nav className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-8">
        {/* Logo */}
        <Link
          href="/"
          className="text-[1.25rem] font-light tracking-[-0.04em] text-grove-text shrink-0"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Grove
        </Link>

        {/* Links */}
        <ul className="flex items-center justify-evenly flex-1">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={[
                    "relative px-5 py-1.5 rounded-lg text-[0.82rem] tracking-[0.02em] font-semibold transition-colors",
                    active
                      ? "text-grove-sage bg-grove-sage/8"
                      : "text-grove-text/70 hover:text-grove-text hover:bg-grove-forest/60",
                  ].join(" ")}
                >
                  {label}
                  {active && (
                    <span className="absolute bottom-0 left-3 right-3 h-[1.5px] bg-grove-sage rounded-full" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Auth placeholder */}
        <button className="shrink-0 h-8 px-4 rounded-lg border border-grove-border text-[0.75rem] font-medium text-grove-muted hover:text-grove-text hover:border-grove-muted/40 transition-all">
          Sign in
        </button>
      </nav>
    </header>
  );
}
