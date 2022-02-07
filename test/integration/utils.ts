import { URL, fileURLToPath } from "url";
import { promises as fs } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";

export const sleep = async (ms = 10000) => {
  await new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
};

export const getTestDir = (testName: string) => resolve(tmpdir(), testName);

export const createTestAssets = async (testName: string) => {
  const testDir = getTestDir(testName);
  await fs.mkdir(resolve(testDir, "src/path/to/assets"), { recursive: true });
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
};

export const cleanTestDir = async (testName: string) => {
  await sleep(5000);
  const testDir = getTestDir(testName);

  await fs.rm(
    testDir,
    { recursive: true, force: true }
  );

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