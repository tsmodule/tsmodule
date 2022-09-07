export default {
  timeout: "10m",
  files: [
    "test/**/*.test.ts"
  ],
  extensions: {
    "ts": "module"
  },
  workerThreads: false,
  nodeArguments: [
    "--no-warnings",
    "--loader=./dist/loader/index.js"
  ]
};