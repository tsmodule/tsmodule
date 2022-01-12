#!/usr/bin/env tsm

import { build, BuildOptions } from 'esbuild'
import { readFile } from 'fs/promises';

const pkg = JSON.parse(await readFile('package.json', 'utf-8'));

const defaultOptions: BuildOptions = {
	logLevel: 'info',
	charset: 'utf8',
	minify: true,
	define: {
		VERSION: JSON.stringify(pkg.version)
	}
};

const buildCjsAndEsm = async (entry: string, outDir: string) => {
	const options: BuildOptions = {
		...defaultOptions,
		entryPoints: [entry],
		outdir: outDir,
	};
	/**
	 * Build ESM.
	 */
	await build(options);
	/**
	 * Build CJS.
	 */
	await build({
		...options,
		format: 'cjs',
		outExtension: {
			'.js': '.cjs'
		}
	});
}

try {
	/**
	 * Build this file as a bootstrap script.
	 */

	await build({
		...defaultOptions,
		entryPoints: ['scripts/build.ts'],
		outfile: 'scripts/bootstrap.js'
	});

	/**
	 * CJS + ESM versions of utils.
	 */

	await buildCjsAndEsm('src/utils.ts', 'dist/');

	/**
	 * Build package.json entry points.
	 */

	await build({
		...defaultOptions,
		entryPoints: ['src/bin.ts'],
		outfile: pkg.bin,
	});

	await build({
		...defaultOptions,
		entryPoints: ['src/require.ts'],
		outfile: pkg.exports['.'].require,
	});

	await build({
		...defaultOptions,
		entryPoints: ['src/loader.ts'],
		outfile: pkg.exports['.'].import,
	});

} catch (err: any) {
	console.error(err.stack || err);
	process.exitCode = 1;
}
