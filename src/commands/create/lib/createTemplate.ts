import { PACKAGE_ROOT } from "../../../constants";
import { copy } from "fs-extra";
import { resolve } from "path";

export const copyTemplate = async (template: string, projectName: string) => {
  const templatePath = resolve(PACKAGE_ROOT, `./templates/${template}`);
  const projectPath = resolve(projectName);

  await copy(
    templatePath,
    projectPath,
    {
      overwrite: true,
      recursive: true,
    }
  );
};