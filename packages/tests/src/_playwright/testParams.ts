// Unless explicitly stated otherwise all files in this repository are licensed under the MIT License.
// This product includes software developed at Datadog (https://www.datadoghq.com/).
// Copyright 2019-Present Datadog, Inc.

import { DEV_SERVER_URL, PUBLIC_DIR } from '@nipple/tests/_playwright/constants';
import { test as base } from '@playwright/test';
import path from 'path';

export type TestOptions = {};

type Fixtures = {
    devServerUrl: string;
    publicDir: string;
    suiteName: string;
};

export const test = base.extend<TestOptions & Fixtures>({
    devServerUrl: [
        // eslint-disable-next-line no-empty-pattern
        async ({}, use, info) => {
            const url = info.config.webServer?.url || DEV_SERVER_URL;
            await use(url);
        },
        { auto: true },
    ],
    suiteName: [
        // eslint-disable-next-line no-empty-pattern
        async ({}, use, info) => {
            await use(path.dirname(info.file).split(path.sep).pop() || 'unknown');
        },
        { auto: true },
    ],
    publicDir: PUBLIC_DIR,
});
