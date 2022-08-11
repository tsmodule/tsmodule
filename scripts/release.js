import { createShell } from "await-shell";

const shell = createShell();
const version = process.argv[2] ?? "patch";

await shell.run(`npx release-it ${version} --ci -VV`);