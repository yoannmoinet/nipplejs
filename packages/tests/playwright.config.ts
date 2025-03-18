// Unless explicitly stated otherwise all files in this repository are licensed under the MIT License.
// This product includes software developed at Datadog (https://www.datadoghq.com/).
// Copyright 2019-Present Datadog, Inc.

import { DEV_SERVER_PORT, DEV_SERVER_URL, PUBLIC_DIR } from '@nipple/tests/_playwright/constants';
import type { TestOptions } from '@nipple/tests/_playwright/testParams';
import { ROOT } from '@nipple/tools/constants';
import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig<TestOptions>({
    testDir: './src/e2e',
    testMatch: '**/*.e2e.ts',
    /* Run tests in files in parallel */
    fullyParallel: true,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: process.env.CI ? 'html' : 'list',
    /* Path to file run before all the tests. See https://playwright.dev/docs/test-global-setup-teardown */
    globalSetup: require.resolve('./src/_playwright/globalSetup.ts'),
    use: {
        trace: 'retain-on-failure',
    },
    timeout: 20_000,
    /* Configure projects for each bundler */
    // TODO Also build and test for ESM.
    projects: [
        {
            name: `chrome`,
            use: {
                ...devices['Desktop Chrome'],
            },
        },
        // {
        //     name: `firefox`,
        //     use: {
        //         ...devices['Desktop Firefox'],
        //     },
        // },
        // {
        //     name: `edge`,
        //     use: {
        //         ...devices['Desktop Edge'],
        //     },
        // },
        // {
        //     name: `safari`,
        //     use: {
        //         ...devices['Desktop Safari'],
        //     },
        // },
    ],

    /* Run your local dev server before starting the tests */
    webServer: {
        command: `yarn cli dev-server --root=${PUBLIC_DIR} --port=${DEV_SERVER_PORT}`,
        cwd: ROOT,
        url: DEV_SERVER_URL,
        reuseExistingServer: !process.env.CI,
    },
});
