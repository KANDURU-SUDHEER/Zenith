"use client"

import { Suspense, useMemo, useRef, useState, useEffect } from "react"
import { Canvas, useFrame, useLoader } from "@react-three/fiber"
import { TextureLoader } from "three"
import * as THREE from "three"

const SUN_DIR   = new THREE.Vector3(-0.9, 0.4, 0.8).normalize()
const SUN_COLOR = new THREE.Color(1.0, 0.85, 0.65)
const ATM_COLOR = new THREE.Color(0.42, 0.67, 1.0)

/** Configure a texture object's sampling/wrap parameters. */
function configureTexture(t: THREE.Texture): void {
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy  = 8
  t.wrapS       = THREE.ClampToEdgeWrapping
  t.wrapT       = THREE.ClampToEdgeWrapping
  t.minFilter   = THREE.LinearMipmapLinearFilter
  t.magFilter   = THREE.LinearFilter
  t.needsUpdate = true
}

// ── Earth Surface ─────────────────────────────────────────────────────────────

function EarthSurface() {
  const meshRef = useRef<THREE.Mesh>(null)
  const textures = useLoader(TextureLoader, [
    "/textures/earth_day.png",
    "/textures/earth_night.png",
  ]) as [THREE.Texture, THREE.Texture]
  const [dayMap, nightMap] = textures

  const material = useMemo(() => {
    configureTexture(dayMap)
    configureTexture(nightMap)

    return new THREE.ShaderMaterial({
      uniforms: {
        uDay:    { value: dayMap   },
        uNight:  { value: nightMap },
        uSunDir: { value: SUN_DIR.clone() },
        uSun:    { value: SUN_COLOR.clone() },
        uAtm:    { value: ATM_COLOR.clone() },
      },
      vertexShader: /* glsl */`
        varying vec2  vUv;
        varying vec3  vNormal;
        varying vec3  vViewDir;

        void main() {
          vUv     = uv;
          vNormal = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vViewDir = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */`
        uniform sampler2D uDay;
        uniform sampler2D uNight;
        uniform vec3 uSunDir;
        uniform vec3 uSun;
        uniform vec3 uAtm;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewDir;

        void main() {
          vec3 N       = normalize(vNormal);
          vec3 sunView = normalize((viewMatrix * vec4(uSunDir, 0.0)).xyz);
          float NdotL  = dot(N, sunView);

          float dayMix = smoothstep(-0.25, 0.35, NdotL);

          vec3 day   = texture2D(uDay,   vUv).rgb;
          vec3 night = texture2D(uNight, vUv).rgb * vec3(1.0, 0.88, 0.65) * 1.7;

          vec3 lit   = day * clamp(0.3 + 0.85 * NdotL, 0.0, 1.0);
          vec3 color = mix(night, lit, dayMix);

          float term = 1.0 - abs(NdotL);
          color     += uSun * pow(clamp(term, 0.0, 1.0), 5.5) * 0.5;

          float fresnel = 1.0 - max(dot(N, vViewDir), 0.0);
          fresnel       = pow(fresnel, 3.2);
          color        += uAtm * fresnel * 0.6 * smoothstep(-0.35, 0.55, NdotL);

          gl_FragColor = vec4(color, 1.0);
        }
      `,
    })
  }, [dayMap, nightMap])

  // Dispose the old material when it is replaced (texture change) to free GPU memory
  const prevMaterialRef = useRef<THREE.ShaderMaterial | null>(null)
  useEffect(() => {
    const prev = prevMaterialRef.current
    if (prev && prev !== material) prev.dispose()
    prevMaterialRef.current = material
    return () => { material.dispose() }
  }, [material])

  useFrame((_, dt) => {
    if (meshRef.current) meshRef.current.rotation.y += dt * (Math.PI * 2 / 720)
  })

  return (
    <mesh ref={meshRef} rotation-y={-1.1}>
      <sphereGeometry args={[1, 64, 64]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

// ── Cloud layer ───────────────────────────────────────────────────────────────

function Clouds() {
  const meshRef  = useRef<THREE.Mesh>(null)
  const cloudMap = useLoader(TextureLoader, "/textures/earth_clouds.png")

  const material = useMemo(() => {
    configureTexture(cloudMap)

    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite:  false,
      blending:    THREE.NormalBlending,
      uniforms: {
        uCloud:  { value: cloudMap },
        uSunDir: { value: SUN_DIR.clone() },
      },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          vUv     = uv;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform sampler2D uCloud;
        uniform vec3 uSunDir;
        varying vec2 vUv;
        varying vec3 vNormal;

        void main() {
          vec4  s     = texture2D(uCloud, vUv);
          float alpha = s.r * 0.55;
          if (alpha < 0.01) discard;

          vec3 N    = normalize(vNormal);
          vec3 sv   = normalize((viewMatrix * vec4(uSunDir, 0.0)).xyz);
          float lit = clamp(0.35 + 0.75 * dot(N, sv), 0.0, 1.0);

          gl_FragColor = vec4(vec3(lit), alpha);
        }
      `,
    })
  }, [cloudMap])

  // Dispose old cloud material on replacement to free GPU memory
  const prevCloudMaterialRef = useRef<THREE.ShaderMaterial | null>(null)
  useEffect(() => {
    const prev = prevCloudMaterialRef.current
    if (prev && prev !== material) prev.dispose()
    prevCloudMaterialRef.current = material
    return () => { material.dispose() }
  }, [material])

  useFrame((_, dt) => {
    if (meshRef.current) meshRef.current.rotation.y += dt * (Math.PI * 2 / 540)
  })

  return (
    <mesh ref={meshRef} rotation-y={-1.1} scale={1.015}>
      <sphereGeometry args={[1, 64, 64]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

// ── Atmosphere ────────────────────────────────────────────────────────────────
//
// The atmosphere material is created lazily on first render (not at module
// import time) to avoid allocating GPU resources before a WebGL context exists.
// The uTime uniform is updated every frame via a pre-allocated ref so we never
// mutate hook-returned values.

type AtmosphereMaterialBundle = {
  mat: THREE.ShaderMaterial
  uniforms: Record<string, THREE.IUniform>
}

let _atmosphereMaterial: AtmosphereMaterialBundle | null = null

function getAtmosphereMaterial(): AtmosphereMaterialBundle {
  if (_atmosphereMaterial) return _atmosphereMaterial

  const uniforms: Record<string, THREE.IUniform> = {
    uAtm:    { value: ATM_COLOR.clone() },
    uSun:    { value: SUN_COLOR.clone() },
    uSunDir: { value: SUN_DIR.clone()   },
    uTime:   { value: 0 },
  }

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    blending:    THREE.AdditiveBlending,
    side:        THREE.BackSide,
    depthWrite:  false,
    uniforms,
    vertexShader: /* glsl */`
      varying vec3 vNormal;
      varying vec3 vWorld;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vWorld  = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3  uAtm;
      uniform vec3  uSun;
      uniform vec3  uSunDir;
      uniform float uTime;
      varying vec3  vNormal;
      varying vec3  vWorld;

      void main() {
        float rim   = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.6);
        float sun   = dot(normalize(vWorld), normalize(uSunDir));
        vec3  tint  = mix(uAtm * 1.2, uSun * 0.85, smoothstep(-0.1, 0.9, sun) * 0.45);
        float pulse = 1.0 + 0.035 * sin(uTime * 0.35);
        gl_FragColor = vec4(tint, 1.0) * clamp(rim * pulse, 0.0, 1.0);
      }
    `,
  })

  _atmosphereMaterial = { mat, uniforms }
  return _atmosphereMaterial
}

function Atmosphere() {
  const bundle = getAtmosphereMaterial()
  // Store the uTime IUniform entry in a ref so mutations happen through a ref
  // (not a render-local variable), which satisfies react-hooks/immutability.
  const uTimeRef = useRef(bundle.uniforms["uTime"])

  useFrame(({ clock }) => {
    if (uTimeRef.current) {
      uTimeRef.current.value = clock.getElapsedTime()
    }
  })

  return (
    <mesh scale={1.28}>
      <sphereGeometry args={[1, 48, 48]} />
      <primitive object={bundle.mat} attach="material" />
    </mesh>
  )
}

// ── Cinematic camera drift ────────────────────────────────────────────────────

// Pre-allocate the camera look-at target to avoid Vector3 allocation every frame
const LOOK_AT_ORIGIN = new THREE.Vector3(0, 0, 0)

function CameraRig() {
  useFrame(({ camera, clock }) => {
    const t    = clock.getElapsedTime()
    const loop = (t / 90) * Math.PI * 2
    const d    = THREE.MathUtils.degToRad(0.35)
    camera.position.x = Math.sin(loop) * d * 3
    camera.position.y = Math.cos(loop * 0.55) * d * 1.8
    camera.position.z = 3.2 * (1 + Math.sin(loop * 0.45) * 0.012)
    camera.lookAt(LOOK_AT_ORIGIN)
  })
  return null
}

// ── Earth group ───────────────────────────────────────────────────────────────

function EarthGroup() {
  return (
    <group position={[0.9, -0.3, 0]} scale={1.9}>
      <EarthSurface />
      <Clouds />
      <Atmosphere />
    </group>
  )
}

// ── Canvas ────────────────────────────────────────────────────────────────────

export default function EarthScene() {
  const [frameloop, setFrameloop] = useState<"always" | "never">("always")

  // NOTE: EarthScene lives inside a position:fixed container (SpaceScene).
  // IntersectionObserver always fires isIntersecting=true for fixed elements.
  // Use scroll position instead — pause when SpaceScene fades out (>82% vh).
  useEffect(() => {
    const update = () => {
      const scrollHidden = window.scrollY >= window.innerHeight * 0.82
      const tabHidden = document.hidden
      setFrameloop(scrollHidden || tabHidden ? "never" : "always")
    }
    window.addEventListener("scroll", update, { passive: true })
    document.addEventListener("visibilitychange", update)
    update()
    return () => {
      window.removeEventListener("scroll", update)
      document.removeEventListener("visibilitychange", update)
    }
  }, [])

  return (
    <div className="!absolute inset-0">
    <Canvas
      className="!absolute inset-0"
      frameloop={frameloop}
      dpr={[1, 1.5]}
      gl={{
        antialias:        true,
        alpha:            true,
        powerPreference:  "high-performance",
        outputColorSpace: THREE.SRGBColorSpace,
      } as Parameters<typeof Canvas>[0]["gl"]}
      camera={{ position: [0, 0, 3.2], fov: 42 }}
    >
      <directionalLight position={[-4, 2.5, 3.5]} intensity={2.6} color="#ffd2a0" />
      <ambientLight intensity={0.10} color="#1a2844" />
      <Suspense fallback={null}>
        <EarthGroup />
      </Suspense>
      <CameraRig />
    </Canvas>
    </div>
  )
}
