export const ShipTypes = ["production", "development", "staging"] as const;
export type ShipType = typeof ShipTypes[number];

export const ship = async (branch: typeof ShipTypes[number]) => {
  if (!ShipTypes.includes(branch)) {
    throw new Error(`Unknown ship branch: ${branch}. Acceptable values: ${ShipTypes.join(", ")}`);
  }
  // eslint-disable-next-line no-console
  console.log(branch);
};