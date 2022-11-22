import { build } from "../../dist/index.js";
import { createShell } from "universal-shell";
import test from "ava";

process.chdir("test/integration/resolve");
const shell = createShell();

test.serial("loader should load test module", async (t) => {
  await shell.run("tsmodule src/index.ts");
  t.pass();
});

test.serial("build should compile test module", async (t) => {
  await build({ dev: true });
  t.pass();
});

test.serial("built test module should work correctly", async (t) => {
  await shell.run("node ./dist/index.js");
  t.pass();
});