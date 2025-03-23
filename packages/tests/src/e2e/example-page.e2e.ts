import { test } from '@nipple/tests/_playwright/testParams';
import type { Locator } from '@playwright/test';
import type { CommonOptions } from 'nipplejs/types';

type Mode = NonNullable<CommonOptions['mode']>;
type Expectation = [number, number, boolean];

// Have a similar experience to Jest.
const { expect, beforeEach, describe } = test;

describe.only('Example Page', () => {
    beforeEach(async ({ devServerUrl, page, initPage }) => {
        await page.goto(`${devServerUrl}/codepen-demo.html`);
        await initPage();
    });

    test('loads correctly', async ({ page }) => {
        // Check initial state
        await expect(page.locator('#zone_joystick')).toBeVisible();
        await expect(page.locator('.zone.dynamic')).toBeVisible();
    });

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

    // Test each mode.
    for (const zone of Object.keys(expectations) as Mode[]) {
        test(`handles ${zone} mode`, async ({
            page,
            locateJoystick,
            startJoystick,
            releaseJoystick,
        }) => {
            // Switch to different zones
            const switchZone = async (): Promise<Locator> => {
                await page.locator(`.button.${zone}`).click();
                await expect(page.locator(`.zone.${zone}`)).toBeVisible();
                return page.locator(`.zone.${zone}`);
            };

            // Expect a joystick to be visible or not.
            const expectJoystick = async (
                params: Expectation[],
                clickOptions?: { x: number; y: number },
            ) => {
                let ctxName: string;
                if (clickOptions) {
                    ctxName = await startJoystick(clickOptions);
                }

                for (const [collection, joystick, visible] of params) {
                    if (visible) {
                        await expect(locateJoystick(collection, joystick)).toBeVisible();
                    } else {
                        await expect(locateJoystick(collection, joystick)).not.toBeVisible();
                    }
                }

                if (clickOptions) {
                    await releaseJoystick(ctxName!);
                }
            };

            // Switch to the correct zone.
            const zoneElement = await switchZone();
            const expectation = expectations[zone];
            const box = await zoneElement.boundingBox();
            if (!box) {
                throw new Error('Could not get zone position');
            }
            const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

            // Test without a click.
            await expectJoystick(expectation[0]);

            // Create first joystick
            await expectJoystick(expectation[1], center);

            // Create second joystick
            await expectJoystick(expectation[2], { x: center.x + 50, y: center.y + 50 });

            // Create third joystick
            await expectJoystick(expectation[3], { x: center.x - 300, y: center.y - 150 });
        });
    }

    test('handles mouse interactions correctly', async ({ page, locateJoystick }) => {
        const zone = page.locator('.zone.active');

        // Get zone position for mouse interactions
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Could not get zone position');
        }

        const frontElement = locateJoystick(0, 0);

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

    test.skip('respects lock axis options', async ({ page, locateJoystick }) => {
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
        const frontElement = locateJoystick(0, 0);
        const transform = await frontElement.evaluate((el) => {
            const style = window.getComputedStyle(el);
            const matrix = new DOMMatrixReadOnly(style.transform);
            return { x: matrix.m41, y: matrix.m42 };
        });

        // Y position should not change when locked on X
        expect(transform.y).toBe(0);
        await page.mouse.up();
    });
});
