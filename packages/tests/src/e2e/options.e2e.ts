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
});
