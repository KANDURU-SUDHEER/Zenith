"use client";

import { useEffect, useRef, useState } from "react";
import type { Satellite } from "@/types";
import { getGlobalViewer, getGlobalCesium } from "@/hooks/use-cesium-viewer";
import { useSatelliteStore } from "@/stores/satellite-store";
import { getCategoryMeta } from "@/services/tle-service";
import { isViewerReady, isViewerReadyForPick, isViewerAlive } from "@/lib/cesium-guards";

// ─── Category color cache ────────────────────────────────────────────────────
// Avoid calling Color.fromCssColorString for every satellite every 4s.
// Colors are keyed by CSS hex string — only ~9 distinct values in practice.

type CesiumColor = InstanceType<typeof import("cesium").Color>;
const categoryColorCache = new Map<string, CesiumColor>();

function getCachedColor(cssColor: string, Cesium: typeof import("cesium")): CesiumColor {
  let color = categoryColorCache.get(cssColor);
  if (!color) {
    color = Cesium.Color.fromCssColorString(cssColor);
    categoryColorCache.set(cssColor, color);
  }
  return color;
}

// ─── Typed Cesium property setter helper ─────────────────────────────────────
// Cesium's TypeScript types expose Property objects rather than raw values on
// entity sub-properties. At runtime these are ConstantProperty instances that
// have a setValue() method. We type this once here to avoid scattering
// `as unknown` casts throughout the component.
function setProp<T>(prop: unknown, value: T): void {
  (prop as { setValue: (v: T) => void }).setValue(value);
}

interface SatelliteRendererProps {
  satellites: Satellite[];
}

interface TooltipData {
  x: number;
  y: number;
  satellite: Satellite;
}

// ─── Tooltip Component ───────────────────────────────────────────────────────

