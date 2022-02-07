import test from "ava";

import { createTestAssets, cleanTestDir, sleep } from "./utils";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { createShell } from "await-shell";
import { resolve } from "path";
import { tmpdir } from "os";

const mkdirp = (dir: string) => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
};

const { testName: defaultTest, testDir: defaultTestDir } = await cleanTestDir("test-module");
const { testName: devTest, testDir: devTestDir } = await cleanTestDir("test-dev");
const { testName: buildTest, testDir: buildTestDir } = await cleanTestDir("test-build");
const { testName: reactTest, testDir: reactTestDir } = await cleanTestDir("test-react");

const shell = createShell();

test.before("[create] should create all template types", async () => {
  process.chdir(tmpdir());

  const defaultShell = createShell();
  const reactShell = createShell();

  await Promise.all([
    defaultShell.run(`tsmodule create ${defaultTest}`),
    reactShell.run(`tsmodule create --react ${reactTest}`),
  ]);

  await Promise.all(
    [devTestDir, buildTestDir].map(async (dirToCopyInto) => {
      const shell = createShell();
      if (process.platform === "win32") {
        await shell.run(`xcopy /E /Y /F /Q ${defaultTestDir} ${dirToCopyInto}\\`);
      } else {
        await shell.run(`cp -rf ${defaultTestDir} ${dirToCopyInto}`);
      }
    })
  );
});

test.serial("[dev] should copy new non-source files to dist/", async (t) => {
  process.chdir(devTestDir);

  const srcAssets = resolve(devTestDir, "src/path/to/assets");
  mkdirp(srcAssets);

  await Promise.allSettled([
    shell.run("tsmodule dev"),
    (async () => {
      await createTestAssets(devTestDir);
      await sleep(5000);
      shell.kill();
    })(),
  ]);

  const emittedPng = resolve(devTestDir, "dist/path/to/assets/tsmodule.png");
  const emittedCss = readFileSync(resolve(devTestDir, "dist/index.css"), "utf-8");

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
  process.chdir(devTestDir);

  await Promise.allSettled([
    shell.run("tsmodule dev"),
    (async () => {
      const testFile = resolve(devTestDir, "src/index.ts");

      await sleep(5000);
      writeFileSync(
        testFile,
        "export const hello = 'world';"
      );
      await sleep(5000);
      shell.kill();

      const emittedDevFile = resolve(devTestDir, "dist/index.js");
      const emittedDevModule = readFileSync(emittedDevFile, "utf-8");

      t.snapshot(emittedDevModule);
    })(),
  ]);

  t.pass();
});

test.serial("[dev] should notice new file", async (t) => {
  process.chdir(devTestDir);

  await Promise.allSettled([
    shell.run("tsmodule dev"),
    (async () => {
      const testFile = resolve(devTestDir, "src/path/to/newFile.ts");
      mkdirp(resolve(devTestDir, "src/path/to"));

      await sleep(5000);
      writeFileSync(
        testFile,
        "export const abc = 123;"
      );
      await sleep(5000);
      shell.kill();

      const emittedDevFile = resolve(devTestDir, "dist/path/to/newFile.js");
      const emittedDevModule = readFileSync(emittedDevFile, "utf-8");

      t.snapshot(emittedDevModule);
    })(),
  ]);

  t.pass();
});

test.serial("[build] created module package should build", async (t) => {
  process.chdir(buildTestDir);
  await shell.run("tsmodule build -f");
  await sleep();

  const emittedFile = resolve(buildTestDir, "dist/index.js");
  const emittedModule = readFileSync(emittedFile, "utf-8");

  t.snapshot(emittedModule);
});

test.serial("[build] built module should execute", async (t) => {
  process.chdir(buildTestDir);
  await shell.run("node dist/index.js");

  t.pass();
});

test.serial("[build] should copy non-source files to dist/", async (t) => {
  process.chdir(buildTestDir);

  await createTestAssets(buildTest);
  await shell.run("tsmodule build -f");

  t.assert(existsSync(resolve(buildTestDir, "dist/index.css")));
  t.assert(existsSync(resolve(buildTestDir, "dist/path/to/assets/tsmodule.png")));
  t.snapshot(readFileSync(resolve(buildTestDir, "dist/index.css"), "utf-8"));
});

test.serial("[create --react] should create Next.js component library", async (t) => {
  process.chdir(reactTestDir);

  const pkgJson = readFileSync(resolve(reactTestDir, "package.json"), "utf-8");
  const { dependencies } = JSON.parse(pkgJson);

  t.assert("react" in dependencies, "should add react dependency");
  t.assert("react-dom" in dependencies, "should add react-dom dependency");
});

test.serial("[create --react] library should build and execute", async (t) => {
  process.chdir(reactTestDir);

  await shell.run("tsmodule build && node dist/index.js");
  t.pass();
});

test.serial("[create --react] library should build with Next", async (t) => {
  if (process.platform === "win32") {
    t.pass();
    return;
  }

  process.chdir(reactTestDir);
  await shell.run("yarn build");
  t.pass();
});