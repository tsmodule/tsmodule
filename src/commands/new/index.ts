export const NewCommandTypes = ["component", "feature", "fix", "refactor"] as const;
export type NewCommandType = typeof NewCommandTypes[number];

import prompts from "prompts";

export const newCommand = async () => {

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
    throw new Error("No type selected");
  }

  const { name } = await prompts({
    type: "text",
    name: "name",
    message: `What's the name of the new ${type}?`,
    validate: (value: string) => /[^A-Za-z\-_]/.test(value) ? "Alphanumeric and -_ only" : true
  });

  if (!name) {
    throw new Error("No name selected");
  }

  // eslint-disable-next-line no-console
  console.log({ type, name });
};