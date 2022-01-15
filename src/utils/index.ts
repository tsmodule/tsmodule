import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { sep as posixSep } from "path/posix";
import { sep } from "path";

export const debugLog = (...msgs: unknown[]) => {
  if (process.env.NODE_ENV === "development") {
    console.log("\n", ...msgs);
  }
};

export const log = (...msgs: unknown[]) => {
  console.log("\n", ...msgs);
};

export const isTS = /\.[mc]?tsx?(?=\?|$)/;
export const isJS = /\.([mc])?js$/;

export const BASE_CONFIG = {
  format: "esm",
  charset: "utf8",
  sourcemap: "inline",
  target: "node16",
  minify: false,
};

export type ModuleLoaders = {
  [extension: string]: {
    [configKey: string]: unknown;
  };
};

export const MODULE_LOADERS: ModuleLoaders = {
  ".mts": { ...BASE_CONFIG, loader: "ts" },
  ".jsx": { ...BASE_CONFIG, loader: "jsx" },
  ".tsx": { ...BASE_CONFIG, loader: "tsx" },
  ".cts": { ...BASE_CONFIG, loader: "ts" },
  ".ts": { ...BASE_CONFIG, loader: "ts" },
  ".json": { ...BASE_CONFIG, loader: "json" },
};

export const POSSIBLE_EXTENSIONS = Object.keys(MODULE_LOADERS);

/**
 * Force a Unix-like path.
 */
export const forceUnixPath = (path: string) => {
  return path.split(sep).join(posixSep);
};

export const fileExists = (fileUrl: string): string | void => {
  const tmp = fileURLToPath(fileUrl);
  if (existsSync(tmp)) {
    return fileUrl;
  }
};

export const fileExistsAny = (fileUrls: string[]): string | void => {
  for (const fileUrl of fileUrls) {
    if (fileExists(fileUrl)) {
      return fileUrl;
    }
  }
};

export const checkTsExtensions = (specifier: string) => {
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

export const checkJsExtension = (specifier: string) => {
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

export const checkExtensions = (specifier: string) => {
  const jsMatch = checkJsExtension(specifier);
  if (jsMatch) return jsMatch;

  const tsMatch = checkTsExtensions(specifier);
  if (tsMatch) return tsMatch;
};