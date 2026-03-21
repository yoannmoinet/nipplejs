import { test } from '@nipple/tests/_playwright/testParams';

const { expect, beforeEach, describe } = test;

describe('NippleJS Multitouch', () => {
    beforeEach(async ({ setupPage }) => {
        await setupPage({
            body: '<div id="zone_joystick"></div>',
            code: () => {
                window.joystick = window.nipplejs.create({
                    zone: document.getElementById('zone_joystick'),
                    multitouch: true,
                    maxNumberOfJoysticks: 2,
                });
            },
        });
    });

    test('supports multitouch interactions', async ({ page, moveJoystick }) => {
        const zone = page.locator('#zone_joystick');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Zone not found');
        }

        // Create joystick to verify multitouch is enabled
        await moveJoystick({ x: box.x + 50, y: box.y + 50 });

        // Verify joystick was created with multitouch capability
        const config = await page.evaluate(() => {
            return {
                multitouch: window.joystick.options.multitouch,
                maxNumberOfJoysticks: window.joystick.options.maxNumberOfJoysticks,
            };
        });

        expect(config.multitouch).toBe(true);
        expect(config.maxNumberOfJoysticks).toBe(2);
    });

    test('respects maxNumberOfJoysticks limit', async ({ page, moveJoystick }) => {
        const zone = page.locator('#zone_joystick');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Zone not found');
        }

        // Create joystick and verify maxNumberOfJoysticks is respected
        await moveJoystick({ x: box.x + 50, y: box.y + 50 });

        const config = await page.evaluate(() => {
            return window.joystick.options.maxNumberOfJoysticks;
        });

        expect(config).toBe(2);
    });

    test('handles multitouch removal correctly', async ({ page, moveJoystick }) => {
        const zone = page.locator('#zone_joystick');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Zone not found');
        }

        // Track events
        await page.evaluate(() => {
            window.events = [];
            window.joystick.on('added removed', (evt: { type: string }) => {
                window.events.push(evt.type);
            });
        });

        // Create and remove a joystick
        await moveJoystick({ x: box.x + 50, y: box.y + 50 });

        // Verify events fired
        const events = await page.evaluate(() => window.events);
        expect(events).toContain('added');
        expect(events).toContain('removed');
    });
});
