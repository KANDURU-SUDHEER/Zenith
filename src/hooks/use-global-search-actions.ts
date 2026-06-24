"use client";

import { useCallback } from "react";
import { useLocationStore, type LocationRecord } from "@/stores/location-store";
import { useSatelliteStore } from "@/stores/satellite-store";
import { useSearchStore, type SearchResult } from "@/stores/search-store";
import { reverseGeocode, estimateTimezone } from "@/lib/geocoding";
import { useOrbitalData } from "@/providers/orbital-engine-provider";
import { useCelestialEngine } from "@/hooks/use-celestial-engine";
import { computeLookAngles } from "@/services/visibility-engine";
import { showToast } from "@/components/ui/toast";
import { getGlobalViewer, getGlobalCesium } from "@/hooks/use-cesium-viewer";
import { isViewerReady } from "@/lib/cesium-guards";

/**
 * Hook that handles dispatching search result selections to various subsystems:
 * - Globe (flyTo)
 * - Location store (for radar/details panel)
 * - Satellite store (for satellite selection)
 * - AI context
 *
 * This hook acts as the bridge between Search → everything else.
 * Search store remains independent of Globe/Radar/Satellite stores.
 */
export function useGlobalSearchActions() {
  const setLocation = useLocationStore((s) => s.setLocation);
  const selectedLocation = useLocationStore((s) => s.selectedLocation);
  const setSelectedSatellite = useSatelliteStore((s) => s.setSelectedSatellite);
  const { satellites } = useOrbitalData();
  const { planets: planetsData, moon: moonData } = useCelestialEngine();
  const setSelectedResult = useSearchStore((s) => s.setSelectedResult);

  // ─── Fly Globe to coordinates ───────────────────────────────────────────

  const flyGlobeTo = useCallback((longitude: number, latitude: number, height = 3_000_000, duration = 2.5) => {
    const viewer = getGlobalViewer();
    const Cesium = getGlobalCesium();
    if (!viewer || !Cesium || viewer.isDestroyed()) return;
    if (!isViewerReady()) return;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, height),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-90),
        roll: 0,
      },
      duration,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    });
  }, []);

  // ─── Ensure location is set (for celestial searches) ────────────────────

  const ensureLocation = useCallback(() => {
    if (selectedLocation) return; // already have a location
    // Auto-trigger geolocation
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const timezone = estimateTimezone(longitude);
          const record: LocationRecord = {
            latitude,
            longitude,
            name: `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`,
            timezone,
            displayName: `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`,
            source: "browser",
            timestamp: Date.now(),
          };
          setLocation(record);
        },
        () => {
          // Geolocation failed — use a default location (Greenwich Observatory)
          const record: LocationRecord = {
            latitude: 51.4769,
            longitude: -0.0005,
            name: "Greenwich Observatory",
            country: "United Kingdom",
            timezone: "UTC+0",
            displayName: "Greenwich Observatory, London",
            source: "search",
            timestamp: Date.now(),
          };
          setLocation(record);
          showToast("Using Greenwich Observatory as default location", "info");
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
      );
    }
  }, [selectedLocation, setLocation]);

  // ─── Handle City/Country/Observatory/Launch Site/Coordinate Selection ───

  const handleLocationResult = useCallback(
    async (result: SearchResult) => {
      if (result.latitude == null || result.longitude == null) return;

      // Clear any previous celestial selection (planet/moon/constellation)
      setSelectedResult(null);

      const lat = result.latitude;
      const lon = result.longitude;

      // Fly globe
      flyGlobeTo(lon, lat);

      // Update location store with reverse geocoding
      try {
        const geo = await reverseGeocode(lat, lon);
        const timezone = estimateTimezone(lon);

        const record: LocationRecord = {
          latitude: lat,
          longitude: lon,
          name: result.name || geo.name,
          city: geo.city,
          district: geo.district,
          state: geo.state,
          country: result.country || geo.country,
          postalCode: geo.postalCode,
          timezone,
          displayName: geo.displayName || result.name,
          source: "search",
          timestamp: Date.now(),
        };
        setLocation(record);
      } catch {
        // Fallback without geocoding
        const timezone = estimateTimezone(lon);
        setLocation({
          latitude: lat,
          longitude: lon,
          name: result.name,
          country: result.country,
          timezone,
          displayName: result.name,
          source: "search",
          timestamp: Date.now(),
        });
      }

      showToast(`Navigating to ${result.name}`, "info");
    },
    [flyGlobeTo, setLocation, setSelectedResult]
  );

  // ─── Handle Planet Selection ────────────────────────────────────────────

  const handlePlanetResult = useCallback(
    (result: SearchResult) => {
      setSelectedResult(result);
      setSelectedSatellite(null); // Clear satellite selection
      ensureLocation();

      // Check if planet is currently above the horizon
      const planet = planetsData?.find((p) => p.name.toLowerCase() === result.name.toLowerCase());
      if (planet) {
        if (planet.isVisible) {
          showToast(
            `${result.name} is visible — Az: ${planet.azimuth.toFixed(1)}, El: ${planet.elevation.toFixed(1)}`,
            "info"
          );
        } else {
          const riseInfo = planet.riseTime ? ` · Rises at ${planet.riseTime}` : "";
          showToast(
            `${result.name} is below the horizon (El: ${planet.elevation.toFixed(1)})${riseInfo}`,
            "info"
          );
        }
      } else {
        showToast(`${result.name} — set a location to see position data`, "info");
      }
    },
    [setSelectedResult, setSelectedSatellite, ensureLocation, planetsData]
  );

  // ─── Handle Moon Selection ──────────────────────────────────────────────

  const handleMoonResult = useCallback(
    (result: SearchResult) => {
      setSelectedResult(result);
      setSelectedSatellite(null); // Clear satellite selection
      ensureLocation();

      if (moonData) {
        if (moonData.isVisible) {
          showToast(
            `Moon is visible — Az: ${moonData.azimuth.toFixed(1)}, El: ${moonData.elevation.toFixed(1)} · ${moonData.phase}`,
            "info"
          );
        } else {
          const riseInfo = moonData.moonRise ? ` · Rises at ${moonData.moonRise}` : "";
          showToast(
            `Moon is below the horizon (El: ${moonData.elevation.toFixed(1)})${riseInfo}`,
            "info"
          );
        }
      } else {
        showToast("Moon — set a location to see position data", "info");
      }
    },
    [setSelectedResult, setSelectedSatellite, ensureLocation, moonData]
  );

  // ─── Handle Satellite Selection ─────────────────────────────────────────

  const handleSatelliteResult = useCallback(
    (result: SearchResult) => {
      // Clear any previous celestial selection (planet/moon/constellation)
      setSelectedResult(null);

      // Find the satellite in orbital data
      const satellite = satellites.find(
        (s) => s.noradId === result.noradId || s.name === result.name
      );

      if (satellite) {
        setSelectedSatellite(satellite);

        // Check if it's above the horizon from user's location
        if (selectedLocation) {
          const lookAngles = computeLookAngles(
            { latitude: selectedLocation.latitude, longitude: selectedLocation.longitude },
            { latitude: satellite.latitude, longitude: satellite.longitude, altitude: satellite.altitude }
          );
          if (lookAngles.elevation > 0) {
            showToast(
              `${satellite.name} is above you — Az: ${lookAngles.azimuth.toFixed(1)}, El: ${lookAngles.elevation.toFixed(1)}`,
              "info"
            );
          } else {
            showToast(
              `${satellite.name} is below the horizon (El: ${lookAngles.elevation.toFixed(1)}) — tracking on Globe`,
              "info"
            );
          }
        } else {
          showToast(`Tracking ${satellite.name} on Globe`, "info");
        }
      } else {
        setSelectedResult(result);
        showToast(`${result.name} not currently loaded in orbital data`, "info");
      }
    },
    [satellites, setSelectedSatellite, setSelectedResult, selectedLocation]
  );

  // ─── Handle Constellation Selection ─────────────────────────────────────

  const handleConstellationResult = useCallback(
    (result: SearchResult) => {
      setSelectedResult(result);
      setSelectedSatellite(null); // Clear satellite selection
      ensureLocation();
      if (selectedLocation) {
        showToast(`${result.name} — see Details panel for star info`, "info");
      } else {
        showToast(`${result.name} — set a location to check visibility`, "info");
      }
    },
    [setSelectedResult, setSelectedSatellite, ensureLocation, selectedLocation]
  );

  // ─── Main Dispatch ──────────────────────────────────────────────────────

  const handleResultSelect = useCallback(
    (result: SearchResult) => {
      // If it's a recent/favorite, resolve the original type from ID prefix
      let target = result;
      if (result.type === "recent" || result.type === "favorite") {
        const prefix = result.id.split("-")[0];
        target = { ...result };
        if (prefix === "planet") target.type = "planet";
        else if (prefix === "satellite") target.type = "satellite";
        else if (prefix === "constellation") target.type = "constellation";
        else if (prefix === "moon") target.type = "moon";
        else if (prefix === "coord") target.type = "coordinate";
        else if (prefix === "country") target.type = "country";
        else if (prefix === "observatory") target.type = "observatory";
        else if (prefix === "launch") target.type = "launch-site";
        else target.type = "city"; // default to location-based
      }

      switch (target.type) {
        case "city":
        case "country":
        case "observatory":
        case "launch-site":
        case "coordinate":
          handleLocationResult(target);
          break;
        case "planet":
          handlePlanetResult(target);
          break;
        case "moon":
          handleMoonResult(target);
          break;
        case "satellite":
          handleSatelliteResult(target);
          break;
        case "constellation":
          handleConstellationResult(target);
          break;
        default:
          // Fallback: try as location
          if (target.latitude != null && target.longitude != null) {
            handleLocationResult(target);
          }
      }
    },
    [handleLocationResult, handlePlanetResult, handleMoonResult, handleSatelliteResult, handleConstellationResult]
  );

  return { handleResultSelect, flyGlobeTo };
}
