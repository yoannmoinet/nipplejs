import { test } from '@nipple/tests/_playwright/testParams';
import type { JoystickEventData } from 'nipplejs/types';

const { expect } = test;

test.describe('NippleJS Position (Issue #222)', () => {
    test('static joystick with CSS percentage position responds correctly', async ({
        page,
        setupPage,
    }) => {
        await setupPage({
            body: '<div id="zone_joystick"></div>',
            code: () => {
                window.context.lastDirection = null;
                window.joystick = window.nipplejs.create({
                    zone: document.getElementById('zone_joystick'),
                    mode: 'static',
                    position: { left: '50%', top: '50%' },
                });
                window.joystick.on('dir', (evt: { data: JoystickEventData }) => {
                    if (evt.data.direction) {
                        window.context.lastDirection = evt.data.direction.angle;
                    }
                });
            },
        });

        const zone = page.locator('#zone_joystick');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Zone not found');
        }

        // The joystick should be at 50%/50% of the zone
        const joystickCenter = {
            x: box.x + box.width / 2,
            y: box.y + box.height / 2,
        };

        // Click to the right of the joystick center
        await page.mouse.move(joystickCenter.x, joystickCenter.y);
        await page.mouse.down();
        await page.mouse.move(joystickCenter.x + 60, joystickCenter.y, { steps: 10 });

        const direction = await page.evaluate(() => window.context.lastDirection);
        // Moving right from center should register as 'right'
        expect(direction).toBe('right');

        await page.mouse.up();
    });

    test('static joystick direction matches click location without resize', async ({
        page,
        setupPage,
    }) => {
        await setupPage({
            body: '<div id="zone_joystick"></div>',
            code: () => {
                window.context.directions = [];
                window.joystick = window.nipplejs.create({
                    zone: document.getElementById('zone_joystick'),
                    mode: 'static',
                    position: { left: '50%', top: '50%' },
                });
                window.joystick.on('dir', (evt: { data: JoystickEventData }) => {
                    if (evt.data.direction?.angle) {
                        window.context.directions.push(evt.data.direction.angle);
                    }
                });
            },
        });

        const zone = page.locator('#zone_joystick');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Zone not found');
        }

        const joystickCenter = {
            x: box.x + box.width / 2,
            y: box.y + box.height / 2,
        };

        // Move up
        await page.mouse.move(joystickCenter.x, joystickCenter.y);
        await page.mouse.down();
        await page.mouse.move(joystickCenter.x, joystickCenter.y - 60, { steps: 10 });
        await page.mouse.up();

        const directions = await page.evaluate(() => window.context.directions);
        expect(directions).toContain('up');
    });

    test('joystick position recalculates with dynamicPage after layout changes', async ({
        page,
        setupPage,
    }) => {
        await setupPage({
            css: `
                #spacer { height: 0; transition: none; }
                #zone_joystick { position: relative; width: 100%; height: 300px; background: lightblue; }
            `,
            body: '<div id="spacer"></div><div id="zone_joystick"></div>',
            code: () => {
                window.context.directions = [];
                window.joystick = window.nipplejs.create({
                    zone: document.getElementById('zone_joystick'),
                    mode: 'static',
                    position: { left: '50%', top: '50%' },
                    dynamicPage: true,
                });
                window.joystick.on('dir', (evt: { data: JoystickEventData }) => {
                    if (evt.data.direction?.angle) {
                        window.context.directions.push(evt.data.direction.angle);
                    }
                });
            },
        });

        // Add a spacer to shift the zone down
        await page.evaluate(() => {
            document.getElementById('spacer')!.style.height = '200px';
        });

        const zone = page.locator('#zone_joystick');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Zone not found');
        }

        // The joystick center should reflect the new position
        const joystickCenter = {
            x: box.x + box.width / 2,
            y: box.y + box.height / 2,
        };

        // Move right from the joystick center
        await page.mouse.move(joystickCenter.x, joystickCenter.y);
        await page.mouse.down();
        await page.mouse.move(joystickCenter.x + 60, joystickCenter.y, { steps: 10 });
        await page.mouse.up();

        const directions = await page.evaluate(() => window.context.directions);
        expect(directions).toContain('right');
    });
});
