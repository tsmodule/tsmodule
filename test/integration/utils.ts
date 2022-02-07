import { URL, fileURLToPath } from "url";
import { copyFileSync, existsSync, mkdirSync, promises as fs, rmdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";

/**
 * Sleep for a given number of ms (default 250ms).
 */
export const sleep = async (ms = 1000) => {
  await new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
};

// export const safeMkdir = async (dir: string) => {
//   const created = await fs.mkdir(dir, { recursive: true });
//   await sleep();
//   return created;
// };

// export const safeRmdir = async (dir: string) => {
//   if (existsSync(dir)) {
//     const removed = await fs.rmdir(
//       dir,
//       { recursive: true }
//     );

//     await sleep();
//     return removed;
//   }
// };

// export const safeWriteFile = async (file: string, content: string) => {
//   const written = await fs.writeFile(
//     file,
//     content
//   );

//   await sleep();
//   return written;
// };

// export const safeReadFile = async (file: string) => {
//   const fileContents = await fs.readFile(file, "utf-8");
//   await sleep();
//   return fileContents;
// };

// export const safeCopyFile = async (from: string, to: string) => {
//   const copied = await fs.copyFile(from, to);
//   await sleep();
//   return copied;
// };

export const getTestDir = (testName: string) => resolve(tmpdir(), testName);

export const createTestAssets = async (testName: string) => {
  const testDir = getTestDir(testName);

  writeFileSync(
    resolve(testDir, "src/index.css"),
    "body { color: red; }"
  );

  copyFileSync(
    fileURLToPath(new URL("../../assets/tsmodule.png", import.meta.url)),
    resolve(testDir, "src/path/to/assets/tsmodule.png")
  );
};

export const cleanTestDir = async (testName: string) => {
  await sleep();
  const testDir = getTestDir(testName);

  if (existsSync(testDir)) {
    rmdirSync(testDir, { recursive: true });
  }

  return {
    testName,
    testDir,
  };
};

export const createTestDir = async (testName: string) => {
  const { testDir } = await cleanTestDir(testName);
  mkdirSync(testDir, { recursive: true });

  return {
    testName,
    testDir,
  };
};