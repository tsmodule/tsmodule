import type { GetFormatHook as ModuleGetFormatHook, LoadHook as ModuleLoadHook, ResolveHook as ModuleResolveHook, TransformHook as ModuleTransformSourceHook } from "./types";

import { extname, isAbsolute, join, normalize, resolve as resolvePath } from "path";
import { posix as posixPath } from "path";
import { win32 as winPath } from "path";

import { fileURLToPath, pathToFileURL, URL } from "url";
import { readFile } from "fs/promises";
import { transform } from "esbuild";

import { createDebugLogger } from "debug-logging";

/**
 * TODO: Version the loader independently so it can be used for bootstrapping.
 * Until then, there's no way around manually specifying full specifiers in
 * internal source (for bootstrap code path).
 */
import { checkExtensions, checkTsExtensions, fileExists, isJs, isTs, MODULE_LOADERS } from "../utils/resolve.js";

export const resolve: ModuleResolveHook = async (
  specifier,
  context,
  defaultResolve
) => {
  const { parentURL: importedFromURL } = context;
  const DEBUG = createDebugLogger(resolve);

  DEBUG.log("Resolving specifier:", { importedFromURL, specifier });

  /**
   * Do not resolved named modules like `chalk`.
   */
  if (!specifier.startsWith(".") && !isAbsolute(specifier)) {
    DEBUG.log("Using defaultResolve for named module:", { specifier });
    return defaultResolve(specifier, context, defaultResolve);
  }

  const { href: cwdURL } = pathToFileURL(process.cwd());
  const { href: baseURL } = new URL(importedFromURL || cwdURL);

  DEBUG.log("Finding import URL for", { specifier, baseURL });

  /**
   * Resolve specifier from a relative or incomplete specifier to a file URL.
   */
  let importedFileURL = specifier;
  if (!specifier.startsWith("file://")) {
    if (!isAbsolute(specifier)) {
      DEBUG.log("Setting import URL relative to baseURL.");
      importedFileURL = new URL(specifier, baseURL).href;
    } else {
      DEBUG.log("Setting import URL to absolute specifier.");
      importedFileURL = pathToFileURL(resolvePath(normalize(specifier))).href;
    }

    DEBUG.log("Resolved import URL:", { importedFileURL, importedFromURL });
  }

  const parentExtension = extname(importedFromURL ?? "").toLowerCase();
  const specifierExtension = extname(importedFileURL).toLowerCase();

  DEBUG.log(
    "Rewriting file extension:",
    { parentExtension, specifierExtension }
  );

  if (specifierExtension) {
    /**
     * The imported file URL with the file extension removed, to be resolved
     * back to its original source (e.g., TS) with the loader.
     */
    const unresolvedSpecifier =
      importedFileURL.substring(
        0, importedFileURL.lastIndexOf(specifierExtension)
      );

    DEBUG.log("Re-resolving specifier:", { unresolvedSpecifier });

    /**
     * JS being imported by a TS file.
     */
    if (isJs.test(specifierExtension) && isTs.test(parentExtension)) {
      const resolvedTsSourceFile = checkTsExtensions(unresolvedSpecifier);
      if (resolvedTsSourceFile) {
        DEBUG.log("Found JS import in TS:", {
          unresolvedSpecifier,
          resolvedTsSourceFile
        });

        return {
          url: resolvedTsSourceFile,
          shortCircuit: true,
        };
      }
    }
    /**
     * Resolve to the specifier if the file exists or there is no parent URL.
     */
    if (fileExists(unresolvedSpecifier)) {
      DEBUG.log("Found file at unresolved specifier:", { unresolvedSpecifier });
      return {
        url: unresolvedSpecifier,
        shortCircuit: true,
      };
    }
    /**
     * Otherwise, we have an absolute file that does not exist, and should defer
     * to defaultResolve.
     */
    return defaultResolve(specifier, context, defaultResolve);
  }

  DEBUG.log("Resolving incomplete URL import to file:", { specifier });

  /**
   * Check for valid file extensions first.
   */
  const resolvedFile = checkExtensions(importedFileURL);
  if (resolvedFile) {
    DEBUG.log("Resolved import URL to file:", { resolvedFile });
    return {
      url: resolvedFile,
      shortCircuit: true,
    };
  }
  /**
   * If none found, try to resolve an index file.
   */
  const indexFileURL = new URL(join(importedFileURL, "index")).href;
  const resolvedIndexFile = checkExtensions(indexFileURL);

  if (resolvedIndexFile) {
    DEBUG.log("Resolved import URL to index file:", { resolvedIndexFile });
    return {
      url: resolvedIndexFile,
      shortCircuit: true,
    };
  }

  return defaultResolve(specifier, context, defaultResolve);
};

export const load: ModuleLoadHook = async (url, context, defaultLoad) => {
  const DEBUG = createDebugLogger(load);
  DEBUG.log("Loading source file:", { url });

  if (!url.includes(winPath.sep) && !url.includes(posixPath.sep)) {
    DEBUG.log("Using defaultLoad for named module:", { url });
    return defaultLoad(url, context, defaultLoad);
  }

  const extension = extname(url);
  const options = MODULE_LOADERS[extension];
  if (!options) {
    DEBUG.log("No loader found, using defaultLoad:", { url });
    return defaultLoad(url, context, defaultLoad);
  }

  const path = fileURLToPath(url);
  const source = await readFile(path, "utf8");

  const result = await transform(
    source.toString(), {
      ...options,
      sourcefile: path,
      format: "esm",
    }
  );

  return {
    format: "module",
    source: result.code,
    shortCircuit: true,
  };
};

/**
 * @deprecated As of Node 17.
 */
export const getFormat: ModuleGetFormatHook = async (
  url,
  context,
  defaultGetFormat
) => {
  const DEBUG = createDebugLogger(getFormat);
  DEBUG.log("Getting format for source file:", { url });

  const extension = extname(url);
  const options = MODULE_LOADERS[extension];

  if (!options) {
    DEBUG.log("No loader found, using default format:", { url });
    return defaultGetFormat(url, context, defaultGetFormat);
  }

  return { format: "module" };
};

/**
 * @deprecated As of Node 17.
 */
export const transformSource: ModuleTransformSourceHook = async (
  source,
  context,
  defaultTransformSource
) => {
  const DEBUG = createDebugLogger(transformSource);
  DEBUG.log("Transforming source from context:", { context });

  const { url } = context;
  const extension = extname(url);
  const options = MODULE_LOADERS[extension];

  if (!options) {
    DEBUG.log("No loader found, using default transformer:", { url });
    return defaultTransformSource(source, context, defaultTransformSource);
  }

  const result = await transform(
    source.toString(), {
      ...options,
      logLevel: process.env.NODE_ENV === "development" ? "debug" : "info",
      charset: "utf8",
      target: "esnext",
      sourcefile: context.url,
      format: context.format === "module" ? "esm" : "cjs",
    }
  );

  return { source: result.code };
};
