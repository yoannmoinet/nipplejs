import { PUBLIC_DIR } from '@nipple/tests/_playwright/constants';
import { test } from '@nipple/tests/_playwright/testParams';
import path from 'path';

// Have a similar experience to Jest.
const { expect, beforeEach, describe } = test;

describe('Events', () => {
    beforeEach(async ({ setupPage }) => {
        await setupPage({
            body: '<div id="zone_joystick"></div>',
            script: path.resolve(PUBLIC_DIR, './src/index.js'),
            code: () => {
                window.joystick = window.nipplejs.create({
                    zone: document.getElementById('zone_joystick'),
                });
            },
        });
    });

    test('emits basic lifecycle events', async ({ page, moveJoystick }) => {
        // Setup event listeners
        await page.evaluate(() => {
            window.events = [];
            window.joystick.on('start move end pressure', (evt: { type: string }) => {
                window.events.push(evt.type);
            });
        });

        const zone = page.locator('#zone_joystick');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Could not get zone position');
        }

        // Perform basic interaction
        await moveJoystick({ x: box.x + 50, y: box.y + 50 });

        // Verify events
        const events = await page.evaluate(() => window.events);
        expect(events.filter((e) => e === 'start').length).toBe(1);
        expect(events).toContain('start');

        // There can be multiple move events.
        expect(events).toContain('move');
        expect(events.filter((e) => e === 'end').length).toBe(1);
        expect(events).toContain('end');

        // Verify event order
        expect(events.indexOf('start')).toBeLessThan(events.indexOf('move'));
        expect(events.lastIndexOf('move')).toBeLessThan(events.indexOf('end'));
    });

    test('emits directional events', async ({ page }) => {
        // Setup event listeners
        await page.evaluate(() => {
            window.events = [];
            window.joystick.on(
                'dir:up dir:right dir:down dir:left plain:up plain:right plain:down plain:left',
                (evt: { type: string }) => {
                    window.events.push(evt.type);
                },
            );
        });

        const zone = page.locator('#zone_joystick');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Could not get zone position');
        }

        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;
        const moveDistance = 50;

        // Test each direction
        const moves = [
            { dir: 'up', x: centerX, y: centerY - moveDistance },
            { dir: 'right', x: centerX + moveDistance, y: centerY },
            { dir: 'down', x: centerX, y: centerY + moveDistance },
            { dir: 'left', x: centerX - moveDistance, y: centerY },
        ];

        for (const move of moves) {
            // Place the mouse on the center of the zone.
            await page.mouse.move(centerX, centerY);
            await page.mouse.down();

            // Move the mouse to the direction.
            await page.mouse.move(move.x, move.y, { steps: 10 });
            await page.mouse.up();

            // Wait for the joystick to fully fade and be destroyed
            // before starting the next direction.
            await page.waitForTimeout(400);
        }

        // Verify all directional events were emitted
        const events = await page.evaluate(() => window.events);
        // Verify dir events.
        expect(events).toContain('dir:up');
        expect(events).toContain('dir:right');
        expect(events).toContain('dir:down');
        expect(events).toContain('dir:left');
        // Verify plain events.
        expect(events).toContain('plain:up');
        expect(events).toContain('plain:right');
        expect(events).toContain('plain:down');
        expect(events).toContain('plain:left');
    });

    test('emits pressure events', async ({ page, moveJoystick }) => {
        // Setup event listeners
        await page.evaluate(() => {
            window.events = [];
            window.joystick.on('pressure', (evt: { data: number }) => {
                window.events.push(`pressure:${evt.data}`);
            });
        });

        const zone = page.locator('#zone_joystick');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Could not get zone position');
        }

        // Perform basic interaction
        await moveJoystick({ x: box.x + 50, y: box.y + 50 });

        // Verify pressure event was emitted
        const events = await page.evaluate(() => window.events);
        // Playwright only send zero pressure events.
        expect(events.some((e) => e.startsWith('pressure:0'))).toBe(true);
    });
});
