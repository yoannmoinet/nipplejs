// Unless explicitly stated otherwise all files in this repository are licensed under the MIT License.
// This product includes software developed at Datadog (https://www.datadoghq.com/).
// Copyright 2019-Present Datadog, Inc.
import { mkdir, rm } from '@nipple/core/helpers';
import { dim } from '@nipple/tools/helpers';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import fs from 'fs';
import path from 'path';
import esbuild from 'rollup-plugin-esbuild';
import type { RollupOptions, RollupOutput } from 'rollup';

type BundlerConfig = {
    workingDir: string;
    outDir: string;
    entry: { [name: string]: string };
    plugins?: any[];
};

const configRollup = (config: BundlerConfig): RollupOptions => {
    // Rollup doesn't have a working dir option.
    // So we change the entry name to include the working dir.
    const input: RollupOptions['input'] = {};
    for (const [name, entry] of Object.entries(config.entry)) {
        input[name] = path.resolve(config.workingDir, entry);
    }

    return {
        input,
        plugins: [esbuild(), commonjs(), nodeResolve({ preferBuiltins: true, browser: true })],
        onwarn: (warning, handler) => {
            if (
                !/Circular dependency:/.test(warning.message) &&
                !/Sourcemap is likely to be incorrect/.test(warning.message)
            ) {
                return handler(warning);
            }
        },
        output: {
            chunkFileNames: 'chunk.[hash].js',
            compact: false,
            dir: config.outDir,
            entryFileNames: '[name].js',
            sourcemap: true,
        },
    };
};

const buildWithRollup = async (config: BundlerConfig) => {
    const bundlerConfig = configRollup(config);
    const { rollup } = await import('rollup');
    const errors = [];
    let results: RollupOutput[] | undefined;

    try {
        const result = await rollup(bundlerConfig);

        // Write out the results.
        if (bundlerConfig.output) {
            const outputProms = [];
            const outputOptions = Array.isArray(bundlerConfig.output)
                ? bundlerConfig.output
                : [bundlerConfig.output];
            for (const outputOption of outputOptions) {
                outputProms.push(result.write(outputOption));
            }

            results = await Promise.all(outputProms);
        }
    } catch (e: any) {
        errors.push(`[ROLLUP] : ${e.message}`);
    }

    return { errors, result: results };
};

// Build a given project with a given bundler.
const buildProject = async (cwd: string) => {
    const buildConfig = {
        workingDir: cwd,
        entry: { main: './index.js' },
        outDir: path.resolve(cwd, './dist'),
        plugins: [],
    };

    return buildWithRollup(buildConfig);
};

// Wrapper around the buildProjectWithBundlers function.
//   - Create the destination folder.
//   - Copy the content of the source folder in it.
//   - Build the project with all the requested bundlers.
//   - Delete the folder if the build failed.
//   - Touch a "built" file if the build succeeded.
const handleBuild = async (source: string, destination: string) => {
    // Create the project dir.
    await mkdir(destination);
    // Copy the content of our project in it.
    await fs.promises.cp(`${source}/`, `${destination}/`, {
        recursive: true,
        errorOnExist: true,
        force: true,
    });

    // Build it with all the requested bundlers.
    const name = destination.split(path.sep).pop() || 'unknown';
    const buildProjectPfx = `  [${dim(name)}] `;
    console.time(buildProjectPfx);
    const { errors } = await buildProject(destination);

    if (errors.length) {
        console.error(`${buildProjectPfx}Build failed.`, errors);
        // Delete the folder, so other tests can try and build it.
        await rm(destination);
    } else {
        // Touch the built file so other tests know it's ready.
        await fs.promises.writeFile(`${destination}/built`, '');
    }

    console.timeEnd(buildProjectPfx);
};

// Wait for the build to be done or to fail.
// Based on the presence of the "built" file or the disparition of the project folder.
const waitForBuild = async (projectDir: string): Promise<{ built: boolean; error: boolean }> => {
    return new Promise((resolve) => {
        const builtInterval = setInterval(() => {
            if (fs.existsSync(`${projectDir}/built`)) {
                clearInterval(builtInterval);
                clearInterval(errorInterval);
                resolve({ built: true, error: false });
            }
        }, 100);

        const errorInterval = setInterval(() => {
            if (!fs.existsSync(projectDir)) {
                clearInterval(errorInterval);
                clearInterval(builtInterval);
                resolve({ built: false, error: true });
            }
        }, 100);
    });
};

// Verify if the project has been built.
// Trigger the build if it's not been done yet.
// Wait for the build to be done.
// Note: This is to be used in a beforeAll hook,
// so all the workers can use the same build of a given suite.
export const verifyProjectBuild = async (source: string, destination: string) => {
    // Wait a random time to avoid conflicts.
    await new Promise<void>((resolve) => setTimeout(resolve, Math.floor(Math.random() * 500)));

    // Verify if the build as started, by checking the presence of the public directory.
    const dirExists = fs.existsSync(destination);
    if (dirExists) {
        const result = await waitForBuild(destination);
        if (result.error) {
            await verifyProjectBuild(source, destination);
        }
    } else {
        // Build the project.
        await handleBuild(source, destination);
    }
};
