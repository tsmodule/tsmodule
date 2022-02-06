import { URL, fileURLToPath } from "url";
import { promises as fs } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";

export const sleep = async (ms = 5000) => await new Promise(
  (resolvePromise) => setTimeout(resolvePromise, ms)
);

export const getTestDir = (testName: string) => resolve(tmpdir(), testName);

export const createTestAssets = async (testName: string) => {
  const testDir = getTestDir(testName);
  await fs.mkdir(resolve(testDir, "src/path/to/assets"), { recursive: true });
  /**
   * Create CSS and image files.
   */
  await fs.writeFile(
    resolve(testDir, "src/index.css"),
    "body { color: red; }"
  );

  await fs.copyFile(
    fileURLToPath(new URL("../../assets/tsmodule.png", import.meta.url)),
    resolve(testDir, "src/path/to/assets/tsmodule.png")
  );
};

export const createTestDir = async (testName: string) => {
  const testDir = getTestDir(testName);
  await fs.rm(testDir, { recursive: true, force: true });

  return {
    testName,
    testDir,
  };
};