import { PACKAGE_ROOT } from "../../../constants";
import { createShell } from "await-shell";
import { resolve } from "path";

export const copyTemplate = async (template: string, projectName: string) => {
  const shell = createShell();
  const templatePath = resolve(PACKAGE_ROOT, `./templates/${template}`);
  const projectPath = resolve(projectName);

  await shell.run(`cp -rf ${templatePath} ${projectPath}`);
};