import { test } from '@nipple/tests/_playwright/testParams';

const { expect } = test;

test.describe('NippleJS Rest Behavior', () => {
    test('handles rest joystick behavior', async ({ page, setupPage, moveJoystick }) => {
        // Configure with rest options
        await setupPage({
            body: '<div id="zone_joystick"></div>',
            code: () => {
                window.events = [];
                window.joystick = window.nipplejs.create({
                    zone: document.getElementById('zone_joystick'),
                    restJoystick: true,
                    restOpacity: 0.5,
                });
                window.joystick.on('start move end', (evt: { type: string }) => {
                    window.events.push(evt.type);
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

        // Verify joystick works with rest enabled
        const events = await page.evaluate(() => window.events);
        expect(events).toContain('start');
        expect(events).toContain('move');
        expect(events).toContain('end');
    });

    test('respects partial rest options', async ({ page, setupPage, moveJoystick }) => {
        // Configure with rest only on X axis
        await setupPage({
            body: '<div id="zone_joystick"></div>',
            code: () => {
                window.events = [];
                window.joystick = window.nipplejs.create({
                    zone: document.getElementById('zone_joystick'),
                    restJoystick: { x: true, y: false },
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

        // Verify joystick works with partial rest
        const events = await page.evaluate(() => window.events);
        expect(events.length).toBeGreaterThan(0);
    });

    test('handles no rest behavior', async ({ page, setupPage, startJoystick }) => {
        // Configure with no rest
        await setupPage({
            body: '<div id="zone_joystick"></div>',
            code: () => {
                window.events = [];
                window.joystick = window.nipplejs.create({
                    zone: document.getElementById('zone_joystick'),
                    restJoystick: false,
                });
                window.joystick.on('start move end', (evt: { type: string }) => {
                    window.events.push(evt.type);
                });
            },
        });

        const zone = page.locator('#zone_joystick');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Could not get zone position');
        }

        // Start joystick movement
        const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        await startJoystick(center);

        // Move it
        await page.mouse.move(center.x + 50, center.y + 50, { steps: 5 });

        // End without waiting for rest (since restJoystick is false)
        await page.mouse.up();

        // Verify joystick works without rest
        const events = await page.evaluate(() => window.events);
        expect(events).toContain('start');
        expect(events).toContain('move');
        expect(events).toContain('end');
    });
});
