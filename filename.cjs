const { pathToFileURL } = require('url');

const url = new URL('dist/loader.mjs', pathToFileURL(__filename)).href
console.log(url);
