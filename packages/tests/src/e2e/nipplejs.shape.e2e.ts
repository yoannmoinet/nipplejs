import { test } from '@nipple/tests/_playwright/testParams';

const { expect } = test;

test.describe('NippleJS Shape Options', () => {
    test.beforeEach(async ({ setupPage }) => {
        await setupPage({
            body: '<div id="zone_joystick"></div>',
        });
    });

    test('supports square shape', async ({ page, setupPage, moveJoystick }) => {
        // Configure square shape
        await setupPage({
            body: '<div id="zone_joystick"></div>',
            code: () => {
                window.events = [];
                window.joystick = window.nipplejs.create({
                    zone: document.getElementById('zone_joystick'),
                    shape: 'square',
                });
                window.joystick.on('move', () => {
                    window.events.push('move');
                });
            },
        });

        const zone = page.locator('#zone_joystick');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Could not get zone position');
        }

        // Move joystick
        await moveJoystick({ x: box.x + 50, y: box.y + 50 });

        // Verify joystick works with square shape
        const events = await page.evaluate(() => window.events);
        expect(events.length).toBeGreaterThan(0);
    });

    test('supports circle shape', async ({ page, setupPage, moveJoystick }) => {
        // Configure circle shape explicitly
        await setupPage({
            body: '<div id="zone_joystick"></div>',
            code: () => {
                window.events = [];
                window.joystick = window.nipplejs.create({
                    zone: document.getElementById('zone_joystick'),
                    shape: 'circle',
                });
                window.joystick.on('move', () => {
                    window.events.push('move');
                });
            },
        });

        const zone = page.locator('#zone_joystick');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Could not get zone position');
        }

        // Move joystick
        await moveJoystick({ x: box.x + 50, y: box.y + 50 });

        // Verify joystick works with circle shape
        const events = await page.evaluate(() => window.events);
        expect(events.length).toBeGreaterThan(0);
    });

    test('handles shape-specific constraints', async ({ page, moveJoystick }) => {
        // Test both shapes sequentially
        for (const currentShape of ['circle', 'square'] as const) {
            await page.evaluate((shape) => {
                window.events = [];
                if (window.joystick) {
                    window.joystick.destroy();
                }
                window.joystick = window.nipplejs.create({
                    zone: document.getElementById('zone_joystick'),
                    shape,
                });
                window.joystick.on('move', () => {
                    window.events.push('move');
                });
            }, currentShape);

            const zone = page.locator('#zone_joystick');
            const box = await zone.boundingBox();
            if (!box) {
                throw new Error('Could not get zone position');
            }

            // Move joystick
            await moveJoystick({ x: box.x + 50, y: box.y + 50 });

            // Verify joystick works with this shape
            const events = await page.evaluate(() => window.events);
            expect(events.length).toBeGreaterThan(0);
        }
    });
});
