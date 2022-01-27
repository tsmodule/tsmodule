#!/usr/bin/env tsm

import { resolve } from "../../src/loader";
import test from "ava";

test("should resolve to TS files for JS imports in loader mode", async (t) => {
  const { url } = await resolve(
    "../../src/commands/build.js",
    {
      parentURL: "file:///home/christian/PersonalProjects/tsm/src/loader/index.ts",
      conditions: [ "node", "import", "node-addons" ]
    },
    async (url) => await import(url),
  );

  if (url.endsWith(".ts")) {
    t.pass();
  }
});