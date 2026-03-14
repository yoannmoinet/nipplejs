import { test } from '@nipple/tests/_playwright/testParams';

const { expect } = test;

test.describe('NippleJS Cleanup (Issue #214)', () => {
    test('dynamic mode cleans up DOM after release', async ({ page, setupPage, moveJoystick }) => {
        await setupPage({
            body: '<div id="zone_joystick"></div>',
            code: () => {
                window.joystick = window.nipplejs.create({
                    zone: document.getElementById('zone_joystick'),
                    mode: 'dynamic',
                    fadeTime: 50,
                });
            },
        });

        const zone = page.locator('#zone_joystick');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Zone not found');
        }

        // Create and release a joystick
        await moveJoystick({ x: box.x + 50, y: box.y + 50 });

        // Wait for fadeTime + buffer
        await page.waitForTimeout(200);

        // No joystick elements should remain visible
        const visibleJoysticks = await page.evaluate(() => {
            const joysticks = document.querySelectorAll('.joystick');
            let visible = 0;
            joysticks.forEach((j) => {
                if ((j as HTMLElement).style.display !== 'none') {
                    visible++;
                }
            });
            return visible;
        });

        expect(visibleJoysticks).toBe(0);
    });

    test('fast start/stop cycles do not leak DOM elements', async ({ page, setupPage }) => {
        await setupPage({
            body: '<div id="zone_joystick"></div>',
            code: () => {
                window.joystick = window.nipplejs.create({
                    zone: document.getElementById('zone_joystick'),
                    mode: 'dynamic',
                    fadeTime: 50,
                });
            },
        });

        const zone = page.locator('#zone_joystick');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Zone not found');
        }

        // Rapid mouse down/up cycles
        for (let i = 0; i < 10; i++) {
            const x = box.x + 20 + i * 10;
            const y = box.y + 50;
            await page.mouse.move(x, y);
            await page.mouse.down();
            await page.mouse.move(x + 5, y + 5);
            await page.mouse.up();
        }

        // Wait for all fadeTime animations to complete
        await page.waitForTimeout(500);

        // Count remaining visible joystick elements
        const visibleJoysticks = await page.evaluate(() => {
            const joysticks = document.querySelectorAll('.joystick');
            let visible = 0;
            joysticks.forEach((j) => {
                if ((j as HTMLElement).style.display !== 'none') {
                    visible++;
                }
            });
            return visible;
        });

        expect(visibleJoysticks).toBe(0);
    });

    test('destroy() removes all DOM elements', async ({ page, setupPage }) => {
        await setupPage({
            body: '<div id="zone_joystick"></div>',
            code: () => {
                window.joystick = window.nipplejs.create({
                    zone: document.getElementById('zone_joystick'),
                    mode: 'static',
                    position: { left: '50%', top: '50%' },
                });
            },
        });

        // Verify joystick exists
        const beforeCount = await page.locator('#zone_joystick .joystick').count();
        expect(beforeCount).toBe(1);

        // Destroy the collection
        await page.evaluate(() => {
            window.joystick.destroy();
        });

        // Verify no joystick children remain
        const afterCount = await page.locator('#zone_joystick .joystick').count();
        expect(afterCount).toBe(0);
    });
});
