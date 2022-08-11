import { createShell } from "await-shell";

const shell = createShell();

const testPackages = [
  "assert",
  "ava",
  "await-shell",
  "debug-logging",
  "fast-glob",
];

/**
 * Build the runtime bundle.
 */
await shell.run("yarn build -r");

/**
 * Delete node_modules, remove the test packages, and re-add them as regular
 * dependencies.
 */
await shell.run("rm -rf node_modules");

let error;

try {
  await shell.run(`yarn remove ${testPackages.join(" ")}`);
  await shell.run(`yarn add --production ${testPackages.join(" ")}`);
  await shell.run("yarn --production");
  await shell.run("yarn ava --no-worker-threads");
} catch (e) {
  error = e;
}

if (!process.env.CI) {
  await shell.run(`yarn remove -f ${testPackages.join(" ")}`);
  await shell.run(`yarn add -D ${testPackages.join(" ")}`);
}

if (error) {
  throw error;
}
