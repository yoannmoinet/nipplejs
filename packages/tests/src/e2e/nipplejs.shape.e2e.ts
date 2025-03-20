import { test, expect } from '@playwright/test';

test.describe('NippleJS Shape Options', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/example/codepen-demo.html');
    });

    test('supports square shape', async ({ page }) => {
        // Configure square shape
        await page.evaluate(() => {
            window.joystick.destroy();
            window.joystick = window.nipplejs.create({
                zone: document.getElementById('zone_joystick'),
                shape: 'square',
            });
        });

        const zone = page.locator('.zone.active');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Could not get zone position');
        }

        // Check if back element has square shape
        const borderRadius = await page
            .locator('#joystick_0_0 .back')
            .evaluate((el) => window.getComputedStyle(el).borderRadius);
        expect(borderRadius).toBe('0px');

        // Move joystick diagonally to max position
        await page.mouse.move(box.x + 50, box.y + 50);
        await page.mouse.down();
        await page.mouse.move(box.x + 100, box.y + 100);

        // In square mode, diagonal movement should reach corners
        const frontElement = page.locator('#joystick_0_0 .front');
        const transform = await frontElement.evaluate((el) => {
            const style = window.getComputedStyle(el);
            const matrix = new DOMMatrixReadOnly(style.transform);
            return { x: matrix.m41, y: matrix.m42 };
        });

        // Should be at max diagonal position
        const maxDistance = 50; // Half of default size
        expect(Math.abs(transform.x)).toBeCloseTo(maxDistance, 0);
        expect(Math.abs(transform.y)).toBeCloseTo(maxDistance, 0);

        await page.mouse.up();
    });

    test('supports circle shape', async ({ page }) => {
        // Configure circle shape explicitly
        await page.evaluate(() => {
            window.joystick.destroy();
            window.joystick = window.nipplejs.create({
                zone: document.getElementById('zone_joystick'),
                shape: 'circle',
            });
        });

        const zone = page.locator('.zone.active');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Could not get zone position');
        }

        // Check if back element has circular shape
        const borderRadius = await page
            .locator('#joystick_0_0 .back')
            .evaluate((el) => window.getComputedStyle(el).borderRadius);
        expect(borderRadius).toBe('50%');

        // Move joystick diagonally to max position
        await page.mouse.move(box.x + 50, box.y + 50);
        await page.mouse.down();
        await page.mouse.move(box.x + 100, box.y + 100);

        // In circle mode, diagonal movement should be constrained to circle radius
        const frontElement = page.locator('#joystick_0_0 .front');
        const transform = await frontElement.evaluate((el) => {
            const style = window.getComputedStyle(el);
            const matrix = new DOMMatrixReadOnly(style.transform);
            return { x: matrix.m41, y: matrix.m42 };
        });

        // Should be at max diagonal position (radius * cos(45°))
        const maxDistance = 50; // Half of default size
        const diagonalDistance = maxDistance * Math.cos(Math.PI / 4);
        expect(Math.abs(transform.x)).toBeCloseTo(diagonalDistance, 0);
        expect(Math.abs(transform.y)).toBeCloseTo(diagonalDistance, 0);

        await page.mouse.up();
    });

    test('handles shape-specific constraints', async ({ page }) => {
        // Test both shapes sequentially
        for (const currentShape of ['circle', 'square'] as const) {
            await page.evaluate((shape) => {
                window.joystick.destroy();
                window.joystick = window.nipplejs.create({
                    zone: document.getElementById('zone_joystick'),
                    shape,
                });
            }, currentShape);

            const zone = page.locator('.zone.active');
            const box = await zone.boundingBox();
            if (!box) {
                throw new Error('Could not get zone position');
            }

            // Test cardinal directions (should be same for both shapes)
            const directions = [
                { x: 100, y: 50 }, // right
                { x: 0, y: 50 }, // left
                { x: 50, y: 0 }, // up
                { x: 50, y: 100 }, // down
            ];

            for (const pos of directions) {
                await page.mouse.move(box.x + 50, box.y + 50);
                await page.mouse.down();
                await page.mouse.move(box.x + pos.x, box.y + pos.y);

                const frontElement = page.locator('#joystick_0_0 .front');
                const transform = await frontElement.evaluate((el) => {
                    const style = window.getComputedStyle(el);
                    const matrix = new DOMMatrixReadOnly(style.transform);
                    return { x: matrix.m41, y: matrix.m42 };
                });

                // Cardinal directions should reach max distance in both shapes
                if (pos.x !== 50) {
                    expect(Math.abs(transform.x)).toBeCloseTo(50, 0);
                }
                if (pos.y !== 50) {
                    expect(Math.abs(transform.y)).toBeCloseTo(50, 0);
                }

                await page.mouse.up();
            }
        }
    });
});
