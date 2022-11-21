/**
 * @fileoverview
 *
 * This is a shim which ensures CJS Node globals are polyfilled in an ESM
 * context. This is necessary because some dependencies may include these
 * references and it is necessary to ensure they point to the current runtime
 * location.
 */

if (typeof process !== "undefined") {
  const { dirname } = await import("path");
  const { fileURLToPath } = await import("url");

  /**
   * Shim entry-point related paths.
   */
  if (typeof globalThis.__filename === "undefined") {
    globalThis.__filename = fileURLToPath(import.meta.url);
  }
  if (typeof globalThis.__dirname === "undefined") {
    globalThis.__dirname = dirname(globalThis.__filename);
  }
  /**
   * Shim require if needed.
   */
  if (typeof globalThis.require === "undefined") {
    const { default: module } = await import("module");
    globalThis.require = module.createRequire(import.meta.url);
  }
}

export {};