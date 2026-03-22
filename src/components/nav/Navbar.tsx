"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import AuthModal from "@/components/auth/AuthModal";

const NAV_LINKS = [
  { href: "/builder",     label: "3D Terrarium Builder"     },
  { href: "/plants",      label: "Plants"      },
  { href: "/decorations", label: "Decorations" },
  { href: "/orders",      label: "Orders"      },
  { href: "/collections", label: "Collections" },
  { href: "/communities", label: "Communities" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      <header
        className="fixed top-0 inset-x-0 z-50"
        style={{
          background: "rgba(22,32,26,0.97)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <nav className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-6">
          {/* Logo */}
          <Link
            href="/"
            className="text-[1.2rem] font-light tracking-[-0.04em] shrink-0 transition-opacity duration-150 hover:opacity-70"
            style={{ fontFamily: "var(--font-display)", color: "#e8f4ec" }}
          >
            Grove
          </Link>

          {/* Links */}
          <ul className="flex items-center gap-4 flex-1">
            {NAV_LINKS.map(({ href, label }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className="relative px-4 py-2 rounded-lg text-[0.875rem] font-medium transition-all duration-150"
                    style={{ color: active ? "#5cbf75" : "rgba(216,232,220,0.7)" }}
                    onMouseEnter={e => { if (!active) (e.currentTarget.style.color = "#d8e8dc"); }}
                    onMouseLeave={e => { if (!active) (e.currentTarget.style.color = "rgba(216,232,220,0.7)"); }}
                  >
                    {label}
                    {active && (
                      <span
                        className="absolute bottom-0 left-3 right-3 h-px rounded-full"
                        style={{ background: "linear-gradient(90deg, transparent, #5cbf75, transparent)" }}
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Auth */}
          <div className="shrink-0">
            {loading ? (
              <div className="h-8 w-20 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.08)" }} />
            ) : user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 h-8 px-2.5 rounded-lg transition-all duration-150"
                  style={{
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: menuOpen ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.07)",
                  }}
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[0.6rem] font-bold shrink-0"
                    style={{ background: "rgba(92,191,117,0.25)", color: "#5cbf75" }}
                  >
                    {(user.email ?? "?")[0].toUpperCase()}
                  </span>
                  <span className="text-[0.73rem] font-medium max-w-[100px] truncate" style={{ color: "#d8e8dc" }}>
                    {user.email}
                  </span>
                  <svg
                    width="9" height="5" viewBox="0 0 10 6" fill="none"
                    className={`transition-transform duration-200 shrink-0 ${menuOpen ? "rotate-180" : ""}`}
                    style={{ color: "rgba(216,232,220,0.6)" }}
                  >
                    <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {menuOpen && (
                  <div
                    className="absolute right-0 top-10 w-44 rounded-xl overflow-hidden animate-fadeIn"
                    style={{
                      background: "#141c16",
                      border: "1px solid rgba(255,255,255,0.1)",
                      boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.04)",
                    }}
                  >
                    <Link
                      href="/designs"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-[0.77rem] transition-all duration-100"
                      style={{ color: "rgba(216,232,220,0.75)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                        <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                        <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                        <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                        <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                      </svg>
                      My Designs
                    </Link>
                    <div className="h-px mx-3" style={{ background: "rgba(255,255,255,0.06)" }} />
                    <button
                      onClick={async () => { setMenuOpen(false); await signOut(); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[0.77rem] transition-all duration-100"
                      style={{ color: "rgba(216,232,220,0.4)" }}
                      onMouseEnter={e => { (e.currentTarget.style.background = "rgba(255,255,255,0.04)"); (e.currentTarget.style.color = "rgba(216,232,220,0.75)"); }}
                      onMouseLeave={e => { (e.currentTarget.style.background = "transparent"); (e.currentTarget.style.color = "rgba(216,232,220,0.4)"); }}
                    >
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
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
                className="h-8 px-4 rounded-lg text-[0.74rem] font-medium transition-all duration-150"
                style={{
                  border: "1px solid rgba(255,255,255,0.18)",
                  color: "rgba(216,232,220,0.85)",
                  background: "rgba(255,255,255,0.07)",
                }}
                onMouseEnter={e => { (e.currentTarget.style.background = "rgba(255,255,255,0.12)"); (e.currentTarget.style.color = "#e8f4ec"); (e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"); }}
                onMouseLeave={e => { (e.currentTarget.style.background = "rgba(255,255,255,0.07)"); (e.currentTarget.style.color = "rgba(216,232,220,0.85)"); (e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"); }}
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
