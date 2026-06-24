"use client";

import { useEffect, useRef } from "react";
import { useLocationStore } from "@/stores/location-store";
import type { Map as LeafletMap } from "leaflet";

export function LeafletFallback() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<LeafletMap | null>(null);
  const setLocation = useLocationStore((s) => s.setLocation);
  const selectedLocation = useLocationStore((s) => s.selectedLocation);

  useEffect(() => {
    let mounted = true;

    const initMap = async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      if (!mapRef.current || !mounted) return;

      const map = L.map(mapRef.current, {
        center: [20, 0],
        zoom: 2,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);

      // Click handler
      map.on("click", (e) => {
        const { lat, lng } = e.latlng;
        setLocation({
          latitude: lat,
          longitude: lng,
          name: `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`,
          timezone: `UTC${Math.round(lng / 15) >= 0 ? "+" : ""}${Math.round(lng / 15)}`,
          displayName: `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
          source: "globe-click",
          timestamp: Date.now(),
        });
      });

      leafletMapRef.current = map;
    };

    initMap();

    return () => {
      mounted = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [setLocation]);

  // Pan to selected location
  useEffect(() => {
    if (!leafletMapRef.current || !selectedLocation) return;
    leafletMapRef.current.setView(
      [selectedLocation.latitude, selectedLocation.longitude],
      6,
      { animate: true }
    );
  }, [selectedLocation]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapRef} className="h-full w-full" />
      <div className="absolute left-3 top-3 rounded-lg bg-surface-primary/90 px-3 py-1.5 text-xs text-star-white/60 backdrop-blur">
        2D Map (WebGL unavailable)
      </div>
    </div>
  );
}
