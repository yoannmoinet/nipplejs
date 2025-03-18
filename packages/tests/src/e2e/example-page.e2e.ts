import { test } from '@nipple/tests/_playwright/testParams';

// Have a similar experience to Jest.
const { expect, beforeEach, describe } = test;

describe('Example Page', () => {
    beforeEach(async ({ devServerUrl, page }) => {
        await page.goto(`${devServerUrl}/codepen-demo.html`);
    });

    test('loads correctly and handles different modes', async ({ page }) => {
        // Check initial state
        await expect(page.locator('#zone_joystick')).toBeVisible();
        await expect(page.locator('.zone.dynamic')).toBeVisible();

        // Test dynamic mode
        const zone = page.locator('.zone.active');

        // Create first nipple
        await zone.click();
        await expect(page.locator('#nipple_0_0')).toBeVisible();

        // Create second nipple
        await zone.click({ position: { x: 100, y: 100 } });
        await expect(page.locator('#nipple_0_1')).toBeVisible();

        // Test semi mode
        await page.locator('.button.semi').click();
        await expect(page.locator('.zone.semi')).toBeVisible();

        // Create nipple in semi mode
        await zone.click();
        await expect(page.locator('#nipple_1_2')).toBeVisible();

        // Try to create second nipple in semi mode - should not create new one
        await zone.click({ position: { x: 50, y: 50 } });
        await expect(page.locator('#nipple_1_3')).not.toBeVisible();

        // Test static mode
        await page.locator('.button.static').click();
        await expect(page.locator('.zone.static')).toBeVisible();

        // Create nipple in static mode
        await zone.click();
        await expect(page.locator('#nipple_2_2')).toBeVisible();

        // Try to create second nipple in static mode - should not create new one
        await zone.click({ position: { x: 50, y: 50 } });
        await expect(page.locator('#nipple_2_3')).not.toBeVisible();
    });

    test.only('handles mouse interactions correctly', async ({ page }) => {
        const zone = page.locator('.zone.active');

        // Get zone position for mouse interactions
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Could not get zone position');
        }

        // Test mouse down creates nipple
        await page.mouse.move(box.x + 50, box.y + 50);
        await page.mouse.down();
        await expect(page.locator('#nipple_0_0')).toBeVisible();

        // Test mouse move updates nipple position
        await page.mouse.move(box.x + 100, box.y + 100);
        const frontElement = page.locator('#nipple_0_0 .front');
        const transform = await frontElement.evaluate((el) => {
            return window.getComputedStyle(el).transform;
        });
        console.log('transform', transform);
        expect(transform).not.toBe('none');

        // Test mouse up removes nipple in dynamic mode
        await page.mouse.up();
        await expect(page.locator('#nipple_0_0')).not.toBeVisible();
    });

    test('handles directional events correctly', async ({ page }) => {
        const zone = page.locator('.zone.active');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Could not get zone position');
        }

        // Center position
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;

        // Create and move nipple in different directions
        await page.mouse.move(centerX, centerY);
        await page.mouse.down();

        // Test up direction
        await page.mouse.move(centerX, centerY - 50);
        await expect(page.locator('.dir-up')).toBeVisible();

        // Test right direction
        await page.mouse.move(centerX + 50, centerY);
        await expect(page.locator('.dir-right')).toBeVisible();

        // Test down direction
        await page.mouse.move(centerX, centerY + 50);
        await expect(page.locator('.dir-down')).toBeVisible();

        // Test left direction
        await page.mouse.move(centerX - 50, centerY);
        await expect(page.locator('.dir-left')).toBeVisible();

        await page.mouse.up();
    });

    test('respects lock axis options', async ({ page }) => {
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
        const frontElement = page.locator('#nipple_0_0 .front');
        const transform = await frontElement.evaluate((el) => {
            const style = window.getComputedStyle(el);
            const matrix = new DOMMatrixReadOnly(style.transform);
            return { x: matrix.m41, y: matrix.m42 };
        });

        // Y position should not change when locked on X
        expect(transform.y).toBe(0);
        await page.mouse.up();
    });

    test('handles pressure sensitivity', async ({ page }) => {
        // Note: This test will only work on devices/browsers that support pressure
        const zone = page.locator('.zone.active');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Could not get zone position');
        }

        // Simulate pressure-sensitive interaction using pointer events
        await page.evaluate(() => {
            const newZone = document.querySelector('.zone.active');
            if (newZone) {
                const event = new PointerEvent('pointerdown', {
                    pressure: 0.5,
                    clientX: 50,
                    clientY: 50,
                });
                newZone.dispatchEvent(event);
            }
        });

        // Check if pressure class is applied
        await expect(page.locator('#nipple_0_0.pressure-0-5')).toBeVisible();
    });

    test('follows touch/cursor when option enabled', async ({ page }) => {
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
        const baseElement = page.locator('#nipple_0_0');
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
