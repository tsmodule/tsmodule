import { getPackageJson, writePackageJson } from "../../../utils/pkgJson";
import { resolve } from "path";

export const rewritePkgJson = async (projectName: string) => {
  const projectDir = resolve(process.cwd(), projectName);
  const packageJson = await getPackageJson(projectDir);

  packageJson.name = projectName;
  await writePackageJson(packageJson, projectDir);
};