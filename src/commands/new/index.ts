export const NewCommandTypes = ["component", "feature", "fix", "refactor"] as const;
export type NewCommandType = typeof NewCommandTypes[number];

export const newCommand = async (type: typeof NewCommandTypes[number]) => {
  if (!NewCommandTypes.includes(type)) {
    throw new Error(`Unknown new command type: ${type}. Acceptable values: ${NewCommandTypes.join(", ")}`);
  }
  // eslint-disable-next-line no-console
  console.log(`Creating a new ${type}`);
};