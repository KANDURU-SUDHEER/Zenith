import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // NOTE: turbopack intentionally removed.
  // Turbopack recompiles Cesium's raw ESM source under strict mode, which hits
  // octal escape sequences in template literals — illegal in strict mode.
  // Webpack resolves import("cesium") to the pre-built, already-sanitized
  // bundle (node_modules/cesium/Build/Cesium), avoiding the syntax error entirely.

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "apod.nasa.gov" },
      { protocol: "https", hostname: "apod.gsfc.nasa.gov" },
      { protocol: "https", hostname: "www.nasa.gov" },
      { protocol: "https", hostname: "images-assets.nasa.gov" },
      { protocol: "https", hostname: "eoimages.gsfc.nasa.gov" },
      { protocol: "https", hostname: "science.nasa.gov" },
      { protocol: "https", hostname: "hubblesite.org" },
      { protocol: "https", hostname: "imgsrc.hubblesite.org" },
      { protocol: "https", hostname: "esahubble.org" },
      { protocol: "https", hostname: "esawebb.org" },
      { protocol: "https", hostname: "webbtelescope.org" },
      { protocol: "https", hostname: "stsci.edu" },
      { protocol: "https", hostname: "**.stsci.edu" },
      { protocol: "https", hostname: "www.esa.int" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "cdn.eso.org" },
      { protocol: "https", hostname: "www.eso.org" },
      { protocol: "https", hostname: "noirlab.edu" },
      { protocol: "https", hostname: "pngimg.com" },
      { protocol: "https", hostname: "www.pngplay.com" },
      { protocol: "https", hostname: "freepngimg.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },

  // Cesium is client-only — keep it out of the server bundle
  serverExternalPackages: ["astronomy-engine"],

  // Prevent webpack from trying to polyfill Node built-ins that Cesium
  // references in its source but never actually uses in the browser.
  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        http: false,
        https: false,
        zlib: false,
        path: false,
        stream: false,
        crypto: false,
        url: false,
        os: false,
      };

      // @spz-loader/core (a Gaussian Splat decoder pulled in by @cesium/engine) embeds a
      // compiled WASM binary as inline template literal strings. Those strings contain \00
      // sequences (null byte followed by ASCII '0'). Webpack wraps every ESM module in strict
      // mode, which makes \00 inside a template literal an illegal legacy octal escape:
      //
      //   SyntaxError: Octal escape sequences are not allowed in template strings
      //
      // This crash causes the Cesium chunk to fail at runtime, which makes import("cesium")
      // reject, freezing the globe at 10% in production.
      //
      // Fix: alias @spz-loader/core to a real no-op stub module. Cesium's GltfSpzLoader
      // — the only consumer — handles a missing loadSpz gracefully (just won't load .spz
      // Gaussian Splat files, which this application does not use).
      config.resolve.alias = {
        ...config.resolve.alias,
        "@spz-loader/core": path.resolve(__dirname, "src/lib/empty-stub.js"),
      };
    }
    return config;
  },

  experimental: {
    optimizeCss: false,
  },
};

export default nextConfig;
