/**
 * @fileoverview
 *
 * This is a shim which ensures CJS Node globals are polyfilled in an ESM
 * context. This is necessary because some dependencies may include these
 * references and it is necessary to ensure they point to the current runtime
 * location.
 */

if (typeof process !== "undefined") {
  /**
   * Overwrite all identifiers even if they exist already, otherwise they will
   * be inherited from parent contexts and will not point to the correct
   * location.
   */
  const { dirname } = await import("path");
  const { fileURLToPath } = await import("url");

  /**
   * Shim entry-point related paths.
   */
  globalThis.__filename = fileURLToPath(import.meta.url);
  globalThis.__dirname = dirname(globalThis.__filename);

  /**
   * Shim require().
   */
  const { default: module } = await import("module");
  globalThis.require = module.createRequire(import.meta.url);
}

export {};