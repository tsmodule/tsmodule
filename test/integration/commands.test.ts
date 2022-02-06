import test from "ava";

import { existsSync, promises as fs } from "fs";
import { fileURLToPath, URL } from "url";
import { createShell } from "await-shell";
import { resolve } from "path";
import { tmpdir } from "os";

const testModuleDir = resolve(tmpdir(), "test-module");

await fs.rm(testModuleDir, { recursive: true, force: true });
const shell = createShell();

test.serial("[create] should generate TS module package", async (t) => {
  /**
   * Create the test TS module.
   */
  process.chdir(tmpdir());
  await shell.run("tsmodule create test-module");

  /**
   * `tsmodule create` adds a `@tsmodule/tsmodule` dependency, so re-link it.
   */
  process.chdir(testModuleDir);
  await shell.run("yarn link @tsmodule/tsmodule");

  t.pass();
});

test.serial("[dev] should watch for file changes", async (t) => {
  process.chdir(testModuleDir);

  await Promise.allSettled([
    shell.run("tsmodule dev"),
    (async () => {
      const testFile = resolve(testModuleDir, "src/index.ts");
      await fs.writeFile(
        testFile,
        "export const hello = 'world';"
      );

      await new Promise((resolve) => setTimeout(resolve, 10000));

      const emittedDevFile = resolve(testModuleDir, "dist/index.js");
      const emittedDevModule = await fs.readFile(emittedDevFile, "utf-8");

      t.snapshot(emittedDevModule);
      shell.kill();
    })(),
  ]);

  t.pass();
});

test.serial("[dev] should notice new file", async (t) => {
  process.chdir(testModuleDir);

  await Promise.allSettled([
    shell.run("tsmodule dev"),
    (async () => {
      const testFile = resolve(testModuleDir, "src/path/to/newFile.ts");
      await fs.mkdir(resolve(testModuleDir, "src/path/to"), { recursive: true });
      await fs.writeFile(
        testFile,
        "export const abc = 123;"
      );

      await new Promise((resolve) => setTimeout(resolve, 5000));

      const emittedDevFile = resolve(testModuleDir, "dist/path/to/newFile.js");
      const emittedDevModule = await fs.readFile(emittedDevFile, "utf-8");

      t.snapshot(emittedDevModule);
      shell.kill();
    })(),
  ]);

  t.pass();
});

test.serial("[build] created module package should build", async (t) => {
  process.chdir(testModuleDir);
  await shell.run("tsmodule build");

  const emittedFile = resolve(testModuleDir, "dist/index.js");
  const emittedModule = await fs.readFile(emittedFile, "utf-8");

  t.snapshot(emittedModule);
});

test.serial("[build] built module should execute", async (t) => {
  process.chdir(testModuleDir);
  await shell.run("node dist/index.js");

  t.pass();
});

const createTestAssets = async () => {
  await fs.mkdir(resolve(testModuleDir, "src/path/to/assets"), { recursive: true });
  /**
   * Create CSS and image files.
   */
  await Promise.all([
    fs.writeFile(
      resolve(testModuleDir, "src/index.css"),
      "body { color: red; }"
    ),
    fs.copyFile(
      fileURLToPath(new URL("../../assets/tsmodule.png", import.meta.url)),
      resolve(testModuleDir, "src/path/to/assets/tsmodule.png")
    )
  ]);
};

const cleanTestDir = async () => await fs.rm(
  testModuleDir,
  { recursive: true, force: true }
);

test.serial("[build] should copy non-source files to dist/", async (t) => {
  process.chdir(testModuleDir);
  await createTestAssets();
  await shell.run("tsmodule build");

  t.assert(existsSync(resolve(testModuleDir, "dist/index.css")));
  t.assert(existsSync(resolve(testModuleDir, "dist/path/to/assets/tsmodule.png")));
  t.snapshot(await fs.readFile(resolve(testModuleDir, "dist/index.css"), "utf-8"));
});

test.serial("[dev] should copy new non-source files to dist/", async (t) => {
  await fs.rmdir(resolve(testModuleDir, "dist"), { recursive: true });

  process.chdir(testModuleDir);
  await Promise.allSettled([
    shell.run("tsmodule dev"),
    (async () => {
      t.assert(!existsSync(resolve(testModuleDir, "dist/index.css")));
      t.assert(!existsSync(resolve(testModuleDir, "dist/path/to/assets/tsmodule.png")));

      await new Promise((resolve) => setTimeout(resolve, 2000));
      await createTestAssets();

      t.assert(existsSync(resolve(testModuleDir, "dist/index.css")));
      t.assert(existsSync(resolve(testModuleDir, "dist/path/to/assets/tsmodule.png")));
      t.snapshot(await fs.readFile(resolve(testModuleDir, "dist/index.css"), "utf-8"));

      shell.kill();
    })(),
  ]);
});

test.serial("[create --react] should create Next.js component library", async (t) => {
  process.chdir(tmpdir());
  await cleanTestDir();
  await shell.run("tsmodule create test-module --react");

  const pkgJson = await fs.readFile(resolve(testModuleDir, "package.json"), "utf-8");
  const dependencies = JSON.parse(pkgJson).dependencies;
  console.log({ dependencies });
  
  await shell.run("yarn why react");
  if (process.platform === "win32") process.exit(1);

  if (
    !("react" in dependencies) ||
    !("react-dom" in dependencies)
  ) {
    t.fail();
  }

  t.pass();
});

test.serial("[create --react] library should build and execute", async (t) => {
  process.chdir(testModuleDir);
  await shell.run("tsmodule build && node dist/index.js");
  t.pass();
});

test.serial("[create --react] library should build with Next", async (t) => {
  process.chdir(testModuleDir);
  await shell.run(`yarn --cwd ${testModuleDir} build`);
  t.pass();
});