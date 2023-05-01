import { Plugin } from "esbuild";

/**
 * Marks imports like ./a, ./b, ../c, etc. as external.
 */
export const relativeExternsPlugin: Plugin = {
  name: "relative-externs",
  setup(build) {
    build.onResolve(
      {
        filter: /^\.\.?\/?/,
      },
      ({ path, importer }) => {
        /**
         * Do not mark relative imports within node_modules dependencies as
         * external; they need to be inlined.
         */
        if (importer.includes("node_modules")) {
          return null;
        }
        /**
         * Mark relative imports as external.
         */
        return { path, external: true };
      }
    );
  }
};

/**
 * Marks CSS files external.
 */
// export const cssExternsPlugin: Plugin = {
//   name: "css-externs",
//   setup(build) {
//     build.onResolve(
//       {
//         filter: /^\.\.?\/?.+\.css/,
//       },
//       ({ path }) => {
//         /**
//          * Mark relative imports as external.
//          */
//         return { path, external: true };
//       }
//     );
//   }
// };