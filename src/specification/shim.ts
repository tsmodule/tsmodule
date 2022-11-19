/**
 * @fileoverview
 *
 * This is a shim which ensures CJS Node globals are polyfilled in an ESM
 * context. This is necessary because some dependencies may include these
 * references and it is necessary to ensure they point to the current runtime
 * location.
 */
/**
 * @license *
 * Copyright 2022 C. Lewis

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
 */

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