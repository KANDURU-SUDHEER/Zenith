import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  turbopack: {},
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
  // Reduce bundle by excluding unused packages from server bundle
  serverExternalPackages: ["astronomy-engine"],
  // Experimental optimizations
  experimental: {
    // Optimize CSS
    optimizeCss: false, // Requires critters — disabled unless installed
  },
};

export default nextConfig;
