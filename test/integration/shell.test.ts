import { shell } from "@ctjlewis/await-shell";
import test from "ava";

test("Testing", async (t) => {
  await shell("echo test");
  t.pass();
});