/**
 * IMPORTANT!
 *
 * If this file is modified, copy the minified output in dist/utils/require.js
 * to the `build` command.
 *
 * {@link ../commands/build/index.ts}
 */

// @ts-ignore - Don't type-check `document`, runs in browser.
if (typeof document === "undefined") {
  await (async () => {
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
  })();
}

export {};