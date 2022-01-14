export const debugLog = (...msgs: unknown[]) => {
  if (process.env.NODE_ENV === "development") {
    console.log("\n", ...msgs);
  }
};

export const log = (...msgs: unknown[]) => {
  console.log("\n", ...msgs);
};