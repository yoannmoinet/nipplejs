// Unless explicitly stated otherwise all files in this repository are licensed under the MIT License.
// This product includes software developed at Datadog (https://www.datadoghq.com/).
// Copyright 2019-Present Datadog, Inc.

import { rm } from '@nipple/core/helpers';
import type { TestOptions } from '@nipple/tests/_playwright/testParams';
import { blue, dim } from '@nipple/tools/helpers';
import type { FullConfig } from '@playwright/test';
import { glob } from 'glob';
import path from 'path';

// TODO Also build and test for ESM.
const globalSetup = async (config: FullConfig<TestOptions>) => {
    const getPfx = (name: string) => `[${blue(name)}] `;
    const getSubPfx = (name: string) => `  ${dim(getPfx(name))}`;
    const globalPfx = getPfx('Global Setup');
    console.time(globalPfx);
    console.log(`${globalPfx}Setting up tests.`);

    // In the CI we're building before the job starts.
    // No need to do it here.
    if (!process.env.CI) {
        // Build the requested bundler plugins.
        const buildPfx = getSubPfx('Build Project');
        console.time(buildPfx);
        console.log(`${buildPfx}Building...`);

        // FIXME: BUILD NIPPLEJS HERE

        console.timeEnd(buildPfx);
    }

    // Delete public dirs.
    const cleanPfx = getSubPfx('Clean');
    console.time(cleanPfx);
    const publicDirs = await glob('public/*/', { cwd: __dirname });
    await Promise.all(publicDirs.map((dir) => rm(path.resolve(__dirname, dir))));
    console.timeEnd(cleanPfx);

    console.timeEnd(globalPfx);
};

export default globalSetup;
