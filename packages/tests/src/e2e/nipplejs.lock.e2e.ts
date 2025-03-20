// @ts-check

import { test, expect } from '@playwright/test';
import type { JoystickEventData } from 'nipplejs/types';

test.describe.skip('NippleJS Lock Axis', () => {
    test.describe('X-Axis Lock', () => {
        test.beforeEach(async ({ page }) => {
            await page.goto('/');
            await page.evaluate(() => {
                window.joystick = window.nipplejs.create({
                    zone: document.getElementById('zone_joystick'),
                    lockX: true,
                });
            });
        });

        test('movement restricted to X axis', async ({ page }) => {
            const zone = page.locator('#zone_joystick');
            const box = await zone.boundingBox();
            if (!box) {
                throw new Error('Zone not found');
            }

            const movements = await page.evaluate(async () => {
                const positionLog: JoystickEventData['position'][] = [];
                window.joystick.on('move', (evt: { data: JoystickEventData }) => {
                    positionLog.push(evt.data.position);
                });

                return positionLog;
            });

            movements.forEach((pos) => {
                expect(pos.y).toBe(box.y + box.height / 2);
            });
        });
    });

    test.describe('Y-Axis Lock', () => {
        test.beforeEach(async ({ page }) => {
            await page.goto('/');
            await page.evaluate(() => {
                window.joystick = window.nipplejs.create({
                    zone: document.getElementById('zone_joystick'),
                    lockY: true,
                });
            });
        });

        test('movement restricted to Y axis', async ({ page }) => {
            const zone = page.locator('#zone_joystick');
            const box = await zone.boundingBox();
            if (!box) {
                throw new Error('Zone not found');
            }

            const movements = await page.evaluate(async () => {
                const positionLog: JoystickEventData['position'][] = [];
                window.joystick.on('move', (evt: { data: JoystickEventData }) => {
                    positionLog.push(evt.data.position);
                });

                return positionLog;
            });

            movements.forEach((pos) => {
                expect(pos.x).toBe(box.x + box.width / 2);
            });
        });
    });

    test('events respect locked axes', async ({ page }) => {
        await page.evaluate(() => {
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
        });

        const directions = await page.evaluate(() => window.directions);
        directions.forEach((dir) => {
            expect(dir.angle).not.toBe('up');
            expect(dir.angle).not.toBe('down');
        });
    });
});
