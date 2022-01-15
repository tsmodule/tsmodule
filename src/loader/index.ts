import { existsSync, promises as fs } from "fs";
import { fileURLToPath, pathToFileURL, URL } from "url";
import { transform } from "esbuild";

import type { Inspect, ModuleLoader, ModuleResolver, Transform } from "./types";
import { extname, isAbsolute, normalize, resolve as resolvePath, sep } from "path";

import { sep as posixSep } from "path/posix";
import { sep as winSep } from "path/win32";

/**
 * TODO: Version the loader independently so it can be used for bootstrapping.
 * Until then, there's no way around manually specifying full specifiers in
 * internal source (for bootstrap code path).
 */
import { debugLog } from "../utils/log.js";

const isTS = /\.[mc]?tsx?(?=\?|$)/;
const isJS = /\.([mc])?js$/;

const BASE_CONFIG = {
  format: "esm",
  charset: "utf8",
  sourcemap: "inline",
  target: "node16",
  minify: false,
};
interface ModuleLoaders {
  [extension: string]: {
    [configKey: string]: unknown;
  };
}

const MODULE_LOADERS: ModuleLoaders = {
  ".mts": { ...BASE_CONFIG, loader: "ts" },
  ".jsx": { ...BASE_CONFIG, loader: "jsx" },
  ".tsx": { ...BASE_CONFIG, loader: "tsx" },
  ".cts": { ...BASE_CONFIG, loader: "ts" },
  ".ts": { ...BASE_CONFIG, loader: "ts" },
  ".json": { ...BASE_CONFIG, loader: "json" },
};

/**
 * Force a Unix-like path.
 */
export const forceUnixPath = (path: string) => {
  return path.split(sep).join(posixSep);
};

const fileExists = (fileUrl: string): string | void => {
  const tmp = fileURLToPath(fileUrl);
  if (existsSync(tmp)) {
    return fileUrl;
  }
};

const fileExistsAny = (fileUrls: string[]): string | void => {
  for (const fileUrl of fileUrls) {
    if (fileExists(fileUrl)) {
      return fileUrl;
    }
  }
};

const POSSIBLE_EXTENSIONS = [
  ".mts",
  ".jsx",
  ".tsx",
  ".cts",
  ".ts",
  ".json",
];

const checkTsExtensions = (specifier: string) => {
  const possibleExtensions =
    POSSIBLE_EXTENSIONS
      .filter((extension) => extension.includes("ts"))
      .concat([".js"]);

  return fileExistsAny(
    possibleExtensions.map(
      (extension) => specifier + extension,
    )
  );
};

const checkJsExtension = (specifier: string) => {
  const possibleExtensions =
    POSSIBLE_EXTENSIONS
      .filter((extension) => extension.includes("js"))
      .concat([".js"]);

  return fileExistsAny(
    possibleExtensions.map(
      (extension) => specifier + extension,
    )
  );
};

const checkExtensions = async (specifier: string) => {
  const jsMatch = checkJsExtension(specifier);
  if (jsMatch) return jsMatch;

  const tsMatch = checkTsExtensions(specifier);
  if (tsMatch) return tsMatch;
};

export const resolve: ModuleResolver = async (
  specifier,
  context,
  defaultResolve
) => {
  const { parentURL } = context;
  debugLog("[Node.js resolve]", { parentURL, specifier });
  /**
   * Do not resolved named modules like `chalk`.
   */
  if (!specifier.startsWith("." ) && !isAbsolute(specifier)) {
    debugLog("Use default resolve for named module", { specifier });
    return defaultResolve(specifier, context, defaultResolve);
  }

  const { href: cwdURL } = pathToFileURL(process.cwd());
  const { href: baseURL } = new URL(parentURL || cwdURL);

  debugLog("Before resolution", { specifier, baseURL });

  /**
   * Resolve specifier from a relative or incomplete specifier to a file URL.
   */
  if (!specifier.startsWith("file://")) {
    if (!isAbsolute(specifier)) {
      specifier = new URL(specifier, baseURL).href;
    } else {
      specifier = pathToFileURL(resolvePath(normalize(specifier))).href;
    }
  }

  debugLog("After resolution", { specifier });
  
  const { href: importURL } = new URL(specifier);
  const parentExtension = extname(parentURL ?? "").toLowerCase();
  const specifierExtension = extname(importURL).toLowerCase();

  debugLog({
    specifier, cwdURL, parentURL, importURL, parentExtension, specifierExtension
  });

  /**
   * Resolve TypeScript's bare import syntax.
   */
  if (!specifierExtension) {
    /**
     * Check for valid file extensions first.
     */
    const url = await checkExtensions(importURL);
    if (url) {
      debugLog("Resolved to file", { url });
      return { url };
    }
    /**
     * Then, index resolution.
     */
    const indexUrl = await checkExtensions(
      pathToFileURL(resolvePath(fileURLToPath(importURL), "index")).href
    );
    if (indexUrl) {
      debugLog("Resolved to index file", { indexUrl });
      return { url: indexUrl };
    }
  } else {
    const unresolvedSpecifier = 
      importURL.substring(0, importURL.lastIndexOf(specifierExtension));
    /**
     * JS being imported by a TS file.
     */
    if (isJS.test(specifierExtension) && isTS.test(parentExtension)) {
      const resolvedTsSourceFile = await checkTsExtensions(unresolvedSpecifier);
      if (resolvedTsSourceFile) {
        debugLog(
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
      debugLog("Found file at unresolved specifier", { unresolvedSpecifier });
      return { url: unresolvedSpecifier };
    }
  }

  return defaultResolve(specifier, context, defaultResolve);
};

export const load: ModuleLoader = async (url, context, defaultLoad) => {
  debugLog("[Node.js load]", { url });

  if (!url.includes(winSep) && !url.includes(posixSep)) {
    debugLog("Using default loader for named module", { url });
    return defaultLoad(url, context, defaultLoad);
  }

  const extension = extname(url);
  const options = MODULE_LOADERS[extension];
  if (!options) {
    debugLog("No loader found, using default loader.", { url });
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
  debugLog("[Node.js getFormat]", url);
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
  debugLog("[Node.js transformSource]", context.url);
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
