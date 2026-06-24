import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zenith Dashboard",
  description:
    "Real-time celestial observation dashboard. Track satellites, planets, and constellations from any location on Earth.",
};

export default function ZenithLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
