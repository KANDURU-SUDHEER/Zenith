// Empty stub — replaces @spz-loader/core to prevent octal escape SyntaxError in production.
// @cesium/engine pulls in @spz-loader/core (Gaussian Splat decoder) which embeds WASM binary
// data as template literal strings containing \00 sequences. These are illegal legacy octal
// escapes in strict mode, crashing the Cesium chunk at runtime.
// This stub replaces it with a no-op. The only lost feature is loading .spz files, unused here.
export const loadSpz = () => Promise.reject(new Error("spz loader disabled"));
export default { loadSpz };
