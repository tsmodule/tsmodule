import { createDebugLogger, log } from "create-debug-logger";
import type { Stream } from "stream";
import chalk from "chalk";
import { readFileSync } from "fs";

function streamToPromise(stream: Stream) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];

    function onData(chunk: Buffer) {
      chunks.push(chunk);
    }

    function onEnd() {
      unbind();
      resolve(Buffer.concat(chunks));
    }

    function onError(error: unknown) {
      unbind();
      reject(error);
    }

    function unbind() {
      stream.removeListener("data", onData);
      stream.removeListener("end", onEnd);
      stream.removeListener("error", onError);
    }

    stream.on("data", onData);
    stream.on("end", onEnd);
    stream.on("error", onError);
  });
}


export const readStdin = async (): Promise<string> => {
  const DEBUG = createDebugLogger(readStdin);
  DEBUG.log("Reading stdin");

  try {
    const stdin = readFileSync(0).toString();
    if (stdin) {
      DEBUG.log("Found stdin", { stdin });
      return stdin;
    }
  } catch (e) {
    DEBUG.log("Could not read stdin", { e });
  }

  log(chalk.gray("Type your source code. Press Ctrl+D to finish."));
  const stdinBuffer = await streamToPromise(process.stdin);
  return stdinBuffer.toString();
};