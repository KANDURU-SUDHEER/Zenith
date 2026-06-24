"use client";

import { useEffect, useRef } from "react";
import type { ISSData, OrbitPoint } from "@/types";
import { getGlobalViewer, getGlobalCesium } from "@/hooks/use-cesium-viewer";
import { isViewerAlive } from "@/lib/cesium-guards";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ISSRendererProps {
  issData: ISSData | null;
  orbitPath: OrbitPoint[];
  trail: OrbitPoint[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ISSRenderer({ issData, orbitPath, trail }: ISSRendererProps) {
  const issEntityRef = useRef<unknown>(null);
  const orbitEntityRef = useRef<unknown>(null);
  const trailEntityRef = useRef<unknown>(null);
  const dataSourceRef = useRef<unknown>(null);

  // Initialize ISS data source
  useEffect(() => {
    const viewer = getGlobalViewer();
    const Cesium = getGlobalCesium();
    if (!viewer || !Cesium || viewer.isDestroyed()) return;
    if (!isViewerAlive()) return;

    const dataSource = new Cesium.CustomDataSource("iss-tracker");
    viewer.dataSources.add(dataSource);
    dataSourceRef.current = dataSource;

    return () => {
      if (viewer && !viewer.isDestroyed()) {
        viewer.dataSources.remove(
          dataSource as InstanceType<typeof import("cesium").CustomDataSource>,
          true
        );
      }
    };
  }, []);

  // Render orbit path (future trajectory — bright glowing blue)
  useEffect(() => {
    const viewer = getGlobalViewer();
    const Cesium = getGlobalCesium();
    if (!viewer || !Cesium || viewer.isDestroyed()) return;
    if (!isViewerAlive()) return;

    const dataSource = dataSourceRef.current as InstanceType<typeof import("cesium").CustomDataSource> | null;
    if (!dataSource || orbitPath.length < 2) return;

    // Remove old orbit entity
    if (orbitEntityRef.current) {
      dataSource.entities.remove(
        orbitEntityRef.current as InstanceType<typeof import("cesium").Entity>
      );
    }

    const positions = orbitPath.map((p) =>
      Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude, p.altitude * 1000)
    );

    const entity = dataSource.entities.add({
      polyline: {
        positions,
        width: 3,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.3,
          taperPower: 0.5,
          color: Cesium.Color.fromCssColorString("#60a5fa").withAlpha(0.85),
        }),
        clampToGround: false,
      },
    });

    orbitEntityRef.current = entity;
    viewer.scene.requestRender();
  }, [orbitPath]);

  // Render trail (past path — warm amber dashed with fade)
  useEffect(() => {
    const viewer = getGlobalViewer();
    const Cesium = getGlobalCesium();
    if (!viewer || !Cesium || viewer.isDestroyed()) return;
    if (!isViewerAlive()) return;

    const dataSource = dataSourceRef.current as InstanceType<typeof import("cesium").CustomDataSource> | null;
    if (!dataSource || trail.length < 2) return;

    // Remove old trail entity
    if (trailEntityRef.current) {
      dataSource.entities.remove(
        trailEntityRef.current as InstanceType<typeof import("cesium").Entity>
      );
    }

    const positions = trail.map((p) =>
      Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude, p.altitude * 1000)
    );

    const entity = dataSource.entities.add({
      polyline: {
        positions,
        width: 2.5,
        material: new Cesium.PolylineDashMaterialProperty({
          color: Cesium.Color.fromCssColorString("#fbbf24").withAlpha(0.6),
          dashLength: 14,
          dashPattern: 255,
        }),
        clampToGround: false,
      },
    });

    trailEntityRef.current = entity;
    viewer.scene.requestRender();
  }, [trail]);

  // Render ISS marker (animated position — gold with pulsing glow)
  useEffect(() => {
    const viewer = getGlobalViewer();
    const Cesium = getGlobalCesium();
    if (!viewer || !Cesium || viewer.isDestroyed() || !issData) return;
    if (!isViewerAlive()) return;

    const dataSource = dataSourceRef.current as InstanceType<typeof import("cesium").CustomDataSource> | null;
    if (!dataSource) return;

    const position = Cesium.Cartesian3.fromDegrees(
      issData.longitude,
      issData.latitude,
      issData.altitude * 1000
    );

    if (issEntityRef.current) {
      const entity = issEntityRef.current as InstanceType<typeof import("cesium").Entity>;
      (entity.position as unknown as { setValue: (v: unknown) => void }).setValue(position);
    } else {
      // Create ISS entity with prominent styling
      const entity = dataSource.entities.add({
        name: "International Space Station",
        position,
        point: {
          pixelSize: 16,
          color: Cesium.Color.GOLD,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 3,
          scaleByDistance: new Cesium.NearFarScalar(5e5, 2.2, 4e7, 0.9),
        },
        label: {
          text: "● ISS",
          font: "bold 14px sans-serif",
          fillColor: Cesium.Color.GOLD,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 4,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -18),
          scaleByDistance: new Cesium.NearFarScalar(5e5, 1.3, 4e7, 0.5),
          showBackground: true,
          backgroundColor: Cesium.Color.BLACK.withAlpha(0.6),
          backgroundPadding: new Cesium.Cartesian2(6, 4),
        },
      });

      issEntityRef.current = entity;
    }

    viewer.scene.requestRender();
  }, [issData]);

  return null;
}
