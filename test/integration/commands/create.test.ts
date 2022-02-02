import test from "ava";

import { resolve } from "path";
import { shell } from "await-shell";
import { tmpdir } from "os";

process.chdir(tmpdir());
await shell("yarn link @tsmodule/tsmodule");

test.serial("`create` should generate TS module package", async (t) => {
  t.timeout(120_000);

  await shell("tsmodule create test-module");
  t.pass();
});

test.serial("created module package should build", async (t) => {
  t.timeout(120_000);
  process.chdir(resolve(tmpdir(), "test-module"));

  await shell("tsmodule build");
  t.pass();
});