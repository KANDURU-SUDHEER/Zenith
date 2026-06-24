/**
 * Copies Cesium static assets to the public directory.
 * Required for Cesium's web workers and textures to load at runtime.
 */
import { cpSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const cesiumSource = resolve(rootDir, "node_modules/cesium/Build/Cesium");
const cesiumDest = resolve(rootDir, "public/cesium");

if (!existsSync(cesiumSource)) {
  console.warn("⚠️  Cesium build directory not found. Skipping asset copy.");
  console.warn("   This is normal during initial setup. Cesium will use fallback.");
  process.exit(0);
}

mkdirSync(cesiumDest, { recursive: true });

const assetsToCopy = ["Workers", "ThirdParty", "Assets", "Widgets"];

for (const asset of assetsToCopy) {
  const src = resolve(cesiumSource, asset);
  const dest = resolve(cesiumDest, asset);
  if (existsSync(src)) {
    cpSync(src, dest, { recursive: true });
    console.log(`✓ Copied ${asset}`);
  }
}

console.log("✓ Cesium assets copied to public/cesium/");
