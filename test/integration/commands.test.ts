import test from "ava";

import { killShell, shell } from "await-shell";
import { existsSync, promises as fs } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { fileURLToPath, URL } from "url";

const testModuleDir = resolve(tmpdir(), "test-module");

await fs.rm(testModuleDir, { recursive: true, force: true });

test.serial("[create] should generate TS module package", async (t) => {
  process.chdir(tmpdir());

  /**
   * Create the test TS module.
   */
  await shell(`cd ${tmpdir()} && tsmodule create test-module`);

  /**
   * `tsmodule create` adds a `@tsmodule/tsmodule` dependency, so re-link it.
   */
  await shell(`cd ${testModuleDir} && yarn link @tsmodule/tsmodule`);

  t.pass();
});

test.serial("[dev] should watch for file changes", async (t) => {
  process.chdir(testModuleDir);

  await Promise.allSettled([
    shell(`cd ${testModuleDir} && tsmodule dev`),
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
      killShell();
    })(),
  ]);

  t.pass();
});

test.serial("[dev] should notice new file", async (t) => {
  process.chdir(testModuleDir);

  await Promise.allSettled([
    shell(`cd ${testModuleDir} && tsmodule dev`),
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
      killShell();
    })(),
  ]);

  t.pass();
});

test.serial("[build] created module package should build", async (t) => {
  process.chdir(testModuleDir);
  await shell(`cd ${testModuleDir} && tsmodule build`);

  const emittedFile = resolve(testModuleDir, "dist/index.js");
  const emittedModule = await fs.readFile(emittedFile, "utf-8");

  t.snapshot(emittedModule);
});

test.serial("[build] built module should execute", async (t) => {
  process.chdir(testModuleDir);
  await shell(`cd ${testModuleDir} && node dist/index.js`);

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

test.serial("[build] should copy non-source files to dist/", async (t) => {
  await createTestAssets();
  await shell(`cd ${testModuleDir} && tsmodule build`);

  t.assert(existsSync(resolve(testModuleDir, "dist/index.css")));
  t.assert(existsSync(resolve(testModuleDir, "dist/path/to/assets/tsmodule.png")));

  t.snapshot(await fs.readFile(resolve(testModuleDir, "dist/index.css"), "utf-8"));
  t.snapshot(await fs.readFile(resolve(testModuleDir, "dist/path/to/assets/tsmodule.png"), "utf-8"));
});