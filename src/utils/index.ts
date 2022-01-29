import { Console } from "console";
import chalk from "chalk";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { sep as posixSep } from "path/posix";
import { sep } from "path";

const debugConsole = new Console({
  stdout: process.stdout,
  stderr: process.stderr,
  groupIndentation: 4,
});

export const DEVELOPMENT_MODE = process.env.NODE_ENV === "development";

// eslint-disable-next-line @typescript-eslint/ban-types
export const createDebugLogger = (fn: Function) => {
  if (process.env.NODE_ENV !== "development") {
    /**
     * Dead path, should get removed after AST compilation.
     */
    return {
      log() { void 0; },
      group() { void 0; },
      groupEnd() { void 0; },
    };
  } else {
    const { name } = fn;
    return {
      log (...logs: unknown[]) {
        formatLog(`[${name}]\n`, ...logs);
      },

      group() {
        debugConsole.log("\n");
        const debugLabel = chalk.bgWhite.gray("[TSM DEBUG]");
        const fnLabel = chalk.bgBlueBright.black(`[${name}]`);
        debugConsole.group(`${debugLabel} ${fnLabel}`);
      },

      groupEnd() {
        debugConsole.log("\n", "-".repeat(20), "\n");
        debugConsole.groupEnd();
      }
    };
  }
};

export const formatLog = (...msgs: unknown[]) => {
  if (!msgs.length) return;

  const thisConsole = DEVELOPMENT_MODE ? debugConsole : console;
  const header = chalk.gray(msgs[0]);
  const logMsgs = msgs.slice(1);

  thisConsole.log("");
  thisConsole.log(header);
  thisConsole.log(...logMsgs);
};

export const debugLog = (...msgs: unknown[]) => {
  if (DEVELOPMENT_MODE) {
    formatLog(...msgs);
  }
};

export const log = (...msgs: unknown[]) => {
  formatLog(...msgs);
};

export const bannerLog = (msg: string) => {
  formatLog(
    chalk.bgBlue(chalk.white(`  ${msg}  `))
  );
};

export const isTs = /\.[mc]?tsx?(?=\?|$)/;
export const isJs = /\.([mc])?js$/;
export const isTsxOrJsx = /\.([mc])?[tj]sx$/;

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
export const normalizeSpecifier = (path: string) => {
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