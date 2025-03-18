import { PUBLIC_DIR } from '@nipple/tests/_playwright/constants';
import type { TestOptions } from '@nipple/tests/_playwright/testParams';
import { blue, dim } from '@nipple/tools/helpers';
import type { FullConfig } from '@playwright/test';
import fs from 'fs';
import { getDefaultBuildConfigs } from 'nipplejs/rollup.config.mjs';
import path from 'path';
import { rollup } from 'rollup';

const OUTPUT_DIR = path.resolve(PUBLIC_DIR, 'src');

// TODO Also build and test for ESM.
const globalSetup = async (testConfig: FullConfig<TestOptions>) => {
    const getPfx = (name: string) => `[${blue(name)}] `;
    const getSubPfx = (name: string) => `  ${dim(getPfx(name))}`;
    const globalPfx = getPfx('Global Setup');
    console.time(globalPfx);

    // Build nipplejs and copy to public dir
    const buildPfx = getSubPfx('Build Project');
    console.time(buildPfx);

    // Clean previous build.
    await fs.promises.rm(OUTPUT_DIR, { recursive: true, force: true });

    // Build the project.
    const rollupConfig = getDefaultBuildConfigs();
    await Promise.all(
        rollupConfig.map(async (config) => {
            const bundle = await rollup(config);
            const outputs = Array.isArray(config.output) ? config.output : [config.output];

            await Promise.all(
                outputs.map((output) => bundle.write({ ...output, dir: OUTPUT_DIR })),
            );

            await bundle.close();
        }),
    );

    console.timeEnd(buildPfx);
    console.timeEnd(globalPfx);
};

export default globalSetup;
