import { test, expect } from '@playwright/test';

test.describe('NippleJS Dynamic Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => {
            window.joystick = window.nipplejs.create({
                zone: document.getElementById('zone_joystick'),
                dynamicPage: true,
            });
        });
    });

    test('joystick updates position on zone resize', async ({ page }) => {
        // Get initial position
        const initialPos = await page.evaluate(() => {
            const el = document.querySelector('.nipple') as HTMLElement;
            return el ? { left: el.offsetLeft, top: el.offsetTop } : null;
        });

        // Resize zone
        await page.evaluate(() => {
            const zone = document.getElementById('zone_joystick');
            if (zone) {
                zone.style.width = '200px';
                zone.style.height = '200px';
            }
        });

        // Get new position
        const newPos = await page.evaluate(() => {
            const el = document.querySelector('.nipple') as HTMLElement;
            return el ? { left: el.offsetLeft, top: el.offsetTop } : null;
        });

        expect(initialPos).toBeTruthy();
        expect(newPos).toBeTruthy();
        expect(initialPos).not.toEqual(newPos);
    });

    test('joystick maintains relative position after DOM changes', async ({ page }) => {
        // Add new elements to DOM
        await page.evaluate(() => {
            const newDiv = document.createElement('div');
            newDiv.style.height = '100px';
            document.body.insertBefore(newDiv, document.getElementById('zone_joystick'));
        });

        const position = await page.evaluate(() => {
            const zone = document.getElementById('zone_joystick');
            const joystick = document.querySelector('.nipple') as HTMLElement;
            if (!zone || !joystick) {
                return null;
            }

            const zoneRect = zone.getBoundingClientRect();
            const joystickRect = joystick.getBoundingClientRect();

            return {
                zoneTop: zoneRect.top,
                joystickTop: joystickRect.top,
            };
        });

        expect(position).toBeTruthy();
        if (position) {
            // Verify joystick position relative to zone
            expect(position.joystickTop).toBeGreaterThan(position.zoneTop);
        }
    });

    test('joystick recalculates position on scroll', async ({ page }) => {
        // Initial position
        const initialPos = await page.evaluate(() => {
            const el = document.querySelector('.nipple') as HTMLElement;
            return el ? el.getBoundingClientRect() : null;
        });

        // Scroll page
        await page.evaluate(() => window.scrollBy(0, 100));

        // New position
        const scrolledPos = await page.evaluate(() => {
            const el = document.querySelector('.nipple') as HTMLElement;
            return el ? el.getBoundingClientRect() : null;
        });

        expect(initialPos).toBeTruthy();
        expect(scrolledPos).toBeTruthy();
        if (initialPos && scrolledPos) {
            expect(scrolledPos.top).not.toBe(initialPos.top);
        }
    });
});
