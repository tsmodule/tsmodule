import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { posix as path } from "path";
import { sep } from "path";

export const DEVELOPMENT_MODE = process.env.NODE_ENV === "development";

export const isTs = /\.[mc]?tsx?(?=\?|$)/;
export const isJs = /\.([mc])?js$/;
export const isTsxOrJsx = /\.([mc])?[tj]sx$/;
export const isJsOrTs = /\.([mc])?[tj]sx?$/;

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
export const normalizeSpecifier = (specifier: string) => {
  return specifier.split(sep).join(path.sep);
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