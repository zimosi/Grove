import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/nav/Navbar";

export const metadata: Metadata = {
  title: "Grove — Living Terrarium Studio",
  description:
    "Design handcrafted terrariums, shop rare plants and decorations, and discover a community of miniature ecosystem builders.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <div style={{ paddingTop: "3.5rem" }}>{children}</div>
      </body>
    </html>
  );
}
