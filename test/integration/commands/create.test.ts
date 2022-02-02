import test from "ava";

import { resolve } from "path";
import { shell } from "await-shell";
import { tmpdir } from "os";

process.chdir(tmpdir());
await shell("yarn link @tsmodule/tsm");

test.serial("`create` should generate TS module package", async (t) => {
  t.timeout(20000);

  await shell("tsm create test-module");
  t.pass();
});

test.serial("created module package should build", async (t) => {
  t.timeout(20000);
  process.chdir(resolve(tmpdir(), "test-module"));

  await shell("tsm build");
  t.pass();
});