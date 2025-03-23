import { DEV_SERVER_URL, PUBLIC_DIR } from '@nipple/tests/_playwright/constants';
import type { Locator } from '@playwright/test';
import { test as base } from '@playwright/test';
import type Joystick from 'nipplejs/Joystick';
import path from 'path';

export type TestOptions = {};

export type PageConfig = {
    body?: string;
    css?: string;
    script?: string;
    code?: () => void;
};

export type Fixtures = {
    devServerUrl: string;
    publicDir: string;
    suiteName: string;
    pageConfig: PageConfig;
    startJoystick: (position: { x: number; y: number }) => Promise<string>;
    moveJoystick: (
        position: { x: number; y: number },
        cb?: () => void | Promise<void>,
    ) => Promise<void>;
    releaseJoystick: (ctxName: string) => Promise<void>;
    locateJoystick: (collection: number, uid: number) => Locator;
    initPage: () => Promise<void>;
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
    startJoystick: async ({ page }, use) => {
        await use(async (position) => {
            // Listen for the shown events so we can better time our actions.
            // And complete on the rest event.
            const id = Math.random().toString().split('.').pop();
            const ctxName = `moveJoystickEvents_${id}`;
            await page.evaluate(
                (ctx) => {
                    window.context[ctx.name] = [];
                    window.nipplejs.factory.on(`shown`, (evt) => {
                        window.context[ctx.name].push(window.getJoystickUid(evt));
                    });
                },
                { name: ctxName },
            );

            // Move the mouse to the position and press down.
            await page.mouse.move(position.x, position.y);
            await page.mouse.down();
            // Move the mouse a bit.
            await page.mouse.move(position.x + 2, position.y + 2, { steps: 15 });
            await page.mouse.move(position.x - 2, position.y - 2, { steps: 15 });

            // Wait for the joysticks to be shown.
            await page.waitForFunction(
                (ctx) => window.context[ctx.name].length > 0,
                { name: ctxName },
                {
                    timeout: 500,
                },
            );

            return ctxName;
        });
    },
    moveJoystick: async ({ startJoystick, releaseJoystick }, use) => {
        await use(async (position, cb) => {
            // Move the mouse to the position.
            const ctxName = await startJoystick(position);
            if (cb) {
                await cb();
            }
            await releaseJoystick(ctxName);
        });
    },
    releaseJoystick: async ({ page }, use) => {
        await use(async (ctxName) => {
            // Get the list of joysticks that were created.
            const joysticks: string[] = await page.evaluate((ctx) => window.context[ctx.name], {
                name: ctxName,
            });

            // Listen for the released events.
            await page.evaluate(
                (ctx) => {
                    window.context[ctx.name] = [];
                    window.nipplejs.factory.on(`rested`, (evt) => {
                        window.context[ctx.name].push(window.getJoystickUid(evt));
                    });
                },
                { name: ctxName },
            );

            // Release the mouse.
            await page.mouse.up();

            // Wait for the all the joysticks to trigger their rested events.
            await page.waitForFunction(
                (ctx) => {
                    return ctx.joysticks.every((uid) => window.context[ctx.name].includes(uid));
                },
                { joysticks, name: ctxName },
                {
                    timeout: 500,
                },
            );
        });
    },
    locateJoystick: async ({ page }, use) => {
        await use((collection, uid) => {
            // Return the .front element as the parent is not tangibly visible.
            return page.locator(`#joystick_${collection}_${uid} .front`);
        });
    },
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
                code: () => {
                    window.joystick = window.nipplejs.create({
                        zone: document.getElementById('zone_joystick'),
                    });
                },
            });
        },
        { auto: true },
    ],
    initPage: async ({ page }, use) => {
        await use(async () => {
            // Setup the global variables and helpers.
            await page.evaluate(() => {
                window.context = {};
                window.events = [];
                window.directions = [];
                window.getJoystickUid = (evt: { data: Joystick }) =>
                    `${evt.data.collection.uid}_${evt.data.uid}`;
            });
        });
    },
    setupPage: async ({ page, pageConfig, initPage }, use) => {
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

            await initPage();

            if (mergedConfig.code) {
                await page.evaluate(mergedConfig.code);
            }
        });
    },
});
