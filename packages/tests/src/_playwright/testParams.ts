import { DEV_SERVER_URL, PUBLIC_DIR } from '@nipple/tests/_playwright/constants';
import { test as base } from '@playwright/test';
import path from 'path';

export type TestOptions = {};

type PageConfig = {
    head?: string;
    body?: string;
    css?: string;
};

type Fixtures = {
    devServerUrl: string;
    publicDir: string;
    suiteName: string;
    pageConfig: PageConfig;
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
    pageConfig: [
        // eslint-disable-next-line no-empty-pattern
        async ({}, use) => {
            await use({
                head: '<script src="./src/index.js"></script>',
                body: '<div id="zone_joystick"></div>',
                css: `<style>
                    #zone_joystick {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background-color: lightblue;
                    }
                </style>`,
            });
        },
        { auto: true },
    ],
    page: async ({ page, pageConfig }, use) => {
        await page.setContent(`
            <!DOCTYPE html>
            <html lang="en">
                <head>
                    <title>NippleJS Test</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    ${pageConfig.head || ''}
                    ${pageConfig.css || ''}
                </head>
                <body>
                    ${pageConfig.body || ''}
                </body>
            </html>
        `);
        await use(page);
    },
});
