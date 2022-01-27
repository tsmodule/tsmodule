#!/usr/bin/env tsm

import test from "ava";

const a = "hello world";
console.log({ a });

import { resolve } from "../../src/loader";
(async () => {
  console.log(
    await resolve(
      "../commands/build.js",
      {
        parentURL: "file:///home/christian/PersonalProjects/tsm/src/loader/index.ts",
        conditions: [ "node", "import", "node-addons" ]
      },
      async (url) => await import(url),
    )
  );

  test("Should not fail", (t) => t.pass());
})();