import { test, expect } from '@playwright/test';

test.describe('NippleJS Multitouch', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/example/codepen-demo.html');
    });

    test('supports multitouch interactions', async ({ page }) => {
        // Enable multitouch
        await page.evaluate(() => {
            window.joystick.destroy();
            window.joystick = window.nipplejs.create({
                zone: document.getElementById('zone_joystick'),
                multitouch: true,
                maxNumberOfJoysticks: 2,
            });
        });

        // Simulate multiple touch points
        await page.evaluate(() => {
            const zone = document.querySelector('.zone.active');
            if (zone) {
                // First touch
                zone.dispatchEvent(
                    new TouchEvent('touchstart', {
                        touches: [
                            new Touch({
                                identifier: 1,
                                target: zone,
                                clientX: 100,
                                clientY: 100,
                            }),
                        ],
                    }),
                );

                // Second touch
                zone.dispatchEvent(
                    new TouchEvent('touchstart', {
                        touches: [
                            new Touch({
                                identifier: 2,
                                target: zone,
                                clientX: 200,
                                clientY: 200,
                            }),
                        ],
                    }),
                );
            }
        });

        // Verify both joysticks exist
        await expect(page.locator('#nipple_0_0')).toBeVisible();
        await expect(page.locator('#nipple_0_1')).toBeVisible();
    });

    test('respects maxNumberOfJoysticks limit', async ({ page }) => {
        // Enable multitouch with limit of 2
        await page.evaluate(() => {
            window.joystick.destroy();
            window.joystick = window.nipplejs.create({
                zone: document.getElementById('zone_joystick'),
                multitouch: true,
                maxNumberOfJoysticks: 2,
            });
        });

        // Simulate three touch points
        await page.evaluate(() => {
            const zone = document.querySelector('.zone.active');
            if (zone) {
                [1, 2, 3].forEach((id) => {
                    zone.dispatchEvent(
                        new TouchEvent('touchstart', {
                            touches: [
                                new Touch({
                                    identifier: id,
                                    target: zone,
                                    clientX: id * 100,
                                    clientY: id * 100,
                                }),
                            ],
                        }),
                    );
                });
            }
        });

        // Verify only two joysticks exist
        await expect(page.locator('#nipple_0_0')).toBeVisible();
        await expect(page.locator('#nipple_0_1')).toBeVisible();
        await expect(page.locator('#nipple_0_2')).not.toBeVisible();
    });

    test('handles multitouch removal correctly', async ({ page }) => {
        // Enable multitouch
        await page.evaluate(() => {
            window.joystick.destroy();
            window.joystick = window.nipplejs.create({
                zone: document.getElementById('zone_joystick'),
                multitouch: true,
                maxNumberOfJoysticks: 2,
            });
        });

        // Add two touches
        await page.evaluate(() => {
            const zone = document.querySelector('.zone.active');
            if (zone) {
                [1, 2].forEach((id) => {
                    zone.dispatchEvent(
                        new TouchEvent('touchstart', {
                            touches: [
                                new Touch({
                                    identifier: id,
                                    target: zone,
                                    clientX: id * 100,
                                    clientY: id * 100,
                                }),
                            ],
                        }),
                    );
                });
            }
        });

        // Verify both exist
        await expect(page.locator('#nipple_0_0')).toBeVisible();
        await expect(page.locator('#nipple_0_1')).toBeVisible();

        // Remove first touch
        await page.evaluate(() => {
            const zone = document.querySelector('.zone.active');
            if (zone) {
                zone.dispatchEvent(
                    new TouchEvent('touchend', {
                        touches: [],
                        changedTouches: [
                            new Touch({
                                identifier: 1,
                                target: zone,
                                clientX: 100,
                                clientY: 100,
                            }),
                        ],
                    }),
                );
            }
        });

        // Wait for fade animation
        await page.waitForTimeout(300);

        // Verify first is gone but second remains
        await expect(page.locator('#nipple_0_0')).not.toBeVisible();
        await expect(page.locator('#nipple_0_1')).toBeVisible();
    });
});
