import test from "ava";

import { createTestAssets, cleanTestDir, sleep } from "./utils";
import { createShell, Shell } from "await-shell";
import fs from "fs";
import { dirname, resolve } from "path";
import { tmpdir } from "os";

const mkdirp = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const { testName: devTest, testDir: devTestDir } = await cleanTestDir("test-dev");
const { testName: _, testDir: fullBuildTestDir } = await cleanTestDir("test-full-build");
const { testName: buildTest, testDir: buildTestDir } = await cleanTestDir("test-build");
const { testName: reactTest, testDir: reactTestDir } = await cleanTestDir("test-react");

test.before("[create] should create all template types", async () => {
  const shell = createShell();
  process.chdir(tmpdir());

  /**
   * Install dependencies for tests serially to prevent yarn cache errors.
   */
  await shell.run(`tsmodule create ${devTest}`);
  await shell.run(`tsmodule create --react ${reactTest}`);

  const dirsToCopyDevInto = [buildTestDir, fullBuildTestDir];

  await Promise.all(
    dirsToCopyDevInto.map(async (dirToCopyInto) => {
      const shell = createShell();
      if (process.platform === "win32") {
        await shell.run(`xcopy /E /Y /F /Q ${devTestDir} ${dirToCopyInto}\\`);
      } else {
        await shell.run(`cp -rf ${devTestDir} ${dirToCopyInto}`);
      }
    })
  );

  for (const dirToLink of [
    devTestDir,
    reactTestDir,
    fullBuildTestDir,
    buildTestDir
  ]) {
    process.chdir(dirToLink);
    await shell.run("yarn link @tsmodule/tsmodule");
  }
});

const dev = async (shell: Shell) => {
  try {
    await shell.run(`tsmodule dev ${devTest}`);
  } catch (e) {}
};

test.serial("[dev] should copy new non-source files to dist/", async (t) => {
  process.chdir(devTestDir);
  const shell = createShell();

  await Promise.all([
    dev(shell),
    (async () => {
      await createTestAssets(devTestDir);
      console.log("Created test assets.");
      await sleep(2500);
      shell.kill();
    })(),
  ]);

  const emittedPng = resolve(devTestDir, "dist/path/to/assets/tsmodule.png");
  const emittedCss = fs.readFileSync(resolve(devTestDir, "dist/index.css"), "utf-8");

  t.assert(
    fs.existsSync(emittedPng),
    "should copy test PNG to dist/"
  );

  t.snapshot(
    emittedCss,
    "should copy src/index.css to dist/"
  );
});

test.serial("[dev] should watch for file changes", async (t) => {
  process.chdir(devTestDir);
  const shell = createShell();

  await Promise.allSettled([
    dev(shell),
    (async () => {
      const testFile = resolve(devTestDir, "src/update.ts");

      await sleep(2500);
      fs.writeFileSync(
        testFile,
        "export const hello = 'world';"
      );
      await sleep(2500);
      shell.kill();
    })(),
  ]);

  const emittedDevFile = resolve(devTestDir, "dist/update.js");
  const emittedDevModule = fs.readFileSync(emittedDevFile, "utf-8");

  t.snapshot(emittedDevModule);
});

test.serial("[create --react] should create Next.js component library", async (t) => {
  process.chdir(reactTestDir);
  // const shell = createShell();

  const pkgJson = fs.readFileSync(resolve(reactTestDir, "package.json"), "utf-8");
  const { dependencies } = JSON.parse(pkgJson);

  t.assert("react" in dependencies, "should add react dependency");
  t.assert("react-dom" in dependencies, "should add react-dom dependency");
});

test.serial("[create --react] library should build and execute", async (t) => {
  process.chdir(reactTestDir);
  const shell = createShell();

  await shell.run("tsmodule build && node dist/index.js");
  t.pass();
});

test.serial("[create --react] library should build with Next", async (t) => {
  if (process.platform === "win32") {
    t.pass();
    return;
  }

  process.chdir(reactTestDir);
  const shell = createShell();

  await shell.run("yarn build");
  t.pass();
});

test.serial("[dev] should notice new file", async (t) => {
  process.chdir(devTestDir);
  const shell = createShell();

  await Promise.allSettled([
    dev(shell),
    (async () => {
      const testFile = resolve(devTestDir, "src/path/to/newFile.ts");
      mkdirp(resolve(devTestDir, "src/path/to"));

      await sleep(2500);
      fs.writeFileSync(
        testFile,
        "export const abc = 123;"
      );
      await sleep(2500);
      shell.kill();

      const emittedDevFile = resolve(devTestDir, "dist/path/to/newFile.js");
      const emittedDevModule = fs.readFileSync(emittedDevFile, "utf-8");

      t.snapshot(emittedDevModule);
    })(),
  ]);

  t.pass();
});

test.serial("[build] created module package should build and execute", async (t) => {
  process.chdir(fullBuildTestDir);
  const shell = createShell();

  await shell.run("tsmodule build && node dist/index.js");
  await sleep();

  const emittedFile = resolve(fullBuildTestDir, "dist/index.js");
  const emittedModule = fs.readFileSync(emittedFile, "utf-8");

  t.snapshot(emittedModule);
});

test.serial("[build] should copy non-source files to dist/", async (t) => {
  process.chdir(buildTestDir);
  const shell = createShell();

  await createTestAssets(buildTest);
  await sleep(2500);
  await shell.run("tsmodule build -f");

  t.assert(fs.existsSync(resolve(buildTestDir, "dist/index.css")));
  t.assert(fs.existsSync(resolve(buildTestDir, "dist/path/to/assets/tsmodule.png")));
  t.snapshot(fs.readFileSync(resolve(buildTestDir, "dist/index.css"), "utf-8"));
});