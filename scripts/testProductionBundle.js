import { createShell } from "await-shell";
import { readFile } from "fs/promises";

const shell = createShell();

const testPackages = [
  "assert",
  "ava",
  "await-shell",
  "debug-logging",
  "fast-glob",
];

const PACKAGE_JSON = JSON.parse(await readFile("package.json", "utf8"));
const productionDeps = [];

for (
  const [dependency, version] of Object.entries(PACKAGE_JSON?.dependencies)
) {
  productionDeps.push(`${dependency}@${version}`);
}

export const testProductionBundle = async () => {
  const testDeps = [
    ...testPackages,
    ...productionDeps,
  ];

  /**
   * Delete all node_modules.
   */
  await shell.run("rm -rf node_modules/");

  /**
   * Use NPM to install packages needed for testing without touching anything.
   */
  await shell.run(`npm install --no-save ${testDeps.join(" ")}`);

  /**
   * Run test.
   */
  await shell.run("yarn test");
};