import { shell } from "@ctjlewis/await-shell";
import test from "ava";

test("Testing", async (t) => {
  await shell(
    "cd ./test/integration/resolve && tsm build",
  );
  
  t.pass();
});