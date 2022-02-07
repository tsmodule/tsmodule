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
const { testName: devTest, testDir: devTestDir } = await cleanTestDir("test-react");
const { testName: buildTest, testDir: buildTestDir } = await cleanTestDir("test-react");
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

  for (const dirToCopyInto of [devTestDir]) {
    const copy = process.platform === "win32" ? "xcopy /E /Y" : "cp -r";
    await shell.run(`${copy} ${defaultTestDir} ${dirToCopyInto}`);
  }
});

// test.serial("[create] should generate TS module package", async (t) => {
//   /**
//    * Create the test TS module.
//    */
//   process.chdir(tmpdir());
//   await shell.run(`tsmodule create ${defaultTest}`);

//   /**
//    * `tsmodule create` adds a `@tsmodule/tsmodule` dependency, so re-link it.
//    */
//   process.chdir(defaultTestDir);
//   await shell.run("yarn link @tsmodule/tsmodule");

//   t.pass();
// });

test.serial("[dev] should copy new non-source files to dist/", async (t) => {
  process.chdir(defaultTestDir);

  const srcAssets = resolve(defaultTestDir, "src/path/to/assets");
  mkdirp(srcAssets);

  await Promise.allSettled([
    shell.run("tsmodule dev"),
    (async () => {
      await createTestAssets(defaultTest);
      await sleep(5000);
      shell.kill();
    })(),
  ]);

  const emittedPng = resolve(defaultTestDir, "dist/path/to/assets/tsmodule.png");
  const emittedCss = readFileSync(resolve(defaultTestDir, "dist/index.css"), "utf-8");

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
  process.chdir(defaultTestDir);

  await Promise.allSettled([
    shell.run("tsmodule dev"),
    (async () => {
      const testFile = resolve(defaultTestDir, "src/index.ts");

      await sleep(5000);
      writeFileSync(
        testFile,
        "export const hello = 'world';"
      );
      await sleep(5000);
      shell.kill();

      const emittedDevFile = resolve(defaultTestDir, "dist/index.js");
      const emittedDevModule = readFileSync(emittedDevFile, "utf-8");

      t.snapshot(emittedDevModule);
    })(),
  ]);

  t.pass();
});

test.serial("[dev] should notice new file", async (t) => {
  process.chdir(defaultTestDir);

  await Promise.allSettled([
    shell.run("tsmodule dev"),
    (async () => {
      const testFile = resolve(defaultTestDir, "src/path/to/newFile.ts");
      mkdirp(resolve(defaultTestDir, "src/path/to"));

      await sleep(5000);
      writeFileSync(
        testFile,
        "export const abc = 123;"
      );
      await sleep(5000);
      shell.kill();

      const emittedDevFile = resolve(defaultTestDir, "dist/path/to/newFile.js");
      const emittedDevModule = readFileSync(emittedDevFile, "utf-8");

      t.snapshot(emittedDevModule);
    })(),
  ]);

  t.pass();
});

test.serial("[build] created module package should build", async (t) => {
  process.chdir(defaultTestDir);
  await shell.run("tsmodule build -f");

  const emittedFile = resolve(defaultTestDir, "dist/index.js");
  const emittedModule = readFileSync(emittedFile, "utf-8");

  t.snapshot(emittedModule);
});

test.serial("[build] built module should execute", async (t) => {
  process.chdir(defaultTestDir);
  await shell.run("node dist/index.js");

  t.pass();
});

test.serial("[build] should copy non-source files to dist/", async (t) => {
  process.chdir(defaultTestDir);
  await createTestAssets(defaultTest);
  await shell.run("tsmodule build -f");

  t.assert(existsSync(resolve(defaultTestDir, "dist/index.css")));
  t.assert(existsSync(resolve(defaultTestDir, "dist/path/to/assets/tsmodule.png")));
  t.snapshot(readFileSync(resolve(defaultTestDir, "dist/index.css"), "utf-8"));
});

test.serial("[create --react] should create Next.js component library", async (t) => {
  process.chdir(tmpdir());
  await cleanTestDir(defaultTest);
  await shell.run(`tsmodule create --react ${defaultTest}`);

  const pkgJson = readFileSync(resolve(defaultTestDir, "package.json"), "utf-8");
  const { dependencies } = JSON.parse(pkgJson);

  t.assert("react" in dependencies, "should add react dependency");
  t.assert("react-dom" in dependencies, "should add react-dom dependency");
});

test.serial("[create --react] library should build and execute", async (t) => {
  process.chdir(defaultTestDir);
  await shell.run("tsmodule build && node dist/index.js");
  t.pass();
});

test.serial("[create --react] library should build with Next", async (t) => {
  if (process.platform === "win32") {
    t.pass();
    return;
  }

  process.chdir(defaultTestDir);
  await shell.run("yarn build");
  t.pass();
});