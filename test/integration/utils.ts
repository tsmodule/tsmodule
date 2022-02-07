import { URL, fileURLToPath } from "url";
import { existsSync, promises as fs } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";

/**
 * Sleep for a given number of ms (default 1000ms).
 */
export const sleep = async (ms = 10000) => {
  await new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
};

/**
 * Sleep for 5 seconds (5000ms).
 */
export const longSleep = async () => await sleep(5000);

export const getTestDir = (testName: string) => resolve(tmpdir(), testName);

export const createTestAssets = async (testName: string) => {
  const testDir = getTestDir(testName);
  await longSleep();

  /**
   * Create CSS and image files.
   */
  await Promise.all([
    fs.writeFile(
      resolve(testDir, "src/index.css"),
      "body { color: red; }"
    ),
    fs.copyFile(
      fileURLToPath(new URL("../../assets/tsmodule.png", import.meta.url)),
      resolve(testDir, "src/path/to/assets/tsmodule.png")
    )
  ]);

  await longSleep();
};

export const cleanTestDir = async (testName: string) => {
  await longSleep();
  const testDir = getTestDir(testName);

  if (existsSync(testDir)) {
    await fs.rmdir(
      testDir,
      { recursive: true }
    );
  }

  return {
    testName,
    testDir,
  };
};

export const createTestDir = async (testName: string) => {
  const { testDir } = await cleanTestDir(testName);
  await fs.mkdir(testDir, { recursive: true });

  return {
    testName,
    testDir,
  };
};