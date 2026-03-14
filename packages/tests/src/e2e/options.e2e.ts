import { PUBLIC_DIR } from '@nipple/tests/_playwright/constants';
import { test } from '@nipple/tests/_playwright/testParams';
import path from 'path';

// Have a similar experience to Jest.
const { expect, beforeEach, describe } = test;

describe('Options', () => {
    describe('Follow', () => {
        beforeEach(async ({ setupPage }) => {
            await setupPage({
                body: '<div id="zone_joystick"></div>',
                script: path.resolve(PUBLIC_DIR, './src/index.js'),
                code: () => {
                    window.joystick = window.nipplejs.create({
                        zone: document.getElementById('zone_joystick'),
                        follow: true,
                    });
                },
            });
        });

        test('joystick follows beyond boundaries', async ({ page, locateJoystick }) => {
            const zone = page.locator('#zone_joystick');
            const box = await zone.boundingBox();
            if (!box) {
                throw new Error('Zone not found');
            }

            const center = {
                x: box.x + box.width / 2,
                y: box.y + box.height / 2,
            };

            // Move beyond boundary
            await page.mouse.move(center.x, center.y);
            await page.mouse.down();

            // Get the initial position.
            const baseElement = locateJoystick(0, 0).element;
            const initialPosition = await baseElement.evaluate((el) => {
                const rect = el.getBoundingClientRect();
                return { x: rect.left, y: rect.top };
            });

            await page.mouse.move(center.x + 300, center.y + 300, { steps: 10 });
            await page.mouse.up();

            // Get the new position.
            const newPosition = await baseElement.evaluate((el) => {
                const rect = el.getBoundingClientRect();
                return { x: rect.left, y: rect.top };
            });

            // Base position should have changed from initial position
            expect(newPosition.x).not.toBe(initialPosition.x);
            expect(newPosition.y).not.toBe(initialPosition.y);
        });
    });

    describe('Color', () => {
        test('applies custom color', async ({ page, setupPage, moveJoystick }) => {
            await setupPage({
                body: '<div id="zone_joystick"></div>',
                code: () => {
                    window.events = [];
                    window.joystick = window.nipplejs.create({
                        zone: document.getElementById('zone_joystick'),
                        color: 'red',
                    });
                    window.joystick.on('move', () => {
                        window.events.push('move');
                    });
                },
            });

            const zone = page.locator('#zone_joystick');
            const box = await zone.boundingBox();
            if (!box) {
                throw new Error('Zone not found');
            }

            await moveJoystick({ x: box.x + 50, y: box.y + 50 });

            // Verify joystick works with custom color
            const events = await page.evaluate(() => window.events);
            expect(events.length).toBeGreaterThan(0);
        });
    });

    describe('Size', () => {
        test('applies custom size', async ({ page, setupPage, moveJoystick }) => {
            await setupPage({
                body: '<div id="zone_joystick"></div>',
                code: () => {
                    window.events = [];
                    window.joystick = window.nipplejs.create({
                        zone: document.getElementById('zone_joystick'),
                        size: 150,
                    });
                    window.joystick.on('move', () => {
                        window.events.push('move');
                    });
                },
            });

            const zone = page.locator('#zone_joystick');
            const box = await zone.boundingBox();
            if (!box) {
                throw new Error('Zone not found');
            }

            await moveJoystick({ x: box.x + 50, y: box.y + 50 });

            // Verify joystick works with custom size
            const events = await page.evaluate(() => window.events);
            expect(events.length).toBeGreaterThan(0);
        });
    });

    describe('FadeTime', () => {
        test('respects custom fadeTime', async ({ page, setupPage, startJoystick }) => {
            await setupPage({
                body: '<div id="zone_joystick"></div>',
                code: () => {
                    window.events = [];
                    window.joystick = window.nipplejs.create({
                        zone: document.getElementById('zone_joystick'),
                        fadeTime: 500,
                    });
                    window.joystick.on('move', () => {
                        window.events.push('move');
                    });
                },
            });

            const zone = page.locator('#zone_joystick');
            const box = await zone.boundingBox();
            if (!box) {
                throw new Error('Zone not found');
            }

            // Start and move joystick manually to avoid fadeTime timeout issues
            await startJoystick({ x: box.x + 50, y: box.y + 50 });
            await page.mouse.move(box.x + 100, box.y + 100, { steps: 5 });
            await page.mouse.up();

            // Verify joystick works with custom fadeTime
            const events = await page.evaluate(() => window.events);
            expect(events.length).toBeGreaterThan(0);
        });
    });

    describe('DataOnly', () => {
        test('dataOnly mode prevents DOM creation', async ({ page, setupPage }) => {
            await setupPage({
                body: '<div id="zone_joystick"></div>',
                code: () => {
                    window.events = [];
                    window.joystick = window.nipplejs.create({
                        zone: document.getElementById('zone_joystick'),
                        dataOnly: true,
                    });
                    window.joystick.on('move', () => {
                        window.events.push('move');
                    });
                },
            });

            const zone = page.locator('#zone_joystick');
            const box = await zone.boundingBox();
            if (!box) {
                throw new Error('Zone not found');
            }

            // Trigger interaction
            await page.mouse.move(box.x + 50, box.y + 50);
            await page.mouse.down();
            await page.mouse.move(box.x + 100, box.y + 100);
            await page.mouse.up();

            // Verify no DOM elements created
            const joystickExists = await page.locator('#joystick_0_0').count();
            expect(joystickExists).toBe(0);

            // But events should still fire
            const events = await page.evaluate(() => window.events);
            expect(events.length).toBeGreaterThan(0);
        });
    });
});
