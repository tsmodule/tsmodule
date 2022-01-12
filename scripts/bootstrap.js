/**
 * This is a bootstrap JS version of index.ts in case the local tsm loader
 * breaks.
 */

import { build } from 'esbuild';
import { readFile } from 'fs/promises';

(async function () {
	const pkgJson = await readFile('./package.json', 'utf8');
	const pkg = JSON.parse(pkgJson);
	/**
	 * @type {import('esbuild').BuildOptions}
	 */
	let shared = {
		logLevel: 'info',
		charset: 'utf8',
		minify: true,
		define: {
			VERSION: JSON.stringify(pkg.version)
		}
	};

	await build({
		...shared,
		entryPoints: ['src/utils.ts'],
		outfile: './dist/utils.js',
	});

	await build({
		...shared,
		entryPoints: ['src/bin.ts'],
		outfile: pkg.bin,
	});

	await build({
		...shared,
		entryPoints: ['src/require.ts'],
		outfile: pkg.exports['.'].require,
	});

	await build({
		...shared,
		entryPoints: ['src/loader.ts'],
		outfile: pkg.exports['.'].import,
	});

})().catch(err => {
	console.error(err.stack || err);
	process.exitCode = 1;
});
