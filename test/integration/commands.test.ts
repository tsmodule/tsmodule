/* eslint-disable no-console */
import test from "ava";

import { createShell, Shell } from "await-shell";
import { createTestAssets, cleanTestDir, sleep } from "./utils";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { build } from "../../src/commands/build";
import { resolve } from "path";
import { EOL, tmpdir } from "os";

const readTextFile = (file: string) => {
  return readFileSync(file, "utf-8");
};

const mkdirp = (dir: string) => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
};

const { testName: devTest, testDir: devTestDir } = await cleanTestDir("test-dev");
const { testName: fullBuildTest, testDir: fullBuildTestDir } = await cleanTestDir("test-full-build");
const { testName: buildTest, testDir: buildTestDir } = await cleanTestDir("test-build");
const { testName: reactTest, testDir: reactTestDir } = await cleanTestDir("test-react");

test.before("[create] should create all template types", async () => {
  if (process.env.SKIP_TEST_SETUP) {
    return;
  }

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
  } catch (e) {
    console.log({ e });
  }
};

test("[dev] should copy new non-source files to dist/", async (t) => {
  process.chdir(devTestDir);
  const shell = createShell();

  await Promise.all([
    dev(shell),
    (async () => {
      createTestAssets(devTestDir);
      console.log("Created test assets.");
      await sleep(2500);
      shell.kill();
    })(),
  ]);

  const emittedPng = resolve(devTestDir, "dist/path/to/assets/tsmodule.png");
  const emittedCss = readTextFile(resolve(devTestDir, "dist/index.css"));

  t.assert(
    existsSync(emittedPng),
    "should copy test PNG to dist/"
  );

  t.snapshot(
    emittedCss,
    "should copy src/index.css to dist/"
  );
});

test("[dev] should watch for file changes", async (t) => {
  process.chdir(devTestDir);
  const shell = createShell();

  await Promise.allSettled([
    dev(shell),
    (async () => {
      const testFile = resolve(devTestDir, "src/update.ts");

      await sleep(2500);
      writeFileSync(
        testFile,
        "export const hello = 'world';"
      );
      await sleep(2500);
      shell.kill();
    })(),
  ]);

  const emittedDevFile = resolve(devTestDir, "dist/update.js");
  const emittedDevModule = readTextFile(emittedDevFile);

  t.snapshot(emittedDevModule);
});

test("[dev] should notice new file", async (t) => {
  process.chdir(devTestDir);
  const shell = createShell();

  await Promise.allSettled([
    dev(shell),
    (async () => {
      const testFile = resolve(devTestDir, "src/path/to/newFile.ts");
      mkdirp(resolve(devTestDir, "src/path/to"));

      await sleep(2500);
      writeFileSync(
        testFile,
        "export const abc = 123;"
      );
      await sleep(2500);
      shell.kill();

      const emittedDevFile = resolve(devTestDir, "dist/path/to/newFile.js");
      const emittedDevModule = readTextFile(emittedDevFile);

      t.snapshot(emittedDevModule);
    })(),
  ]);

  t.pass();
});

test("[build -b] should bundle dependencies", async (t) => {
  const shell = createShell();

  writeFileSync(
    resolve(buildTestDir, "src/bundle-a.ts"),
    "import { b } from \"./bundle-b\";\nconsole.log(b);"
  );

  writeFileSync(
    resolve(buildTestDir, "src/bundle-b.ts"),
    "export const b = 42;"
  );

  process.chdir(buildTestDir);
  await t.notThrowsAsync(
    async () => await shell.run("tsmodule build -b"),
    "should bundle non-React projects"
  );

  t.is(
    readTextFile(resolve(buildTestDir, "dist/bundle-a.js")),
    `console.log(42);${EOL}`,
    "should inline dependencies in emitted bundles"
  );

  process.chdir(reactTestDir);
  await t.notThrowsAsync(
    async () => await shell.run("tsmodule build -b"),
    "should bundle React projects"
  );

  const loadComponent = async () => await import(resolve(reactTestDir, "dist/pages/index.js"));
  await t.notThrowsAsync(loadComponent, "bundled component modules should load");

  const { default: bundledComponent } = await loadComponent();
  t.snapshot(bundledComponent(), "bundled component should render");
});

