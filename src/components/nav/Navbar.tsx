"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import AuthModal from "@/components/auth/AuthModal";

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
  const { user, loading, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
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

          {/* Auth */}
          <div className="shrink-0">
            {loading ? (
              <div className="h-8 w-20 rounded-lg bg-grove-border/50 animate-pulse" />
            ) : user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 h-8 px-3 rounded-lg border border-grove-border hover:border-grove-muted/40 hover:bg-grove-forest/40 transition-all"
                >
                  <span className="w-5 h-5 rounded-full bg-grove-sage/20 flex items-center justify-center text-[0.65rem] font-semibold text-grove-sage">
                    {(user.email ?? "?")[0].toUpperCase()}
                  </span>
                  <span className="text-[0.75rem] font-medium text-grove-text max-w-[120px] truncate">
                    {user.email}
                  </span>
                  <svg
                    width="10"
                    height="6"
                    viewBox="0 0 10 6"
                    fill="none"
                    className={`transition-transform text-grove-muted ${menuOpen ? "rotate-180" : ""}`}
                  >
                    <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-10 w-48 bg-grove-panel rounded-xl border border-grove-border shadow-xl overflow-hidden">
                    <Link
                      href="/designs"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-[0.8rem] text-grove-text hover:bg-grove-forest/60 transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                        <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                        <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                        <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                      </svg>
                      My Designs
                    </Link>
                    <div className="h-px bg-grove-border mx-3" />
                    <button
                      onClick={async () => { setMenuOpen(false); await signOut(); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[0.8rem] text-grove-muted hover:text-grove-text hover:bg-grove-forest/60 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M5 12H2a1 1 0 01-1-1V3a1 1 0 011-1h3M9 10l3-3-3-3M12 7H5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="shrink-0 h-8 px-4 rounded-lg border border-grove-border text-[0.75rem] font-medium text-grove-muted hover:text-grove-text hover:border-grove-muted/40 transition-all"
              >
                Sign in
              </button>
            )}
          </div>
        </nav>
      </header>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
