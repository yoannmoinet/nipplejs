import { test, expect } from '@playwright/test';

test.describe('NippleJS Rest Behavior', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/example/codepen-demo.html');
    });

    test('handles rest joystick behavior', async ({ page }) => {
        // Configure with rest options
        await page.evaluate(() => {
            window.joystick.destroy();
            window.joystick = window.nipplejs.create({
                zone: document.getElementById('zone_joystick'),
                restJoystick: true,
                restOpacity: 0.5,
            });
        });

        const zone = page.locator('.zone.active');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Could not get zone position');
        }

        // Move joystick
        await page.mouse.move(box.x + 50, box.y + 50);
        await page.mouse.down();
        await page.mouse.move(box.x + 100, box.y + 100);

        // Release and verify it returns to center
        await page.mouse.up();

        // Wait for transition
        await page.waitForTimeout(300); // Slightly longer than default fadeTime

        const frontElement = page.locator('#joystick_0_0 .front');
        const transform = await frontElement.evaluate((el) => {
            const style = window.getComputedStyle(el);
            const matrix = new DOMMatrixReadOnly(style.transform);
            return { x: matrix.m41, y: matrix.m42 };
        });

        // Should be back at center
        expect(transform.x).toBe(0);
        expect(transform.y).toBe(0);

        // Check opacity
        const opacity = await page
            .locator('#joystick_0_0')
            .evaluate((el) => window.getComputedStyle(el).opacity);
        expect(Number(opacity)).toBe(0.5);
    });

    test('respects partial rest options', async ({ page }) => {
        // Configure with rest only on X axis
        await page.evaluate(() => {
            window.joystick.destroy();
            window.joystick = window.nipplejs.create({
                zone: document.getElementById('zone_joystick'),
                restJoystick: { x: true, y: false },
            });
        });

        const zone = page.locator('.zone.active');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Could not get zone position');
        }

        // Move joystick diagonally
        await page.mouse.move(box.x + 50, box.y + 50);
        await page.mouse.down();
        await page.mouse.move(box.x + 100, box.y + 100);

        // Release and verify only X returns to center
        await page.mouse.up();

        // Wait for transition
        await page.waitForTimeout(300);

        const frontElement = page.locator('#joystick_0_0 .front');
        const transform = await frontElement.evaluate((el) => {
            const style = window.getComputedStyle(el);
            const matrix = new DOMMatrixReadOnly(style.transform);
            return { x: matrix.m41, y: matrix.m42 };
        });

        // X should be back at center, Y should not
        expect(transform.x).toBe(0);
        expect(transform.y).not.toBe(0);
    });

    test('handles no rest behavior', async ({ page }) => {
        // Configure with no rest
        await page.evaluate(() => {
            window.joystick.destroy();
            window.joystick = window.nipplejs.create({
                zone: document.getElementById('zone_joystick'),
                restJoystick: false,
            });
        });

        const zone = page.locator('.zone.active');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Could not get zone position');
        }

        // Move joystick
        await page.mouse.move(box.x + 50, box.y + 50);
        await page.mouse.down();
        const moveX = 100;
        const moveY = 100;
        await page.mouse.move(box.x + moveX, box.y + moveY);

        // Get position before release
        const beforeRelease = await page.locator('#joystick_0_0 .front').evaluate((el) => {
            const style = window.getComputedStyle(el);
            const matrix = new DOMMatrixReadOnly(style.transform);
            return { x: matrix.m41, y: matrix.m42 };
        });

        // Release
        await page.mouse.up();

        // Wait for any potential transition
        await page.waitForTimeout(300);

        // Get position after release
        const afterRelease = await page.locator('#joystick_0_0 .front').evaluate((el) => {
            const style = window.getComputedStyle(el);
            const matrix = new DOMMatrixReadOnly(style.transform);
            return { x: matrix.m41, y: matrix.m42 };
        });

        // Position should not change after release
        expect(afterRelease.x).toBe(beforeRelease.x);
        expect(afterRelease.y).toBe(beforeRelease.y);
    });
});
