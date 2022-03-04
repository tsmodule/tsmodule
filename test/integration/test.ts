import { copyFileSync, statSync } from "fs";

console.log(statSync("/home/christian/PersonalProjects/tsmodule/tsmodule.png").isDirectory());
console.log(statSync("/tmp/test-dev/src/path/to/assets/tsmodule.png").isDirectory());

// copyFileSync(
//   "/home/christian/PersonalProjects/tsmodule/tsmodule.png",
//   "/tmp/test-dev/src/path/to/assets/tsmodule.png"
// );