"use client";

import { useEffect, useRef, useCallback } from "react";
import { useLocationStore, type LocationRecord } from "@/stores/location-store";
import { useGlobeStore } from "@/stores/globe-store";
import { useSatelliteStore } from "@/stores/satellite-store";
import {
  setGlobalViewer,
  setGlobalCesium,
} from "@/hooks/use-cesium-viewer";
import { reverseGeocode, estimateTimezone } from "@/lib/geocoding";
import {
  isViewerReady,
  isViewerReadyForPick,
  canResize,
} from "@/lib/cesium-guards";
import { GlobeControls } from "./globe-controls";
import { GlobeMarker } from "./globe-marker";
import { CloudOverlay } from "./cloud-overlay";

let Cesium: typeof import("cesium") | null = null;

/**
 * Places or updates the marker entity on the Cesium globe with animated appearance.
 */
function createMarkerEntity(
  viewer: InstanceType<typeof import("cesium").Viewer>,
  CesiumLib: typeof import("cesium"),
  latitude: number,
  longitude: number,
  existingEntity: InstanceType<typeof import("cesium").Entity> | null
): InstanceType<typeof import("cesium").Entity> {
  // Remove old markers
  if (existingEntity) {
    viewer.entities.remove(existingEntity);
  }
  // Also remove any leftover ripple entities from previous marker
  const toRemove = viewer.entities.values.filter(
    (e) => (e as unknown as Record<string, unknown>).__zenithMarkerRing === true
  );
  for (const e of toRemove) {
    viewer.entities.remove(e);
  }

  const position = CesiumLib.Cartesian3.fromDegrees(longitude, latitude);

  // Small precise point marker
  const entity = viewer.entities.add({
    position,
    point: {
      pixelSize: 10,
      color: CesiumLib.Color.fromCssColorString("#60a5fa"),
      outlineColor: CesiumLib.Color.fromCssColorString("#1d4ed8"),
      outlineWidth: 2,
      heightReference: CesiumLib.HeightReference.CLAMP_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      scaleByDistance: new CesiumLib.NearFarScalar(1e5, 1.2, 2e7, 0.7),
    },
  });

  // Small subtle ring around the point (5km radius — barely visible, just a hint)
  const ring = viewer.entities.add({
    position,
    ellipse: {
      semiMinorAxis: 5000,
      semiMajorAxis: 5000,
      height: 0,
      material: CesiumLib.Color.fromCssColorString("rgba(96, 165, 250, 0.08)"),
      outline: true,
      outlineColor: CesiumLib.Color.fromCssColorString("rgba(96, 165, 250, 0.4)"),
      outlineWidth: 1.5,
      heightReference: CesiumLib.HeightReference.CLAMP_TO_GROUND,
    },
  });
  (ring as unknown as Record<string, unknown>).__zenithMarkerRing = true;

  viewer.scene.requestRender();
  return entity;
}

