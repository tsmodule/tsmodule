import { build } from "../../src/commands/build";
import { shell } from "@ctjlewis/await-shell";
import test from "ava";

process.chdir("test/integration/resolve");

test.serial("loader should load test module", async (t) => {
  await shell("tsm src/index.ts");
  t.pass();
});

test.serial("build should compile test module", async (t) => {
  await build(true);
  t.pass();
});

test.serial("built test module should work correctly", async (t) => {
  await shell("node ./dist/index.js");
  t.pass();
});