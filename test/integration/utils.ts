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

export const safeMkdir = async (dir: string) => {
  const created = await fs.mkdir(dir, { recursive: true });
  await sleep();
  return created;
};

export const safeRmdir = async (dir: string) => {
  if (existsSync(dir)) {
    const removed = await fs.rmdir(
      dir,
      { recursive: true }
    );

    await sleep();
    return removed;
  }
};

export const safeWriteFile = async (file: string, content: string) => {
  const written = await fs.writeFile(
    file,
    content
  );

  await sleep();
  return written;
};

export const safeCopyFile = async (from: string, to: string) => {
  const copied = await fs.copyFile(from, to);
  await sleep();
  return copied;
};

export const getTestDir = (testName: string) => resolve(tmpdir(), testName);

export const createTestAssets = async (testName: string) => {
  const testDir = getTestDir(testName);

  /**
   * Create CSS and image files.
   */
  await Promise.all([
    safeWriteFile(
      resolve(testDir, "src/index.css"),
      "body { color: red; }"
    ),
    safeCopyFile(
      fileURLToPath(new URL("../../assets/tsmodule.png", import.meta.url)),
      resolve(testDir, "src/path/to/assets/tsmodule.png")
    )
  ]);

  await sleep();
};

export const cleanTestDir = async (testName: string) => {
  await sleep();
  const testDir = getTestDir(testName);

  await safeRmdir(testDir);

  return {
    testName,
    testDir,
  };
};

export const createTestDir = async (testName: string) => {
  const { testDir } = await cleanTestDir(testName);
  await safeMkdir(testDir);

  return {
    testName,
    testDir,
  };
};