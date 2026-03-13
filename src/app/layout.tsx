import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grove — Terrarium Builder",
  description:
    "Design your own miniature ecosystem. Choose a glass vessel, layer your substrate, and place plants and decorations in an immersive 3D experience.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
