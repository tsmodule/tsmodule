import test from "ava";

import { createTestDir, longSleep, createTestAssets, cleanTestDir } from "./utils";
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

test.serial("[dev] should watch for file changes", async (t) => {
  process.chdir(testDir);

  await Promise.allSettled([
    shell.run("tsmodule dev"),
    (async () => {
      const testFile = resolve(testDir, "src/index.ts");
      await fs.writeFile(
        testFile,
        "export const hello = 'world';"
      );

      await longSleep();

      const emittedDevFile = resolve(testDir, "dist/index.js");
      const emittedDevModule = await fs.readFile(emittedDevFile, "utf-8");

      t.snapshot(emittedDevModule);
      shell.kill();
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
      await fs.mkdir(resolve(testDir, "src/path/to"), { recursive: true });
      await fs.writeFile(
        testFile,
        "export const abc = 123;"
      );

      await longSleep();

      const emittedDevFile = resolve(testDir, "dist/path/to/newFile.js");
      const emittedDevModule = await fs.readFile(emittedDevFile, "utf-8");

      t.snapshot(emittedDevModule);
      shell.kill();
    })(),
  ]);

  t.pass();
});

test.serial("[build] created module package should build", async (t) => {
  process.chdir(testDir);
  await shell.run("tsmodule build -f");

  const emittedFile = resolve(testDir, "dist/index.js");
  const emittedModule = await fs.readFile(emittedFile, "utf-8");

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
  t.snapshot(await fs.readFile(resolve(testDir, "dist/index.css"), "utf-8"));
});

test.serial("[create --react] should create Next.js component library", async (t) => {
  process.chdir(tmpdir());
  await cleanTestDir(testName);
  await shell.run(`tsmodule create --react ${testName}`);

  const pkgJson = await fs.readFile(resolve(testDir, "package.json"), "utf-8");
  const dependencies = JSON.parse(pkgJson).dependencies;

  if (
    !("react" in dependencies) ||
    !("react-dom" in dependencies)
  ) {
    t.fail();
  }

  t.pass();
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