function SatelliteTooltip({ data }: { data: TooltipData | null }) {
  if (!data) return null;

  const { satellite, x, y } = data;
  const meta = getCategoryMeta(satellite.category);
  const speedKmH = (satellite.velocity * 3600).toFixed(0);

  return (
    <div
      className="pointer-events-none fixed z-50 rounded-lg border border-white/10 bg-space-950/95 px-3 py-2.5 shadow-xl backdrop-blur-md"
      style={{
        left: x + 16,
        top: y - 10,
        maxWidth: 240,
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: meta.color }}
        />
        <span className="text-xs font-semibold text-white">
          {satellite.name}
        </span>
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]">
        <span className="text-white/50">Category</span>
        <span className="text-right text-white/80">{meta.label}</span>
        <span className="text-white/50">NORAD</span>
        <span className="text-right font-mono text-white/80">{satellite.noradId}</span>
        <span className="text-white/50">Altitude</span>
        <span className="text-right font-mono text-white/80">{satellite.altitude.toFixed(0)} km</span>
        <span className="text-white/50">Speed</span>
        <span className="text-right font-mono text-white/80">{speedKmH} km/h</span>
        {satellite.inclination !== undefined && (
          <>
            <span className="text-white/50">Inclination</span>
            <span className="text-right font-mono text-white/80">{satellite.inclination.toFixed(1)}°</span>
          </>
        )}
      </div>
      <p className="mt-1.5 text-[9px] text-white/30">Click for full details</p>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SatelliteRenderer({ satellites }: SatelliteRendererProps) {
  const entityCollectionRef = useRef<unknown>(null);
  const entitiesMapRef = useRef<Map<string, unknown>>(new Map());
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const { setSelectedSatellite } = useSatelliteStore();

  // Initialize entity collection + event handlers
  useEffect(() => {
    const viewer = getGlobalViewer();
    const Cesium = getGlobalCesium();
    if (!viewer || !Cesium || viewer.isDestroyed()) return;

    // Create a custom data source for satellites
    const dataSource = new Cesium.CustomDataSource("satellites");
    viewer.dataSources.add(dataSource);
    entityCollectionRef.current = dataSource;

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    // Click — select satellite
    handler.setInputAction((event: unknown) => {
      if (!isViewerReadyForPick()) return;
      const clickEvent = event as { position: { x: number; y: number } };
      const picked = viewer.scene.pick(
        new Cesium.Cartesian2(clickEvent.position.x, clickEvent.position.y)
      );

      if (picked && picked.id && picked.id._satelliteData) {
        const satData = picked.id._satelliteData as Satellite;
        setSelectedSatellite(satData);
        setTooltip(null);

        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(
            satData.longitude,
            satData.latitude,
            satData.altitude * 1000 + 2_000_000
          ),
          duration: 1.5,
          easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
        });
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // Hover — show tooltip
    handler.setInputAction((event: unknown) => {
      if (!isViewerReadyForPick()) return;
      const moveEvent = event as { endPosition: { x: number; y: number } };
      const picked = viewer.scene.pick(
        new Cesium.Cartesian2(moveEvent.endPosition.x, moveEvent.endPosition.y)
      );

      if (picked && picked.id && picked.id._satelliteData) {
        const satData = picked.id._satelliteData as Satellite;
        setTooltip({
          x: moveEvent.endPosition.x,
          y: moveEvent.endPosition.y,
          satellite: satData,
        });
        // Change cursor to pointer
        (viewer.container as HTMLElement).style.cursor = "pointer";
      } else {
        setTooltip(null);
        (viewer.container as HTMLElement).style.cursor = "";
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    const currentEntitiesMap = entitiesMapRef.current;

    return () => {
      handler.destroy();
      if (viewer && !viewer.isDestroyed()) {
        viewer.dataSources.remove(dataSource as InstanceType<typeof Cesium.CustomDataSource>, true);
        (viewer.container as HTMLElement).style.cursor = "";
      }
      currentEntitiesMap.clear();
    };
  }, [setSelectedSatellite]);

  // Create/update satellite entities when data changes.
  // Positions are updated in-place (setValue) for existing entities — no entity
  // removal/re-add unless the satellite leaves the filtered set.
  // A single requestRender() at the end batches all position changes into one frame.
  useEffect(() => {
    if (satellites.length === 0) return;

    const viewer = getGlobalViewer();
    const Cesium = getGlobalCesium();
    if (!viewer || !Cesium || viewer.isDestroyed()) return;
    if (!isViewerAlive()) return;

    const dataSource = entityCollectionRef.current as InstanceType<
      typeof import("cesium").CustomDataSource
    > | null;
    if (!dataSource) return;

    const entities    = dataSource.entities;
    const existingMap = entitiesMapRef.current;
    const activeSatIds = new Set<string>();

    for (const sat of satellites) {
      activeSatIds.add(sat.id);
      const meta  = getCategoryMeta(sat.category);
      const color = getCachedColor(meta.color, Cesium);

      const position = Cesium.Cartesian3.fromDegrees(
        sat.longitude,
        sat.latitude,
        sat.altitude * 1000
      );

      const existing = existingMap.get(sat.id) as
        | InstanceType<typeof import("cesium").Entity>
        | undefined;

      if (existing) {
        setProp(existing.position, position);
        (existing as unknown as Record<string, unknown>)._satelliteData = sat;
      } else {
        const pixelSize =
          sat.category === "iss" ? 14 :
          sat.category === "starlink" ? 6 : 8;

        const entity = entities.add({
          position,
          show: true,
          point: {
            pixelSize,
            color: sat.category === "iss" ? Cesium.Color.GOLD : color,
            outlineColor: Cesium.Color.BLACK.withAlpha(0.7),
            outlineWidth: 1.5,
            scaleByDistance: new Cesium.NearFarScalar(1e6, 1.5, 4e7, 0.6),
            heightReference: Cesium.HeightReference.NONE,
          },
        });

        (entity as unknown as Record<string, unknown>)._satelliteData = sat;
        existingMap.set(sat.id, entity);
      }
    }

    // Remove entities for satellites that are no longer in the filtered set
    for (const [id, entity] of existingMap) {
      if (!activeSatIds.has(id)) {
        entities.remove(entity as InstanceType<typeof import("cesium").Entity>);
        existingMap.delete(id);
      }
    }

    // Single render call — batches all position changes into one Cesium frame
    viewer.scene.requestRender();
  }, [satellites]);

  // Highlight the selected satellite visually (bigger, brighter dot)
  const selectedSatellite = useSatelliteStore((s) => s.selectedSatellite);
  const prevHighlightIdRef = useRef<string | null>(null);

  useEffect(() => {
    const Cesium = getGlobalCesium();
    if (!Cesium) return;

    // Reset previous highlighted entity to normal appearance
    if (prevHighlightIdRef.current) {
      const prevEntity = entitiesMapRef.current.get(prevHighlightIdRef.current) as InstanceType<typeof import("cesium").Entity> | undefined;
      if (prevEntity && prevEntity.point) {
        const sat = (prevEntity as unknown as Record<string, unknown>)._satelliteData as import("@/types").Satellite | undefined;
        if (sat) {
          const meta = getCategoryMeta(sat.category);
          const origColor = getCachedColor(meta.color, Cesium);
          const size = sat.category === "iss" ? 14 : sat.category === "starlink" ? 6 : 8;
          setProp(prevEntity.point.pixelSize, size);
          setProp(prevEntity.point.outlineWidth, 1.5);
          setProp(prevEntity.point.outlineColor, Cesium.Color.BLACK.withAlpha(0.7));
          setProp(prevEntity.point.color, sat.category === "iss" ? Cesium.Color.GOLD : origColor);
        }
      }
      prevHighlightIdRef.current = null;
    }

    if (!selectedSatellite) return;

    // Make the selected satellite's entity bigger and bright yellow/cyan
    const entity = entitiesMapRef.current.get(selectedSatellite.id) as InstanceType<typeof import("cesium").Entity> | undefined;
    if (entity && entity.point) {
      setProp(entity.point.pixelSize, 22);
      setProp(entity.point.outlineWidth, 4);
      setProp(entity.point.outlineColor, Cesium.Color.CYAN);
      setProp(entity.point.color, Cesium.Color.YELLOW);
      prevHighlightIdRef.current = selectedSatellite.id;
    }
  }, [selectedSatellite, satellites]); // re-run when satellites update (entity may get recreated)

  // Camera-move occlusion: show/hide entities based on whether they're behind Earth.
  // Throttled: runs at most once per 200ms on camera movement + every 4s for drift.
  useEffect(() => {
    const viewer = getGlobalViewer();
    const Cesium = getGlobalCesium();
    if (!viewer || !Cesium || viewer.isDestroyed()) return;

    const CesiumLib = Cesium;
    const ellipsoid = viewer.scene.globe.ellipsoid;

    // Pre-allocate scratch objects — reused on every check, zero heap allocation
    const scratchSatPos = new CesiumLib.Cartesian3();
    const scratchDir    = new CesiumLib.Cartesian3();
    const scratchRay    = new CesiumLib.Ray();

    let pending = false;

    function runOcclusion() {
      pending = false;
      const existingMap = entitiesMapRef.current;
      if (existingMap.size === 0) return;
      if (!isViewerReady()) return;

      const cameraPos = viewer!.camera.positionWC;

      for (const [, entityRaw] of existingMap) {
        const entity = entityRaw as InstanceType<typeof import("cesium").Entity>;
        if (!entity.position) continue;

        const pos = (entity.position as unknown as {
          getValue: (t: unknown) => { x: number; y: number; z: number } | undefined;
        }).getValue(undefined);
        if (!pos) continue;

        scratchSatPos.x = pos.x;
        scratchSatPos.y = pos.y;
        scratchSatPos.z = pos.z;

        CesiumLib.Cartesian3.subtract(scratchSatPos, cameraPos, scratchDir);
        const distance = CesiumLib.Cartesian3.magnitude(scratchDir);
        CesiumLib.Cartesian3.normalize(scratchDir, scratchDir);

        scratchRay.origin    = cameraPos;
        scratchRay.direction = scratchDir;
        const intersection = CesiumLib.IntersectionTests.rayEllipsoid(scratchRay, ellipsoid);

        entity.show = !(intersection && intersection.start < distance);
      }
    }

    // Throttle camera-move callbacks to 200ms so we don't run 1100-entity
    // occlusion math on every frame during a drag.
    function onCameraChanged() {
      if (pending) return;
      pending = true;
      setTimeout(runOcclusion, 200);
    }

    const removeListener = viewer.camera.changed.addEventListener(onCameraChanged);
    // Run immediately on mount and every 4s for satellite drift
    runOcclusion();
    const interval = setInterval(runOcclusion, 4000);

    return () => {
      removeListener();
      clearInterval(interval);
    };
  }, [satellites]);

  return <SatelliteTooltip data={tooltip} />;
}
