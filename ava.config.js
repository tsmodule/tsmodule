export default {
  timeout: "10m",
  files: [
    "test/**/*.test.ts"
  ],
  extensions: {
    "ts": "module"
  },
  workerThreads: false,
  environmentVariables: {
    // "NODE_ENV": "development"
  },
  nodeArguments: [
    "--no-warnings",
    "--loader=@tsmodule/tsmodule/loader"
  ]
};