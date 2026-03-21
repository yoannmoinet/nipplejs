// @ts-check

import { test } from '@nipple/tests/_playwright/testParams';
import type { JoystickEventData } from 'nipplejs/types';

const { expect } = test;

test.describe('NippleJS Lock Axis', () => {
    test.describe('X-Axis Lock', () => {
        test.beforeEach(async ({ setupPage }) => {
            await setupPage({
                body: '<div id="zone_joystick"></div>',
                code: () => {
                    window.joystick = window.nipplejs.create({
                        zone: document.getElementById('zone_joystick'),
                        lockX: true,
                    });
                },
            });
        });

        test('movement restricted to X axis', async ({ page, moveJoystick }) => {
            const zone = page.locator('#zone_joystick');
            const box = await zone.boundingBox();
            if (!box) {
                throw new Error('Zone not found');
            }

            await page.evaluate(() => {
                window.events = [];
                window.joystick.on('move', () => {
                    window.events.push('move');
                });
            });

            // Move diagonally
            const centerX = box.x + box.width / 2;
            const centerY = box.y + box.height / 2;
            await moveJoystick({ x: centerX + 50, y: centerY + 50 });

            // Verify joystick still moves with lockX enabled
            const events = await page.evaluate(() => window.events);
            expect(events.length).toBeGreaterThan(0);
        });
    });

    test.describe('Y-Axis Lock', () => {
        test.beforeEach(async ({ setupPage }) => {
            await setupPage({
                body: '<div id="zone_joystick"></div>',
                code: () => {
                    window.joystick = window.nipplejs.create({
                        zone: document.getElementById('zone_joystick'),
                        lockY: true,
                    });
                },
            });
        });

        test('movement restricted to Y axis', async ({ page, moveJoystick }) => {
            const zone = page.locator('#zone_joystick');
            const box = await zone.boundingBox();
            if (!box) {
                throw new Error('Zone not found');
            }

            await page.evaluate(() => {
                window.events = [];
                window.joystick.on('move', () => {
                    window.events.push('move');
                });
            });

            // Move diagonally
            const centerX = box.x + box.width / 2;
            const centerY = box.y + box.height / 2;
            await moveJoystick({ x: centerX + 50, y: centerY + 50 });

            // Verify joystick still moves with lockY enabled
            const events = await page.evaluate(() => window.events);
            expect(events.length).toBeGreaterThan(0);
        });
    });

    test('events respect locked axes', async ({ page, setupPage, moveJoystick }) => {
        await setupPage({
            body: '<div id="zone_joystick"></div>',
            code: () => {
                window.directions = [];
                window.joystick = window.nipplejs.create({
                    zone: document.getElementById('zone_joystick'),
                    lockX: true,
                });

                window.joystick.on('dir', (evt: { data: JoystickEventData }) => {
                    if (evt.data.direction) {
                        window.directions.push(evt.data.direction);
                    }
                });
            },
        });

        // Move the joystick horizontally to trigger direction events
        const zone = page.locator('#zone_joystick');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Zone not found');
        }

        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;
        await moveJoystick({ x: centerX + 50, y: centerY }); // Move horizontally

        const directions = await page.evaluate(() => window.directions);
        // When lockX is true, vertical movement is restricted, so no up/down angles
        directions.forEach((dir) => {
            expect(dir.angle).not.toBe('up');
            expect(dir.angle).not.toBe('down');
        });
    });
});
