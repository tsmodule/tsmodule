import test from "ava";

import { resolve } from "path";
import { rm } from "fs/promises";
import { shell } from "await-shell";
import { tmpdir } from "os";

const testModuleDir = resolve(tmpdir(), "test-module");

await shell("yarn link @tsmodule/tsmodule");
await rm(testModuleDir, { recursive: true, force: true });

test.serial("`create` should generate TS module package", async (t) => {
  t.timeout(120_000);

  await shell(`cd ${tmpdir()} && tsmodule create test-module`);

  /**
   * `tsmodule create` adds a `@tsmodule/tsmodule` dependency, so re-link it in
   * the test module.
   */
  t.pass();
});

test.serial("created module package should build", async (t) => {
  t.timeout(120_000);

  await shell(`cd ${testModuleDir} && tsmodule build`);
  t.pass();
});