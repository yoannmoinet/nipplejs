import { test } from '@nipple/tests/_playwright/testParams';
import type { Locator, Page } from '@playwright/test';

// Have a similar experience to Jest.
const { expect, beforeEach, describe } = test;

describe.only('Example Page', () => {
    beforeEach(async ({ devServerUrl, page }) => {
        await page.goto(`${devServerUrl}/codepen-demo.html`);
    });

    const locateJoystick = (page: Page, collection: number, uid: number): Locator => {
        // Return the .front element as the parent is not tangibly visible.
        return page.locator(`#joystick_${collection}_${uid} .front`);
    };
    // Switch to different zones
    const getZone = async (page: Page, zone: 'semi' | 'static' | 'dynamic'): Promise<Locator> => {
        await page.locator(`.button.${zone}`).click();
        await expect(page.locator(`.zone.${zone}`)).toBeVisible();
        return page.locator(`.zone.active`);
    };

    // Expect a joystick to be visible or not.
    const expectJoystick = async (
        page: Page,
        zone: Locator,
        collection: number,
        joystick: number,
        clickOptions?: { x: number; y: number },
        visible: boolean = true,
    ) => {
        const box = await zone.boundingBox();
        if (box && clickOptions) {
            await page.mouse.move(box.x + clickOptions.x, box.y + clickOptions.y);
            await page.mouse.down();
            await page.mouse.move(box.x, box.y);
        }

        if (visible) {
            await expect(locateJoystick(page, collection, joystick)).toBeVisible();
        } else {
            await expect(locateJoystick(page, collection, joystick)).not.toBeVisible();
        }

        if (box && clickOptions) {
            // Listen for the released event.
            await page.evaluate(() => {
                window.events = [];
                window.nipplejs.factory.on(`rested`, (evt) => {
                    window.events?.push(evt.data.uid.toString());
                });
            });
            // Release the mouse.
            await page.mouse.up();
            // Wait for the joystick to trigger its destroy event.
            await page.waitForFunction(
                (uid) => {
                    return window.events?.includes(uid.toString());
                },
                joystick,
                {
                    timeout: 500,
                },
            );
        }
    };

    // [no click, click, click at 50/50, click at 100/100]
    const expectations = {
        // Dynamic, each new click creates a new joystick.
        dynamic: [false, true, true, true],
        // Semi, each new click only creates a new joystick if close enough to the previous one.
        semi: [false, true, false, true],
        // Static, only the first joystick.
        static: [true, true, false, false],
    };

    // Test a zone based on its type of joystick.
    const testZone = async (page: Page, name: 'semi' | 'static' | 'dynamic') => {
        // Dynamic mode is the default, so we start with a collection index of -1.
        let collection = 0;
        let joystick = 0;

        // Switch to the correct zone.
        const zone = await getZone(page, name);
        // Reset joystick index and collection index.
        collection++;
        joystick = 0;

        // Test without a click.
        await expectJoystick(page, zone, collection, joystick, undefined, expectations[name][0]);

        // Create first joystick
        await expectJoystick(
            page,
            zone,
            collection,
            joystick,
            { x: 0, y: 0 },
            expectations[name][1],
        );
        joystick++;

        // Create second joystick
        await expectJoystick(
            page,
            zone,
            collection,
            joystick,
            { x: 50, y: 50 },
            expectations[name][2],
        );
        joystick++;

        // Create third joystick
        await expectJoystick(
            page,
            zone,
            collection,
            joystick,
            { x: 100, y: 100 },
            expectations[name][3],
        );
        joystick++;
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