const stdin = "import { test } from \"./stdin-import\";\nconsole.log(test);";
const writeStdinDep = () =>
  writeFileSync(resolve(buildTestDir, "src/stdin-import.ts"), "export const test = 42;");

test("[build --no-write] should return transformed code", async (t) => {
  process.chdir(buildTestDir);
  let code;

  writeStdinDep();

  await t.notThrowsAsync(
    async () => {
      code = await build({
        stdin,
        stdinFile: "src/stdin-nowrite.ts",
        noWrite: true,
      });
    },
    "[--no-write] should return transformed code"
  );

  t.snapshot(code, "transformed code should match snapshot");
});

test.serial("[build] command", async (t) => {
  process.chdir(fullBuildTestDir);
  const shell = createShell();

  await t.notThrowsAsync(
    async () => await shell.run("tsmodule build && node dist/index.js"),
    "should build and execute"
  );

  await sleep();

  const emittedFile = resolve(fullBuildTestDir, "dist/index.js");
  const emittedModule = readTextFile(emittedFile);

  t.snapshot(emittedModule, "emitted module should match snapshot");

  process.chdir(reactTestDir);
  await t.notThrowsAsync(
    async () => await shell.run("tsmodule build"),
    "[react] should build"
  );

  t.snapshot(
    readTextFile(resolve(reactTestDir, "dist/styles.css")),
    "[react] should build production CSS to dist/styles.css"
  );
});

test.serial("[create --react] should create Next.js component library", async (t) => {
  process.chdir(reactTestDir);
  // const shell = createShell();

  const pkgJson = readTextFile(resolve(reactTestDir, "package.json"));
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

test.serial("[build -r] should copy non-source files to dist/", async (t) => {
  process.chdir(fullBuildTestDir);
  const shell = createShell();

  createTestAssets(fullBuildTest);
  await sleep(2500);
  await shell.run("tsmodule build -r");

  t.assert(existsSync(resolve(fullBuildTestDir, "dist/path/to/assets/tsmodule.png")));
  t.snapshot(readTextFile(resolve(fullBuildTestDir, "dist/index.css")));
  t.snapshot(readTextFile(resolve(fullBuildTestDir, "dist/index.css")));
});

test.serial("[build --stdin] should build source provided via stdin", async (t) => {
  process.chdir(buildTestDir);
  const shell = createShell();

  writeStdinDep();

  await t.notThrowsAsync(
    async () => await build({
      stdin,
      stdinFile: "src/stdin-nobundle.ts",
    }),
    "[non-bundle] should build source provided programmatically via { stdin } arg"
  );

  await t.notThrowsAsync(
    async () => await build({
      stdin,
      stdinFile: "src/stdin-bundle.ts",
      bundle: true,
    }),
    "[bundle] should build source provided programmatically via { stdin } arg"
  );

  t.snapshot(
    readTextFile(resolve(buildTestDir, "dist/stdin-nobundle.js")),
    "[non-bundle] emitted stdin bundle should match snapshot"
  );

  t.snapshot(
    readTextFile(resolve(buildTestDir, "dist/stdin-bundle.js")),
    "[bundle] emitted stdin bundle should match snapshot"
  );

  if (process.platform !== "win32") {
    await t.notThrowsAsync(
      async () => {
        await shell.run("echo \"console.log(42)\" | tsmodule build --stdin --stdin-file src/stdin-pipe.ts");
      }
    );

    t.snapshot(
      readTextFile(resolve(buildTestDir, "dist/stdin-pipe.js")),
      "[pipe] emitted stdin bundle should match snapshot"
    );
  }
});