"use client";
import dynamic from "next/dynamic";

const BuilderWizard = dynamic(
  () => import("@/components/builder/BuilderWizard"),
  { ssr: false }
);

export default function BuilderPage() {
  return <BuilderWizard />;
}
