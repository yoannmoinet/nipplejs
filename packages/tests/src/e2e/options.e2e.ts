import { PUBLIC_DIR } from '@nipple/tests/_playwright/constants';
import { test } from '@nipple/tests/_playwright/testParams';
import type { Coordinates } from 'nipplejs/types';
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
            await page.mouse.move(center.x + box.width * 2, center.y, { steps: 10 });
            await page.mouse.up();

            // Joystick base should have moved
            const baseElement = locateJoystick(0, 0);
            const position = await baseElement.evaluate((el) => {
                const rect = el.getBoundingClientRect();
                return { x: rect.left, y: rect.top };
            });

            // Base position should have changed from initial position
            expect(position.x).toBeGreaterThan(box.x + box.width / 2);
            expect(position.y).toBeGreaterThan(box.y + box.height / 2);

            await page.mouse.up();
        });

        test('joystick maintains relative position while following', async ({ page }) => {
            const zone = page.locator('#zone_joystick');
            const box = await zone.boundingBox();
            if (!box) {
                throw new Error('Zone not found');
            }

            // Track positions during movement
            const movementPositions = await page.evaluate(async () => {
                const positionLog: Coordinates[] = [];
                const moveHandler = (evt: { data: { position: Coordinates } }) =>
                    positionLog.push(evt.data.position);
                window.joystick.on('move', moveHandler);

                return positionLog;
            });

            expect(movementPositions.length).toBeGreaterThan(0);
        });

        test('follow respects container boundaries', async ({ page }) => {
            const zone = page.locator('#zone_joystick');
            const box = await zone.boundingBox();
            if (!box) {
                throw new Error('Zone not found');
            }

            // Move to edge of container
            await page.mouse.move(box.x + box.width - 1, box.y + box.height - 1);

            const position = await page.evaluate(() => {
                const el = document.querySelector('.nipple') as HTMLElement;
                return el ? { left: el.offsetLeft, top: el.offsetTop } : null;
            });

            expect(position).toBeTruthy();
            if (position) {
                expect(position.left).toBeLessThanOrEqual(box.width);
                expect(position.top).toBeLessThanOrEqual(box.height);
            }
        });
    });
});
