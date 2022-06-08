export const NewCommandTypes = ["component", "feature", "fix", "refactor"] as const;
export type NewCommandType = typeof NewCommandTypes[number];

import { createShell } from "await-shell";
import { errorLog } from "../../utils/log";
import prompts from "prompts";

export const newCommand = async () => {
  const shell = createShell();

  const { stdout: gitStatus } = await shell.run("git status --short");
  if (gitStatus.trim()) {
    errorLog("Cannot create a new feature with a dirty workspace.", true);
  }

  const { type } = await prompts({
    type: "select",
    name: "type",
    message: "What are you creating?",
    choices: [
      { title: "Component", value: "component" },
      { title: "Feature", value: "feature" },
      { title: "Fix", value: "fix" },
      { title: "Refactor", value: "refactor" },
    ],
  });

  if (!type) {
    errorLog("No type selected.", true);
  }

  const { name } = await prompts({
    type: "text",
    name: "name",
    message: `What's the name of the new ${type}?`,
    validate: (value: string) => /[^A-Za-z\-_]/.test(value) ? "Alphanumeric and -_ only" : true
  });

  if (!name) {
    errorLog("No name selected", true);
  }

  // eslint-disable-next-line no-console
  console.log({ type, name });
};