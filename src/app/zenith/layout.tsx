import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Zenith Dashboard",
  description:
    "Real-time celestial observation dashboard. Track satellites, planets, and constellations from any location on Earth.",
  // Allow installation as a PWA / home-screen app
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Zenith",
  },
};

export const viewport: Viewport = {
  // Ensure correct scaling and prevents double-tap zoom that misaligns the
  // Cesium WebGL canvas touch-coordinate system on mobile
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  // Match the dashboard background — avoids white flash on Android
  themeColor: "#0D0E10",
};

export default function ZenithLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
