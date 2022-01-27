#!/usr/bin/env tsm

import test from "ava";

import { resolve } from "../../src/loader";
(async () => {
  const { url } = await resolve(
    "../commands/build.js",
    {
      parentURL: "file:///home/christian/PersonalProjects/tsm/src/loader/index.ts",
      conditions: [ "node", "import", "node-addons" ]
    },
    async (url) => await import(url),
  );

  test("should resolve TS back to JS", (t) => {
    if (url.endsWith(".ts")) {
      t.pass();
    }
  });
})();