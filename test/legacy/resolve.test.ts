#!/usr/bin/env tsm
import test from "ava";

import { pathToFileURL } from "url";
import { resolve } from "../../src/loader";
import { resolve as resolvePath } from "path";

test("should resolve to TS files for JS imports in loader mode", async (t) => {
  const testEntry = resolvePath("./src/loader/index.ts");
  const { url } = await resolve(
    "../commands/build/index.js",
    {
      parentURL: pathToFileURL(testEntry).href,
      conditions: [ "node", "import", "node-addons" ]
    },
    async (url) => await import(url),
  );

  if (url.endsWith(".ts")) {
    t.pass();
  }
});