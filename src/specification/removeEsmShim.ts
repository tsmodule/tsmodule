import { Plugin } from "esbuild";
import { readFile } from "fs/promises";

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
      if (contents.startsWith("/** __ESM_SHIM_START */")) {
        const lines = contents.split("\n");
        const end = lines.indexOf("/** __ESM_SHIM_END */");
        lines.splice(0, end + 1);

        console.log({ path, lines });

        return {
          contents: lines.join("\n"),
          loader: "js",
        };
      }
    });

    // Load ".txt" files and return an array of words
    // build.onLoad({ filter: /\.txt$/ }, async (args) => {
    //   const text = await readFile(args.path, "utf8");
    //   return {
    //     contents: JSON.stringify(text.split(/\s+/)),
    //     loader: "js",
    //   };
    // });
  },
};
