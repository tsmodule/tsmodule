import { shell } from "@ctjlewis/await-shell";
import test from "ava";

test.before("building resolution test with tsm", async () => {
  await shell("cd ./test/integration/resolve && tsm build");
});

test("test module should load correctly", async (t) => {
  await shell("tsm ./test/integration/resolve/src/index.ts");
  t.pass();
});

test("test module should build correctly", async (t) => {
  await shell("node ./test/integration/resolve/dist/index.js");
  t.pass();
});