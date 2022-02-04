import { fileURLToPath, URL } from "url";
import { copy } from "fs-extra";
import { resolve } from "path";

export const createTemplate = async (template: string, projectName: string) => {
  const cwd = process.cwd();
  const templateURL = new URL(
    `../../../../templates/${template}`,
    import.meta.url
  );

  await copy(fileURLToPath(templateURL), resolve(cwd, projectName));
};