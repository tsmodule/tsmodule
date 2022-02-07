import test from "ava";

import { createTestDir, createTestAssets, cleanTestDir, sleep } from "./utils";
import { existsSync, mkdirSync, promises as fs, readFileSync, writeFileSync } from "fs";
import { createShell } from "await-shell";
import { resolve } from "path";
import { tmpdir } from "os";

const { testName, testDir } = await createTestDir("test-module");
const shell = createShell();

const mkdirp = (dir: string) => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
};

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
  mkdirp(srcAssets);

  await Promise.allSettled([
    shell.run("tsmodule dev"),
    (async () => {
      await createTestAssets(testName);
      await sleep();
      shell.kill();
    })(),
  ]);

  const emittedPng = resolve(testDir, "dist/path/to/assets/tsmodule.png");
  const emittedCss = readFileSync(resolve(testDir, "dist/index.css"), "utf-8");

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

      await sleep(5000);
      writeFileSync(
        testFile,
        "export const hello = 'world';"
      );
      await sleep(5000);
      shell.kill();

      const emittedDevFile = resolve(testDir, "dist/index.js");
      const emittedDevModule = readFileSync(emittedDevFile, "utf-8");

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
      mkdirp(resolve(testDir, "src/path/to"));

      await sleep(500);
      writeFileSync(
        testFile,
        "export const abc = 123;"
      );
      await sleep();
      shell.kill(500);

      const emittedDevFile = resolve(testDir, "dist/path/to/newFile.js");
      const emittedDevModule = readFileSync(emittedDevFile, "utf-8");

      t.snapshot(emittedDevModule);
    })(),
  ]);

  t.pass();
});

test.serial("[build] created module package should build", async (t) => {
  process.chdir(testDir);
  await shell.run("tsmodule build -f");

  const emittedFile = resolve(testDir, "dist/index.js");
  const emittedModule = readFileSync(emittedFile, "utf-8");

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
  t.snapshot(readFileSync(resolve(testDir, "dist/index.css"), "utf-8"));
});

test.serial("[create --react] should create Next.js component library", async (t) => {
  process.chdir(tmpdir());
  await cleanTestDir(testName);
  await shell.run(`tsmodule create --react ${testName}`);

  const pkgJson = readFileSync(resolve(testDir, "package.json"), "utf-8");
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
  if (process.platform === "win32") {
    t.pass();
    return;
  }

  process.chdir(testDir);
  await shell.run("yarn build");
  t.pass();
});