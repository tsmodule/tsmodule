import test from "ava";

import { createTestDir, createTestAssets, cleanTestDir, sleep, safeMkdir, safeWriteFile, safeReadFile } from "./utils";
import { existsSync, promises as fs } from "fs";
import { createShell } from "await-shell";
import { resolve } from "path";
import { tmpdir } from "os";

const { testName, testDir } = await createTestDir("test-module");
const shell = createShell();

test.serial("[create] should generate TS module package", async (t) => {
  /**
   * Create the test TS module.
   */
  process.chdir(tmpdir());
  await shell.run(`tsmodule create ${testName}`);

  /**
   * `tsmodule create` adds a `@tsmodule/tsmodule` dependency, so re-link it.
   */
  process.chdir(testDir);
  await shell.run("yarn link @tsmodule/tsmodule");

  t.pass();
});

test.serial("[dev] should copy new non-source files to dist/", async (t) => {
  process.chdir(testDir);

  const srcAssets = resolve(testDir, "src/path/to/assets");
  await safeMkdir(srcAssets);

  await Promise.allSettled([
    shell.run("tsmodule dev"),
    (async () => {
      await createTestAssets(testName);
      await sleep();
      await shell.kill();
    })(),
  ]);

  const emittedPng = resolve(testDir, "dist/path/to/assets/tsmodule.png");
  const emittedCss = await safeReadFile(resolve(testDir, "dist/index.css"));

  t.assert(
    existsSync(emittedPng),
    "should copy src/path/to/assets/tsmodule.png to dist/"
  );

  t.snapshot(
    emittedCss,
    "should copy src/index.css to dist/"
  );
});

test.serial("[dev] should watch for file changes", async (t) => {
  process.chdir(testDir);

  await Promise.allSettled([
    shell.run("tsmodule dev"),
    (async () => {
      const testFile = resolve(testDir, "src/index.ts");

      await sleep();
      await safeWriteFile(
        testFile,
        "export const hello = 'world';"
      );
      await sleep();
      await shell.kill();

      const emittedDevFile = resolve(testDir, "dist/index.js");
      const emittedDevModule = await safeReadFile(emittedDevFile);

      t.snapshot(emittedDevModule);
    })(),
  ]);

  t.pass();
});

test.serial("[dev] should notice new file", async (t) => {
  process.chdir(testDir);

  await Promise.allSettled([
    shell.run("tsmodule dev"),
    (async () => {
      const testFile = resolve(testDir, "src/path/to/newFile.ts");
      await safeMkdir(resolve(testDir, "src/path/to"));

      await sleep();
      await safeWriteFile(
        testFile,
        "export const abc = 123;"
      );
      await sleep();
      await shell.kill();

      const emittedDevFile = resolve(testDir, "dist/path/to/newFile.js");
      const emittedDevModule = await safeReadFile(emittedDevFile);

      t.snapshot(emittedDevModule);
    })(),
  ]);

  t.pass();
});

test.serial("[build] created module package should build", async (t) => {
  process.chdir(testDir);
  await shell.run("tsmodule build -f");

  const emittedFile = resolve(testDir, "dist/index.js");
  const emittedModule = await safeReadFile(emittedFile);

  t.snapshot(emittedModule);
});

test.serial("[build] built module should execute", async (t) => {
  process.chdir(testDir);
  await shell.run("node dist/index.js");

  t.pass();
});

test.serial("[build] should copy non-source files to dist/", async (t) => {
  process.chdir(testDir);
  await createTestAssets(testName);
  await shell.run("tsmodule build -f");

  t.assert(existsSync(resolve(testDir, "dist/index.css")));
  t.assert(existsSync(resolve(testDir, "dist/path/to/assets/tsmodule.png")));
  t.snapshot(await safeReadFile(resolve(testDir, "dist/index.css")));
});

test.serial("[create --react] should create Next.js component library", async (t) => {
  process.chdir(tmpdir());
  await cleanTestDir(testName);
  await shell.run(`tsmodule create --react ${testName}`);

  const pkgJson = await safeReadFile(resolve(testDir, "package.json"));
  const { dependencies } = JSON.parse(pkgJson);

  t.assert("react" in dependencies, "should add react dependency");
  t.assert("react-dom" in dependencies, "should add react-dom dependency");
});

test.serial("[create --react] library should build and execute", async (t) => {
  process.chdir(testDir);
  await shell.run("tsmodule build && node dist/index.js");
  t.pass();
});

test.serial("[create --react] library should build with Next", async (t) => {
  process.chdir(testDir);
  /**
   * Some kind of React hook issue on Windows. Unrelated to shell logic,
   * refactored entire library and issue persists.
   */
  if (process.platform !== "win32") {
    await shell.run("yarn build");
  }
  t.pass();
});