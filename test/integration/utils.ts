import { URL, fileURLToPath } from "url";
import { existsSync, promises as fs } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";

/**
 * Sleep for a given number of ms (default 1000ms).
 */
export const sleep = async (ms = 1000) => {
  await new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
};

export const getTestDir = (testName: string) => resolve(tmpdir(), testName);

export const createTestAssets = async (testName: string) => {
  const testDir = getTestDir(testName);
  await sleep();

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

  await sleep();
};

export const cleanTestDir = async (testName: string) => {
  await sleep();
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