export function CesiumGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<InstanceType<typeof import("cesium").Viewer> | null>(null);
  const markerEntityRef = useRef<InstanceType<typeof import("cesium").Entity> | null>(null);

  const setLocation = useLocationStore((s) => s.setLocation);
  const setReverseGeocoding = useLocationStore((s) => s.setReverseGeocoding);
  const selectedLocation = useLocationStore((s) => s.selectedLocation);

  const {
    lightingEnabled,
    atmosphereEnabled,
  } = useGlobeStore();

  // Store setters accessed via ref so the init effect's dep array stays empty.
  const storeSettersRef = useRef({
    setReady: useGlobeStore.getState().setReady,
    setLoadingPhase: useGlobeStore.getState().setLoadingPhase,
    setLoadingProgress: useGlobeStore.getState().setLoadingProgress,
    setError: useGlobeStore.getState().setError,
  });

  const handleResize = useCallback(() => {
    if (!canResize()) return;
    const viewer = viewerRef.current;
    if (viewer && !viewer.isDestroyed()) {
      viewer.resize();
      viewer.scene.requestRender();
    }
  }, []);

  // Fix: Pause/resume Cesium render loop based on container visibility.
  // When the globe is hidden (opacity-0), Cesium must not render or it crashes
  // with "Expected width to be greater than 0" on framebuffer/texture creation.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Watch the parent div (which gets opacity-0 class toggled)
    const parent = container.parentElement;
    if (!parent) return;

    const observer = new MutationObserver(() => {
      const viewer = viewerRef.current;
      if (!viewer || viewer.isDestroyed()) return;

      const isHidden = parent.classList.contains("opacity-0");
      if (isHidden) {
        viewer.useDefaultRenderLoop = false;
      } else {
        // Re-enable rendering only after the canvas has valid dimensions.
        // We poll via rAF until the browser has reflowed the layout change.
        // NEVER enable the render loop while dimensions are zero.
        const tryRestore = (attempt: number) => {
          if (viewer.isDestroyed()) return;
          const canvas = viewer.scene.canvas;
          if (canvas.clientWidth > 0 && canvas.clientHeight > 0) {
            viewer.resize();
            // After resize, verify the drawing buffer actually got non-zero dimensions.
            // If the GPU hasn't allocated the backing store yet, drawingBuffer will be 0.
            if (viewer.scene.drawingBufferWidth <= 0 || viewer.scene.drawingBufferHeight <= 0) {
              // resize() didn't produce valid dimensions — retry next frame
              if (attempt < 20) {
                requestAnimationFrame(() => tryRestore(attempt + 1));
              }
              return;
            }
            viewer.useDefaultRenderLoop = true;
            viewer.scene.requestRender();
            viewer.camera.changed.raiseEvent(0);
          } else if (attempt < 20) {
            // Canvas still zero — retry next frame (max 20 attempts ≈ 333ms @ 60fps)
            requestAnimationFrame(() => tryRestore(attempt + 1));
          } else {
            // Last resort: force enable anyway (prevents permanent freeze)
            viewer.useDefaultRenderLoop = true;
          }
        };
        requestAnimationFrame(() => tryRestore(1));
      }
    });

    observer.observe(parent, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let mounted = true;
    let resizeObserver: ResizeObserver | null = null;
    let handler: InstanceType<typeof import("cesium").ScreenSpaceEventHandler> | null = null;

    const initCesium = async () => {
      const { setReady, setLoadingPhase, setLoadingProgress, setError } = storeSettersRef.current;
      try {
        setLoadingPhase("initializing");
        setLoadingProgress(10);

        // ── IMPORT ──────────────────────────────────────────────────────────
        console.log("[INIT] before import");
        if (!Cesium) {
          Cesium = await import("cesium");
        }
        console.log("[INIT] after import");

        const CesiumLib = Cesium;
        setGlobalCesium(CesiumLib);

        if (!containerRef.current || !mounted) {
          console.log("[INIT] aborted — container gone or component unmounted");
          return;
        }

        setLoadingProgress(20);

        (window as unknown as Record<string, unknown>)["CESIUM_BASE_URL"] = "/cesium/";

        const ionToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
        const hasIonToken = !!ionToken && ionToken.length > 10;
        console.log("[INIT] ion token present:", hasIonToken);

        if (hasIonToken) {
          CesiumLib.Ion.defaultAccessToken = ionToken;
        }

        // ── TERRAIN ─────────────────────────────────────────────────────────
        console.log("[INIT] before terrain");
        setLoadingPhase("terrain");
        setLoadingProgress(35);

        const viewerOptions: Record<string, unknown> = {
          animation: false,
          baseLayerPicker: false,
          fullscreenButton: false,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          sceneModePicker: false,
          selectionIndicator: false,
          timeline: false,
          navigationHelpButton: false,
          creditContainer: document.createElement("div"),
          skyBox: new CesiumLib.SkyBox({
            sources: {
              positiveX: CesiumLib.buildModuleUrl(
                "Assets/Textures/SkyBox/tycho2t3_80_px.jpg"
              ),
              negativeX: CesiumLib.buildModuleUrl(
                "Assets/Textures/SkyBox/tycho2t3_80_mx.jpg"
              ),
              positiveY: CesiumLib.buildModuleUrl(
                "Assets/Textures/SkyBox/tycho2t3_80_py.jpg"
              ),
              negativeY: CesiumLib.buildModuleUrl(
                "Assets/Textures/SkyBox/tycho2t3_80_my.jpg"
              ),
              positiveZ: CesiumLib.buildModuleUrl(
                "Assets/Textures/SkyBox/tycho2t3_80_pz.jpg"
              ),
              negativeZ: CesiumLib.buildModuleUrl(
                "Assets/Textures/SkyBox/tycho2t3_80_mz.jpg"
              ),
            },
          }),
          skyAtmosphere: new CesiumLib.SkyAtmosphere(),
          scene3DOnly: true,
          requestRenderMode: true,
          maximumRenderTimeChange: Infinity,
          msaaSamples: 4,
        };

        if (hasIonToken) {
          viewerOptions.terrain = CesiumLib.Terrain.fromWorldTerrain({
            requestWaterMask: true,
            requestVertexNormals: true,
          });
        } else {
          viewerOptions.baseLayer = CesiumLib.ImageryLayer.fromProviderAsync(
            CesiumLib.TileMapServiceImageryProvider.fromUrl(
              CesiumLib.buildModuleUrl("Assets/Textures/NaturalEarthII")
            )
          );
        }

        console.log("[INIT] after terrain");

        // ── IMAGERY ─────────────────────────────────────────────────────────
        console.log("[INIT] before imagery");
        setLoadingPhase("imagery");
        setLoadingProgress(55);

        // ── VIEWER ──────────────────────────────────────────────────────────
        console.log("[INIT] before viewer");
        const viewer = new CesiumLib.Viewer(
          containerRef.current,
          viewerOptions as ConstructorParameters<typeof CesiumLib.Viewer>[1]
        );
        console.log("[INIT] after viewer");

        viewer.resolutionScale = Math.min(window.devicePixelRatio || 1, 1.5);

        viewerRef.current = viewer;
        setGlobalViewer(viewer);

        const controller = viewer.scene.screenSpaceCameraController;
        controller.minimumZoomDistance = 1_000_000;
        controller.maximumZoomDistance = 45_000_000;
        controller.inertiaSpin = 0.9;
        controller.inertiaTranslate = 0.9;
        controller.inertiaZoom = 0.85;
        controller.zoomEventTypes = [
          CesiumLib.CameraEventType.RIGHT_DRAG,
          CesiumLib.CameraEventType.WHEEL,
          CesiumLib.CameraEventType.PINCH,
        ];
        controller.tiltEventTypes = [
          CesiumLib.CameraEventType.MIDDLE_DRAG,
          CesiumLib.CameraEventType.PINCH,
          {
            eventType: CesiumLib.CameraEventType.LEFT_DRAG,
            modifier: CesiumLib.KeyboardEventModifier.CTRL,
          },
          {
            eventType: CesiumLib.CameraEventType.RIGHT_DRAG,
            modifier: CesiumLib.KeyboardEventModifier.CTRL,
          },
        ];
        controller.enableCollisionDetection = true;

        console.log("[INIT] after imagery");

        // ── ENVIRONMENT ─────────────────────────────────────────────────────
        console.log("[INIT] before environment");
        setLoadingPhase("environment");
        setLoadingProgress(75);

        // Globe Rendering
        const globe = viewer.scene.globe;
        globe.enableLighting = true;
        globe.showGroundAtmosphere = true;
        globe.depthTestAgainstTerrain = hasIonToken;
        globe.atmosphereLightIntensity = 10.0;
        globe.atmosphereRayleighScaleHeight = 10000;
        globe.atmosphereMieScaleHeight = 3200;
        globe.atmosphereRayleighCoefficient = new CesiumLib.Cartesian3(
          5.5e-6,
          13.0e-6,
          28.4e-6
        );
        globe.atmosphereMieCoefficient = new CesiumLib.Cartesian3(
          21e-6,
          21e-6,
          21e-6
        );
        globe.lightingFadeOutDistance = 1e7;
        globe.lightingFadeInDistance = 2e7;
        globe.nightFadeOutDistance = 1e7;
        globe.nightFadeInDistance = 5e7;

        if (hasIonToken) {
          globe.maximumScreenSpaceError = 1.5;
        } else {
          globe.maximumScreenSpaceError = 2.0; // Default is 2; keep it at default for non-terrain mode
        }

        // Scene quality
        const scene = viewer.scene;
        scene.fog.enabled = true;
        scene.fog.density = 2.0e-4;
        scene.fog.screenSpaceErrorFactor = 2.0;
        scene.postProcessStages.fxaa.enabled = true;

        // Dynamic time
        viewer.clock.shouldAnimate = true;
        viewer.clock.currentTime = CesiumLib.JulianDate.now();
        scene.sun = new CesiumLib.Sun();
        scene.moon = new CesiumLib.Moon();

        if (scene.skyAtmosphere) {
          scene.skyAtmosphere.hueShift = 0.0;
          scene.skyAtmosphere.saturationShift = 0.0;
          scene.skyAtmosphere.brightnessShift = 0.0;
        }

        console.log("[INIT] after environment");

        setLoadingProgress(90);

        // Default camera view
        viewer.camera.setView({
          destination: CesiumLib.Cartesian3.fromDegrees(0, 20, 20_000_000),
          orientation: {
            heading: 0,
            pitch: CesiumLib.Math.toRadians(-90),
            roll: 0,
          },
        });

        // Click Handler — place marker and reverse geocode
        handler = new CesiumLib.ScreenSpaceEventHandler(viewer.scene.canvas);

        handler.setInputAction((event: unknown) => {
          if (!isViewerReadyForPick()) return;
          const clickEvent = event as { position: { x: number; y: number } };

          // Check if ANY entity was clicked (satellite, ISS, orbit) — if so, don't place a marker
          const picked = viewer.scene.pick(
            new CesiumLib.Cartesian2(clickEvent.position.x, clickEvent.position.y)
          );
          if (picked && picked.id) {
            // Skip marker placement if any data source entity was picked
            return;
          }

          const cartesian = viewer.camera.pickEllipsoid(
            new CesiumLib.Cartesian2(
              clickEvent.position.x,
              clickEvent.position.y
            ),
            viewer.scene.globe.ellipsoid
          );
          if (cartesian) {
            const cartographic = CesiumLib.Cartographic.fromCartesian(cartesian);
            const lat = CesiumLib.Math.toDegrees(cartographic.latitude);
            const lng = CesiumLib.Math.toDegrees(cartographic.longitude);

            // Place marker entity immediately
            markerEntityRef.current = createMarkerEntity(
              viewer,
              CesiumLib,
              lat,
              lng,
              markerEntityRef.current
            );

            // Reverse geocode
            setReverseGeocoding(true);
            const timezone = estimateTimezone(lng);

            reverseGeocode(lat, lng)
              .then((geo) => {
                const record: LocationRecord = {
                  latitude: lat,
                  longitude: lng,
                  name: geo.name,
                  city: geo.city,
                  district: geo.district,
                  state: geo.state,
                  country: geo.country,
                  postalCode: geo.postalCode,
                  timezone,
                  displayName: geo.displayName,
                  source: "globe-click",
                  timestamp: Date.now(),
                };
                setLocation(record);
              })
              .catch(() => {
                // Fallback to coordinates
                const record: LocationRecord = {
                  latitude: lat,
                  longitude: lng,
                  name: `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
                  timezone,
                  displayName: `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
                  source: "globe-click",
                  timestamp: Date.now(),
                };
                setLocation(record);
              });

            viewer.scene.requestRender();
          }
        }, CesiumLib.ScreenSpaceEventType.LEFT_CLICK);

        // Double-click: smooth zoom in
        handler.setInputAction((event: unknown) => {
          if (!isViewerReadyForPick()) return;
          const clickEvent = event as { position: { x: number; y: number } };
          const cartesian = viewer.camera.pickEllipsoid(
            new CesiumLib.Cartesian2(
              clickEvent.position.x,
              clickEvent.position.y
            ),
            viewer.scene.globe.ellipsoid
          );
          if (cartesian) {
            const cartographic = CesiumLib.Cartographic.fromCartesian(cartesian);
            const currentHeight = viewer.camera.positionCartographic.height;
            const targetHeight = Math.max(currentHeight * 0.4, 1_200_000);

            viewer.camera.flyTo({
              destination: CesiumLib.Cartesian3.fromRadians(
                cartographic.longitude,
                cartographic.latitude,
                targetHeight
              ),
              duration: 1.5,
              easingFunction: CesiumLib.EasingFunction.CUBIC_IN_OUT,
            });
          }
        }, CesiumLib.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

        // ResizeObserver
        resizeObserver = new ResizeObserver(() => {
          handleResize();
        });
        resizeObserver.observe(containerRef.current);

        // ── READY ───────────────────────────────────────────────────────────
        console.log("[INIT] before ready");
        setLoadingProgress(100);
        setLoadingPhase("complete");
        requestAnimationFrame(() => {
          if (mounted) {
            console.log("[INIT] after ready");
            setReady(true);
          }
        });
      } catch (err) {
        console.error("[INIT ERROR]", err);
        if (mounted) {
          const message = err instanceof Error ? err.message : "Failed to load globe";
          setError(message);
        }
      }
    };

    initCesium();

    return () => {
      console.log("[INIT] Cleanup: unmounting CesiumGlobe");
      mounted = false;
      resizeObserver?.disconnect();
      handler?.destroy();
      // Reset globe store so next mount shows loading screen properly
      storeSettersRef.current.setReady(false);
      storeSettersRef.current.setLoadingPhase("initializing");
      storeSettersRef.current.setLoadingProgress(0);
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
        setGlobalViewer(null);
      }
    };
  }, [handleResize, setLocation, setReverseGeocoding]); // intentionally stable — all are useCallback or Zustand actions

  // Update lighting when toggled
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;
    viewer.scene.globe.enableLighting = lightingEnabled;
    viewer.scene.requestRender();
  }, [lightingEnabled]);

  // Update atmosphere when toggled
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;
    viewer.scene.globe.showGroundAtmosphere = atmosphereEnabled;
    if (viewer.scene.skyAtmosphere) {
      viewer.scene.skyAtmosphere.show = atmosphereEnabled;
    }
    viewer.scene.requestRender();
  }, [atmosphereEnabled]);

  // Sync marker overlay position when selected location changes.
  // This is intentionally a separate effect from the Cesium entity update below
  // so that the React state update is isolated and doesn't trigger the camera fly.

  // Fly to selected location and place Cesium entity when it changes.
  useEffect(() => {
    if (!viewerRef.current || !selectedLocation || !Cesium) return;
    const viewer = viewerRef.current;
    const CesiumLib = Cesium;

    if (viewer.isDestroyed()) return;
    if (!isViewerReady()) return;

    const currentSatellite = useSatelliteStore.getState().selectedSatellite;

    markerEntityRef.current = createMarkerEntity(
      viewer,
      CesiumLib,
      selectedLocation.latitude,
      selectedLocation.longitude,
      markerEntityRef.current
    );

    if (!currentSatellite) {
      viewer.camera.flyTo({
        destination: CesiumLib.Cartesian3.fromDegrees(
          selectedLocation.longitude,
          selectedLocation.latitude,
          5_000_000
        ),
        orientation: {
          heading: 0,
          pitch: CesiumLib.Math.toRadians(-90),
          roll: 0,
        },
        duration: 2.5,
        easingFunction: CesiumLib.EasingFunction.CUBIC_IN_OUT,
      });
    }
  }, [selectedLocation]);

  const error = useGlobeStore((s) => s.error);

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-space-950">
        <div className="text-center">
          <p className="text-sm text-star-white/60">Globe rendering unavailable</p>
          <p className="mt-1 text-xs text-star-white/30">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className="absolute inset-0"
        role="application"
        aria-label="Interactive 3D Earth Globe — click to select a location"
        tabIndex={0}
      />
      <GlobeControls />
      <GlobeMarker position={null} />
      <CloudOverlay />
    </>
  );
}
