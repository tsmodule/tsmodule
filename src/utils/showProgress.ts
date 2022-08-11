import ora from "ora";

interface ProgressMessages {
  start: string;
  success: string;
  error: string;
}

/**
 * Displays your `info` message to the user, calls a function, then shows the
 * relevant `success` or `error` message when the promise resolves.
 */
export const showProgress = async (
  fn: () => unknown | Promise<unknown>,
  messages: ProgressMessages,
) => {
  const progress = ora(messages.start);

  try {
    await fn();
    progress.succeed(messages.success);
  } catch (e) {
    progress.fail(messages.error);
    throw e;
  }
};