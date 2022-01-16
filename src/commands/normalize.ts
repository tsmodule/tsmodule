import { createDebugLogger } from "../utils/index.js";
import glob from "fast-glob";
import { rewriteImportSpecifiersPlugin } from "./build.js";
import { rollup } from "rollup";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore No types available for this plugin.
import shebang from "rollup-plugin-preserve-shebang";

/**
 * Rewrite imports in the emitted JS to ESM-compliant paths.
 */
export const normalizeImportSpecifiers = async (files = "dist/**/*.js") => {
  const DEBUG = createDebugLogger(normalizeImportSpecifiers);
  const filesToNormalize = await glob(files);
  DEBUG.log("Normalizing import/require specifiers:", { filesToNormalize });

  for (const file of filesToNormalize) {
    DEBUG.log("Normalizing specifiers:", { file });

    const build = await rollup({
      input: file,
      plugins: [
        /**
         * Leave #!/usr/bin/env shebangs.
         */
        shebang(),
        /**
         * Rewrite import specifiers using the internal loader.
         */
        rewriteImportSpecifiersPlugin()
      ],
      /**
       * Mark all imports other than this entry point as external in order to
       * prevent Rollup from bundling named modules.
       */
      external: (id: string) => id !== file,
      /**
       * Suppress warnings about empty modules.
       */
      onwarn: () => void 0,
    });
    /**
     * Write the spec-compliant ES module output.
     */
    await build.write({
      file,
      format: "esm",
    });
  }
};