"use client";

import { useCallback } from "react";
import { Home, Compass, RefreshCw, MapPin, Sun, Cloud } from "lucide-react";
import { useCesiumViewer } from "@/hooks/use-cesium-viewer";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useRefreshData } from "@/hooks/use-refresh-data";
import { useGlobeStore } from "@/stores/globe-store";
import { cn } from "@/lib/utils";

interface ControlButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  loading?: boolean;
  className?: string;
}

function ControlButton({
  icon,
  label,
  onClick,
  active,
  loading,
  className,
}: ControlButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-xl",
        "bg-[rgba(255,255,255,0.03)] backdrop-blur-md",
        "border border-[rgba(255,255,255,0.06)]",
        "text-[#FAFAF8] transition-all duration-200",
        "hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.08)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(244,165,36,0.4)]",
        "active:scale-95",
        // Compact on desktop where there's less need for large tap targets
        "md:h-9 md:w-9",
        active && "bg-[#E7E3D8] text-[#111111] border-[#E7E3D8]",
        loading && "animate-pulse",
        className
      )}
      disabled={loading}
    >
      {icon}
    </button>
  );
}

export function GlobeControls() {
  const { flyHome, orientNorth } = useCesiumViewer();
  const { locate, isLocating } = useGeolocation();
  const { refresh, isRefreshing } = useRefreshData();
  const {
    isReady,
    lightingEnabled,
    setLightingEnabled,
    cloudsEnabled,
    setCloudsEnabled,
  } = useGlobeStore();

  const handleHome = useCallback(() => {
    flyHome();
  }, [flyHome]);

  const handleNorthUp = useCallback(() => {
    orientNorth();
  }, [orientNorth]);

  const handleRefreshData = useCallback(() => {
    refresh();
  }, [refresh]);

  const handleMyLocation = useCallback(() => {
    locate();
  }, [locate]);

  const handleToggleLighting = useCallback(() => {
    setLightingEnabled(!lightingEnabled);
  }, [lightingEnabled, setLightingEnabled]);

  const handleToggleClouds = useCallback(() => {
    setCloudsEnabled(!cloudsEnabled);
  }, [cloudsEnabled, setCloudsEnabled]);

  if (!isReady) return null;

  return (
    <div
      className="absolute right-2 top-2 z-10 flex flex-col gap-2 md:right-4 md:top-4"
      role="toolbar"
      aria-label="Globe navigation controls"
    >
      {/* Navigation Controls */}
      <div className="flex flex-col gap-1 rounded-xl bg-[#111215] p-1 backdrop-blur-lg border border-[rgba(255,255,255,0.04)] shadow-[0_20px_60px_rgba(0,0,0,0.45)] md:gap-1.5 md:p-1.5">
        <ControlButton
          icon={<Home className="h-4 w-4" />}
          label="Home — return to default Earth view"
          onClick={handleHome}
        />
        <ControlButton
          icon={<Compass className="h-4 w-4" />}
          label="North Up — orient north to top of screen"
          onClick={handleNorthUp}
        />
        <ControlButton
          icon={<RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />}
          label="Refresh live data"
          onClick={handleRefreshData}
          loading={isRefreshing}
        />
        <ControlButton
          icon={<MapPin className="h-4 w-4" />}
          label="My location"
          onClick={handleMyLocation}
          loading={isLocating}
        />
      </div>

      {/* Display Controls */}
      <div className="flex flex-col gap-1 rounded-xl bg-[#111215] p-1 backdrop-blur-lg border border-[rgba(255,255,255,0.04)] shadow-[0_20px_60px_rgba(0,0,0,0.45)] md:gap-1.5 md:p-1.5">
        <ControlButton
          icon={<Sun className="h-4 w-4" />}
          label="Toggle day/night lighting"
          onClick={handleToggleLighting}
          active={lightingEnabled}
        />
        <ControlButton
          icon={<Cloud className="h-4 w-4" />}
          label="Toggle clouds"
          onClick={handleToggleClouds}
          active={cloudsEnabled}
        />
      </div>
    </div>
  );
}
