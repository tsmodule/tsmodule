import fs from "fs/promises";
import { resolve } from "path";

export const rewritePkgJson = async (projectName: string) => {
  const packageJsonPath = resolve(process.cwd(), projectName, "package.json");
  const packageJsonFile = await fs.readFile(packageJsonPath, "utf-8");
  const packageJson = JSON.parse(packageJsonFile);

  packageJson.name = projectName;
  await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
};