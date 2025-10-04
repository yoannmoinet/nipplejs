import commonjs from '@rollup/plugin-commonjs';
import esmShim from '@rollup/plugin-esm-shim';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import fs from 'fs';
import modulePackage from 'module';
import path from 'path';
import dts from 'rollup-plugin-dts';
import esbuild from 'rollup-plugin-esbuild';

import packageJson from './package.json' with { type: 'json' };

/**
 * @param {import('rollup').RollupOptions} config
 * @returns {import('rollup').RollupOptions}
 */
export const bundle = (config) => ({
    input: {
        index: './src/index.ts',
    },
    ...config,
    external: [
        // All peer dependencies are external dependencies.
        ...Object.keys(packageJson.peerDependencies || {}),
        // All dependencies are external dependencies.
        ...Object.keys(packageJson.dependencies || {}),
        // These should be internal only and never be anywhere published.
        '@nipple/tools',
        '@nipple/tests',
        // We never want to include Node.js built-in modules in the bundle.
        ...modulePackage.builtinModules,
        ...(config.external || []),
    ],
    plugins: [json(), commonjs(), nodeResolve({ preferBuiltins: true }), ...(config.plugins || [])],
});

/**
 * @param {Partial<import('rollup').OutputOptions>} overrides
 * @returns {import('rollup').OutputOptions}
 */
const getOutput = (overrides = {}) => {
    const filename = overrides.format === 'esm' ? packageJson.module : packageJson.main;
    const dir = overrides.dir || path.dirname(filename);
    const plugins = [
        terser(),
        // Add a plugin to copy the output files to the e2e public folder too.
        {
            name: 'copy',
            writeBundle() {
                // Ensure the destination directory exists
                const destDir = path.resolve(__dirname, 'e2e/public');
                if (!fs.existsSync(destDir)) {
                    fs.mkdirSync(destDir, { recursive: true });
                }

                // Copy the source files to the destination directory
                fs.cpSync(dir, destDir, {
                    recursive: true,
                    force: true,
                });
            },
        },
    ];

    // Inject ESM shims to support __dirname and co.
    if (overrides.format === 'esm') {
        plugins.push(esmShim());
    }

    return {
        exports: 'named',
        sourcemap: true,
        entryFileNames: `[name]${path.extname(filename)}`,
        dir,
        plugins,
        format: 'cjs',
        globals: {
            globalThis: 'window',
        },
        // No chunks.
        manualChunks: () => '[name]',
        ...overrides,
    };
};

/**
 * @param {import('rollup').RollupOptions} config
 * @returns {import('rollup').RollupOptions[]}
 */
export const getDefaultBuildConfigs = (overrides = {}) => {
    const configs = [
        // Main bundle.
        bundle({
            plugins: [esbuild()],
            output: [getOutput({ format: 'esm' }), getOutput({ format: 'umd', name: 'nipplejs' })],
            ...overrides,
        }),
        // Bundle type definitions.
        bundle({
            plugins: [dts()],
            output: {
                dir: path.dirname(packageJson.types),
            },
            ...overrides,
        }),
    ];
    return configs;
};

export default getDefaultBuildConfigs();
