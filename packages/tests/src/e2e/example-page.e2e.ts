import { test } from '@nipple/tests/_playwright/testParams';
import type { Locator, Page } from '@playwright/test';
import type { CommonOptions } from 'nipplejs/types';

type Mode = NonNullable<CommonOptions['mode']>;
type Expectation = [number, number, boolean];
// Have a similar experience to Jest.
const { expect, beforeEach, describe } = test;

describe('Example Page', () => {
    beforeEach(async ({ devServerUrl, page }) => {
        await page.goto(`${devServerUrl}/codepen-demo.html`);
    });

    const locateJoystick = (page: Page, collection: number, uid: number): Locator => {
        // Return the .front element as the parent is not tangibly visible.
        return page.locator(`#joystick_${collection}_${uid} .front`);
    };
    // Switch to different zones
    const getZone = async (page: Page, zone: Mode): Promise<Locator> => {
        await page.locator(`.button.${zone}`).click();
        await expect(page.locator(`.zone.${zone}`)).toBeVisible();
        return page.locator(`.zone.active`);
    };

    // Expect a joystick to be visible or not.
    const expectJoystick = async (
        page: Page,
        zone: Locator,
        expectations: Expectation[],
        clickOptions?: { x: number; y: number },
    ) => {
        const box = await zone.boundingBox();
        let joysticks: string[] = [];
        if (box && clickOptions) {
            const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
            const position = { x: center.x + clickOptions.x, y: center.y + clickOptions.y };
            // Listen for the start events so we can wait for the joysticks to be rested at the end.
            await page.evaluate(() => {
                window.events = [];
                window.nipplejs.factory.on(`start`, (evt) => {
                    window.events.push(evt.data.uid.toString());
                });
            });
            // Move the mouse to the position and click.
            await page.mouse.move(position.x, position.y);
            await page.mouse.down();
            // Move the mouse a bit.
            await page.mouse.move(position.x + 10, position.y + 10, { steps: 15 });
            await page.mouse.move(position.x - 10, position.y - 10, { steps: 15 });
            // Get the list of joysticks that were created.
            joysticks = await page.evaluate(() => window.events);
        }

        for (const [collection, joystick, visible] of expectations) {
            if (visible) {
                await expect(locateJoystick(page, collection, joystick)).toBeVisible();
            } else {
                await expect(locateJoystick(page, collection, joystick)).not.toBeVisible();
            }
        }

        if (box && clickOptions) {
            // Listen for the released events.
            await page.evaluate(() => {
                window.events = [];
                window.nipplejs.factory.on(`rested`, (evt) => {
                    window.events.push(evt.data.uid.toString());
                });
            });
            // Release the mouse.
            await page.mouse.up();
            // Wait for the all the joysticks to trigger their rested events.
            await page.waitForFunction(
                (joystickUids) => {
                    return joystickUids.every((uid) => window.events.includes(uid));
                },
                joysticks,
                {
                    timeout: 500,
                },
            );
        }
    };

    const expectations: Record<Mode, Expectation[][]> = {
        // Dynamic, each new click creates a new joystick.
        dynamic: [
            // No click, no joystick.
            [[1, 0, false]],
            // First click, create a joystick.
            [[1, 0, true]],
            // Second click, create a second joystick, first one is not visible.
            [
                [1, 0, false],
                [1, 1, true],
            ],
            // Third click, create a third joystick, other two are not visible.
            [
                [1, 0, false],
                [1, 1, false],
                [1, 2, true],
            ],
        ],
        // Semi, each new click only creates a new joystick if close enough to the previous one.
        semi: [
            // No click, no joystick.
            [[1, 0, false]],
            // First click, create a joystick.
            [[1, 0, true]],
            // Second click, re-use the same joystick.
            [
                [1, 0, true],
                [1, 1, false],
            ],
            // Third click, create a new joystick, other one is not visible.
            [
                [1, 0, false],
                [1, 1, true],
            ],
        ],
        // Static, only the first joystick.
        static: [
            // No click, one joystick.
            [[1, 0, true]],
            // First click, one joystick.
            [
                [1, 0, true],
                [1, 1, false],
            ],
            // Second click, one joystick.
            [
                [1, 0, true],
                [1, 1, false],
            ],
            // Third click, one joystick.
            [
                [1, 0, true],
                [1, 1, false],
            ],
        ],
    };

    // Test a zone based on its type of joystick.
    const testZone = async (page: Page, name: Mode) => {
        // Switch to the correct zone.
        const zone = await getZone(page, name);
        const expectation = expectations[name];

        // Test without a click.
        await expectJoystick(page, zone, expectation[0]);

        // Create first joystick
        await expectJoystick(page, zone, expectation[1], { x: 0, y: 0 });

        // Create second joystick
        await expectJoystick(page, zone, expectation[2], { x: 50, y: 50 });

        // Create third joystick
        await expectJoystick(page, zone, expectation[3], { x: -300, y: -150 });
    };

    test('loads correctly', async ({ page }) => {
        // Check initial state
        await expect(page.locator('#zone_joystick')).toBeVisible();
        await expect(page.locator('.zone.dynamic')).toBeVisible();
    });

    test('handles semi mode', async ({ page }) => {
        await testZone(page, 'semi');
    });

    test('handles static mode', async ({ page }) => {
        await testZone(page, 'static');
    });

    test('handles dynamic mode', async ({ page }) => {
        await testZone(page, 'dynamic');
    });

    test('handles mouse interactions correctly', async ({ page }) => {
        const zone = page.locator('.zone.active');

        // Get zone position for mouse interactions
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Could not get zone position');
        }

        const frontElement = locateJoystick(page, 0, 0);

        // Test mouse down creates joystick
        await page.mouse.move(box.x + 50, box.y + 50);
        await page.mouse.down();
        await expect(frontElement).toBeVisible();

        // Test mouse move updates joystick position
        await page.mouse.move(box.x + 100, box.y + 100);
        const transform = await frontElement.evaluate((el) => {
            return window.getComputedStyle(el).transform;
        });
        expect(transform).not.toBe('none');

        // Test mouse up removes joystick in dynamic mode
        await page.mouse.up();
        await expect(frontElement).not.toBeVisible();
    });

    test.skip('respects lock axis options', async ({ page }) => {
        // Enable lock X
        await page.evaluate(() => {
            window.joystick.destroy();
            window.joystick = window.nipplejs.create({
                zone: document.getElementById('zone_joystick'),
                lockX: true,
            });
        });

        const zone = page.locator('.zone.active');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Could not get zone position');
        }

        await page.mouse.move(box.x + 50, box.y + 50);
        await page.mouse.down();

        // Move diagonally, should only move horizontally
        await page.mouse.move(box.x + 100, box.y + 100);
        const frontElement = locateJoystick(page, 0, 0);
        const transform = await frontElement.evaluate((el) => {
            const style = window.getComputedStyle(el);
            const matrix = new DOMMatrixReadOnly(style.transform);
            return { x: matrix.m41, y: matrix.m42 };
        });

        // Y position should not change when locked on X
        expect(transform.y).toBe(0);
        await page.mouse.up();
    });

    test.skip('follows touch/cursor when option enabled', async ({ page }) => {
        // Enable follow option
        await page.evaluate(() => {
            window.joystick.destroy();
            window.joystick = window.nipplejs.create({
                zone: document.getElementById('zone_joystick'),
                follow: true,
            });
        });

        const zone = page.locator('.zone.active');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Could not get zone position');
        }

        // Start at center
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();

        // Move beyond normal bounds
        await page.mouse.move(box.x + box.width + 50, box.y + box.height + 50);

        // Joystick base should have moved
        const baseElement = locateJoystick(page, 0, 0);
        const position = await baseElement.evaluate((el) => {
            const rect = el.getBoundingClientRect();
            return { x: rect.left, y: rect.top };
        });

        // Base position should have changed from initial position
        expect(position.x).toBeGreaterThan(box.x + box.width / 2);
        expect(position.y).toBeGreaterThan(box.y + box.height / 2);

        await page.mouse.up();
    });
});
