import { dirname } from 'path';
import { fileURLToPath } from 'url';

const url = new URL('loader.mjs', import.meta.url)
console.log(url.href);
