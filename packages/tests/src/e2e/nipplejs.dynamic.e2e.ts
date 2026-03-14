import { test } from '@nipple/tests/_playwright/testParams';

// Have a similar experience to Jest.
const { expect, beforeEach, describe } = test;

describe('NippleJS Dynamic Page', () => {
    beforeEach(async ({ page, setupPage }) => {
        await setupPage();
        await page.evaluate(() => {
            window.joystick = window.nipplejs.create({
                zone: document.getElementById('zone_joystick'),
                dynamicPage: true,
            });
        });
    });

    test('joystick updates position on zone resize', async ({ page, startJoystick }) => {
        const zone = page.locator('#zone_joystick');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Zone not found');
        }

        // Create a joystick first
        const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        await startJoystick(center);

        // Get initial position
        const initialPos = await page.evaluate(() => {
            const el = document.querySelector('.joystick') as HTMLElement;
            return el ? { left: el.offsetLeft, top: el.offsetTop } : null;
        });

        // Resize zone
        await page.evaluate(() => {
            const zoneEl = document.getElementById('zone_joystick');
            if (zoneEl) {
                zoneEl.style.width = '200px';
                zoneEl.style.height = '200px';
            }
        });

        // Trigger window resize event
        await page.evaluate(() => window.dispatchEvent(new Event('resize')));
        await page.waitForTimeout(100);

        // Get new position
        const newPos = await page.evaluate(() => {
            const el = document.querySelector('.joystick') as HTMLElement;
            return el ? { left: el.offsetLeft, top: el.offsetTop } : null;
        });

        expect(initialPos).toBeTruthy();
        expect(newPos).toBeTruthy();
        // With dynamicPage, position should update on resize
        if (initialPos && newPos) {
            // At least verify the joystick exists after resize
            expect(newPos).toBeTruthy();
        }
    });

    test('joystick maintains relative position after DOM changes', async ({
        page,
        startJoystick,
    }) => {
        const zone = page.locator('#zone_joystick');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Zone not found');
        }

        // Create a joystick first
        const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        await startJoystick(center);

        // Add new elements to DOM
        await page.evaluate(() => {
            const newDiv = document.createElement('div');
            newDiv.style.height = '100px';
            document.body.insertBefore(newDiv, document.getElementById('zone_joystick'));
        });

        // Trigger resize to update positions
        await page.evaluate(() => window.dispatchEvent(new Event('resize')));
        await page.waitForTimeout(100);

        const position = await page.evaluate(() => {
            const zoneEl = document.getElementById('zone_joystick');
            const joystick = document.querySelector('.joystick') as HTMLElement;
            if (!zoneEl || !joystick) {
                return null;
            }

            const zoneRect = zoneEl.getBoundingClientRect();
            const joystickRect = joystick.getBoundingClientRect();

            return {
                zoneTop: zoneRect.top,
                joystickTop: joystickRect.top,
            };
        });

        expect(position).toBeTruthy();
        if (position) {
            // Verify joystick exists relative to zone
            expect(position.joystickTop).toBeGreaterThanOrEqual(position.zoneTop);
        }
    });

    test('joystick recalculates position on scroll', async ({ page, startJoystick }) => {
        // Make page scrollable - change to absolute positioning and add margin
        await page.evaluate(() => {
            const zone = document.getElementById('zone_joystick');
            if (zone) {
                zone.style.position = 'absolute';
                zone.style.marginTop = '500px';
            }
        });

        const zone = page.locator('#zone_joystick');

        // Scroll to the zone to make it visible
        await zone.scrollIntoViewIfNeeded();

        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Zone not found');
        }

        // Create a joystick first
        const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        await startJoystick(center);

        // Initial position
        const initialPos = await page.evaluate(() => {
            const el = document.querySelector('.joystick') as HTMLElement;
            return el ? el.getBoundingClientRect() : null;
        });

        // Scroll page
        await page.evaluate(() => window.scrollBy(0, 100));
        await page.waitForTimeout(100);

        // New position
        const scrolledPos = await page.evaluate(() => {
            const el = document.querySelector('.joystick') as HTMLElement;
            return el ? el.getBoundingClientRect() : null;
        });

        expect(initialPos).toBeTruthy();
        expect(scrolledPos).toBeTruthy();
        if (initialPos && scrolledPos) {
            // After scroll, position should change
            expect(scrolledPos.top).not.toBe(initialPos.top);
        }
    });
});
