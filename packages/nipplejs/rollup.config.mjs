import commonjs from '@rollup/plugin-commonjs';
import esmShim from '@rollup/plugin-esm-shim';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
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
        index: 'src/index.ts',
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
    const plugins = [terser()];

    // Inject ESM shims to support __dirname and co.
    if (overrides.format === 'esm') {
        plugins.push(esmShim());
    }

    return {
        exports: 'named',
        sourcemap: true,
        entryFileNames: `[name]${path.extname(filename)}`,
        dir: path.dirname(filename),
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
 * @returns {import('rollup').RollupOptions[]}
 */
export const getDefaultBuildConfigs = async () => {
    const configs = [
        // Main bundle.
        bundle({
            plugins: [esbuild()],
            output: [getOutput({ format: 'esm' }), getOutput({ format: 'cjs' })],
        }),
        // Bundle type definitions.
        bundle({
            plugins: [dts()],
            output: {
                dir: path.dirname(packageJson.types),
            },
        }),
    ];
    return configs;
};

export default getDefaultBuildConfigs();
