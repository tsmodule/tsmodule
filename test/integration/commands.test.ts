import test from "ava";

import { promises as fs } from "fs";
import { resolve } from "path";
import { shell } from "await-shell";
import { tmpdir } from "os";

const testModuleDir = resolve(tmpdir(), "test-module");

await shell("yarn link @tsmodule/tsmodule");
await fs.rm(testModuleDir, { recursive: true, force: true });

test.serial("[create] should generate TS module package", async (t) => {
  t.timeout(240_000);

  process.chdir(tmpdir());
  await shell(`cd ${tmpdir()} && tsmodule create test-module`);

  /**
   * `tsmodule create` adds a `@tsmodule/tsmodule` dependency, so re-link it in
   * the test module.
   */
  t.pass();
});

test.serial("[create] created module package should build", async (t) => {
  t.timeout(240_000);

  process.chdir(testModuleDir);
  await shell(`cd ${testModuleDir} && tsmodule build`);
  t.pass();
});

// test.serial("[dev] should watch for file changes", async (t) => {
//   t.timeout(240_000);

//   process.chdir(testModuleDir);

//   await Promise.race([
//     shell(`cd ${testModuleDir} && tsmodule dev`),
//     new Promise((resolve) => setTimeout(() => {
//       console.log("RESULT", killShell(2));
//       resolve(true);
//     }, 1_000))
//   ]);

//   t.pass();
// });