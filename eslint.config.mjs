import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    "public/cesium/**",
    ".next/**",
    "out/**",
    "coverage/**",
    "node_modules/**",
    "next-env.d.ts",
    "scripts/**",
  ]),
]);

export default eslintConfig;
