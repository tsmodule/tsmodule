import { Plugin } from "esbuild";
import { readFile } from "fs/promises";

export const ESM_REQUIRE_SHIM = `
/** __ESM_SHIM_START */
if(typeof process<"u"){let{dirname:e}=await import("path"),{fileURLToPath:i}=await import("url");globalThis.__filename=i(import.meta.url),globalThis.__dirname=e(globalThis.__filename);let{default:a}=await import("module");globalThis.require=a.createRequire(import.meta.url)}
/** __ESM_SHIM_END */
`;

export const removeEsmShim: Plugin = {
  name: "removeEsmShim",
  setup(build) {
    if (build.initialOptions.format !== "cjs") return;

    /**
     * For any .js files we load, if we find the __ESM_SHIM__ comment at the
     * top, we remove the block of text.
     */
    build.onLoad({ filter: /\.js$/ }, async ({ path }) => {
      const contents = await readFile(path, "utf8");
      if (contents.startsWith(ESM_REQUIRE_SHIM)) {
        return {
          contents: contents.slice(ESM_REQUIRE_SHIM.length),
          loader: "js",
        };
      }
    });
  },
};
