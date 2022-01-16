import { fileURLToPath, pathToFileURL, URL } from "url";
import { promises as fs } from "fs";
import { transform } from "esbuild";

import type { Inspect, ModuleLoader, ModuleResolver, Transform } from "./types";
import { extname, isAbsolute, join, normalize, resolve as resolvePath } from "path";

import { sep as posixSep } from "path/posix";
import { sep as winSep } from "path/win32";

/**
 * TODO: Version the loader independently so it can be used for bootstrapping.
 * Until then, there's no way around manually specifying full specifiers in
 * internal source (for bootstrap code path).
 */
import { checkExtensions, checkTsExtensions, debugLog, fileExists, isJS, isTS, MODULE_LOADERS } from "../utils/index.js";

export const resolve: ModuleResolver = async (
  specifier,
  context,
  defaultResolve
) => {
  const { parentURL: importedFromURL } = context;

  debugLog(
    "[tsm: resolve]",
    "Resolving specifier.",
    { importedFromURL, specifier }
  );

  /**
   * Do not resolved named modules like `chalk`.
   */
  if (!specifier.startsWith(".") && !isAbsolute(specifier)) {
    debugLog(
      "[tsm: resolve]", 
      "Using defaultResolve for named module.",
      { specifier }
    );

    return defaultResolve(specifier, context, defaultResolve);
  }

  const { href: cwdURL } = pathToFileURL(process.cwd());
  const { href: baseURL } = new URL(importedFromURL || cwdURL);

  debugLog(
    "[tsm: resolve]", 
    "Finding import URL for", 
    { specifier, baseURL }
  );

  /**
   * Resolve specifier from a relative or incomplete specifier to a file URL.
   */
  let importedFileURL = specifier;
  if (!specifier.startsWith("file://")) {
    if (!isAbsolute(specifier)) {
      debugLog(
        "[tsm: resolve]",
        "Setting import URL relative to baseURL."
      );

      importedFileURL = new URL(specifier, baseURL).href;
    } else {
      debugLog(
        "[tsm: resolve]", 
        "Setting import URL to absolute specifier."
      );

      importedFileURL = pathToFileURL(resolvePath(normalize(specifier))).href;
    }
    debugLog(
      "[tsm: resolve]", 
      "Resolved import URL.", 
      { importURL: importedFileURL }
    );
  }
  
  const parentExtension = extname(importedFromURL ?? "").toLowerCase();
  const specifierExtension = extname(importedFileURL).toLowerCase();

  debugLog({
    cwdURL, importedFromURL, importURL: importedFileURL, 
    parentExtension, specifierExtension
  });

  if (specifierExtension) {
    const unresolvedSpecifier = 
      importedFileURL.substring(
        0, importedFileURL.lastIndexOf(specifierExtension)
      );

    /**
     * JS being imported by a TS file.
     */
    if (isJS.test(specifierExtension) && isTS.test(parentExtension)) {
      const resolvedTsSourceFile = checkTsExtensions(unresolvedSpecifier);
      if (resolvedTsSourceFile) {
        debugLog(
          "[tsm: resolve]",
          "Found JS import in TS.", 
          { unresolvedSpecifier, resolvedTsSourceFile }
        );
        return { url: resolvedTsSourceFile };
      }
    }
    /**
     * Resolve to the specifier if the file exists or there is no parent URL.
     */
    if (fileExists(unresolvedSpecifier)) {
      debugLog(
        "[tsm: resolve]",
        "Found file at unresolved specifier", 
        { unresolvedSpecifier }
      );
      return { url: unresolvedSpecifier };
    }
    /**
     * Otherwise, we have an absolute file that does not exist, and should defer
     * to defaultResolve.
     */
    return defaultResolve(specifier, context, defaultResolve);
  }
  /**
   * Resolve TypeScript's bare import syntax.
   */
  debugLog(
    "[tsm: resolve]", 
    "Resolving incomplete URL import to file.", 
    { specifier }
  );
  /**
   * Check for valid file extensions first.
   */
  const resolvedFile = checkExtensions(importedFileURL);
  if (resolvedFile) {
    debugLog(
      "[tsm: resolve]",
      "Resolved import URL to file.", 
      { resolvedFile }
    );

    return { url: resolvedFile };
  }
  /**
   * If none found, try to resolve an index file.
   */
  const resolvedIndexFile = checkExtensions(
    new URL(join(importedFileURL, "index")).href,
    // pathToFileURL(resolvePath(fileURLToPath(importedFileURL), "index")).href
  );

  if (resolvedIndexFile) {
    debugLog("Resolved import URL to index file.", { resolvedIndexFile });
    return { url: resolvedIndexFile };
  }

  return defaultResolve(specifier, context, defaultResolve);
};

export const load: ModuleLoader = async (url, context, defaultLoad) => {
  debugLog("[Node.js load]", { url });

  if (!url.includes(winSep) && !url.includes(posixSep)) {
    debugLog("Using defaultLoad for named module.", { url });
    return defaultLoad(url, context, defaultLoad);
  }

  const extension = extname(url);
  const options = MODULE_LOADERS[extension];
  if (!options) {
    debugLog("No loader found, using defaultLoad.", { url });
    return defaultLoad(url, context, defaultLoad);
  }

  const path = fileURLToPath(url);
  const source = await fs.readFile(path);

  const result = await transform(
    source.toString(), {
      ...options,
      sourcefile: path,
      format: "esm",
    }
  );

  return { format: "module", source: result.code };
};

/**
 * @deprecated As of Node 17.
 */
export const getFormat: Inspect = async (url, context, defaultGetFormat) => {
  debugLog("[Node.js getFormat]", { url });

  const extension = extname(url);
  const options = MODULE_LOADERS[extension];

  if (!options) {
    debugLog("No loader found, using default format.", { url });
    return defaultGetFormat(url, context, defaultGetFormat);
  }

  return { format: "module" };
};

/**
 * @deprecated As of Node 17.
 */
export const transformSource: Transform = async (
  source, 
  context, 
  defaultTransformSource
) => {
  debugLog("[Node.js transformSource]", { context });

  const { url } = context;
  const extension = extname(url);
  const options = MODULE_LOADERS[extension];

  if (!options) {
    debugLog("No loader found, using default transformer.", { url });
    return defaultTransformSource(source, context, defaultTransformSource);
  }

  const result = await transform(
    source.toString(), {
      ...options,
      sourcefile: context.url,
      format: context.format === "module" ? "esm" : "cjs",
    }
  );

  return { source: result.code };
};
