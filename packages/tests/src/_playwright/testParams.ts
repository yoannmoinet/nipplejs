import { DEV_SERVER_URL, PUBLIC_DIR } from '@nipple/tests/_playwright/constants';
import { test as base } from '@playwright/test';
import path from 'path';

export type TestOptions = {};

type PageConfig = {
    body?: string;
    css?: string;
    script?: string;
};

type Fixtures = {
    devServerUrl: string;
    publicDir: string;
    suiteName: string;
    pageConfig: PageConfig;
    setupPage: (config?: Partial<PageConfig>) => Promise<void>;
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
                css: `#zone_joystick {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: lightblue;
                }`,
                body: '<div id="zone_joystick"></div>',
                script: path.resolve(PUBLIC_DIR, './src/index.js'),
            });
        },
        { auto: true },
    ],
    setupPage: async ({ page, pageConfig }, use) => {
        await use(async (config?: Partial<PageConfig>) => {
            const mergedConfig = { ...pageConfig, ...config };
            await page.setContent(`
                <!DOCTYPE html>
                <html lang="en">
                    <head>
                        <title>NippleJS Test</title>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    </head>
                    <body>
                        ${mergedConfig.body || ''}
                    </body>
                </html>
            `);

            if (mergedConfig.css) {
                await page.addStyleTag({
                    content: mergedConfig.css,
                });
            }

            if (mergedConfig.script) {
                await page.addScriptTag({
                    path: mergedConfig.script,
                });
            }
        });
    },
});
