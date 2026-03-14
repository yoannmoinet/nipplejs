import { test } from '@nipple/tests/_playwright/testParams';

const { expect } = test;

test.describe('NippleJS Dual Joysticks (Issues #189, #231)', () => {
    test('two static joysticks operate independently', async ({ page, setupPage }) => {
        await setupPage({
            css: `
                #zone_left, #zone_right {
                    position: fixed;
                    top: 0;
                    width: 50%;
                    height: 100%;
                }
                #zone_left { left: 0; background: lightblue; }
                #zone_right { left: 50%; background: lightgreen; }
            `,
            body: '<div id="zone_left"></div><div id="zone_right"></div>',
            code: () => {
                window.context.leftMoves = 0;
                window.context.rightMoves = 0;

                const left = window.nipplejs.create({
                    zone: document.getElementById('zone_left'),
                    mode: 'static',
                    position: { left: '50%', top: '50%' },
                });
                left.on('move', () => {
                    window.context.leftMoves++;
                });

                const right = window.nipplejs.create({
                    zone: document.getElementById('zone_right'),
                    mode: 'static',
                    position: { left: '50%', top: '50%' },
                });
                right.on('move', () => {
                    window.context.rightMoves++;
                });
            },
        });

        // Get zone positions
        const leftZone = page.locator('#zone_left');
        const rightZone = page.locator('#zone_right');
        const leftBox = await leftZone.boundingBox();
        const rightBox = await rightZone.boundingBox();
        if (!leftBox || !rightBox) {
            throw new Error('Zones not found');
        }

        // Interact with left joystick
        const leftCenter = { x: leftBox.x + leftBox.width / 2, y: leftBox.y + leftBox.height / 2 };
        await page.mouse.move(leftCenter.x, leftCenter.y);
        await page.mouse.down();
        await page.mouse.move(leftCenter.x + 30, leftCenter.y, { steps: 5 });
        await page.mouse.up();

        // Interact with right joystick
        const rightCenter = {
            x: rightBox.x + rightBox.width / 2,
            y: rightBox.y + rightBox.height / 2,
        };
        await page.mouse.move(rightCenter.x, rightCenter.y);
        await page.mouse.down();
        await page.mouse.move(rightCenter.x + 30, rightCenter.y, { steps: 5 });
        await page.mouse.up();

        const result = await page.evaluate(() => ({
            leftMoves: window.context.leftMoves,
            rightMoves: window.context.rightMoves,
        }));

        expect(result.leftMoves).toBeGreaterThan(0);
        expect(result.rightMoves).toBeGreaterThan(0);
    });

    test('two joystick collections clean up independently', async ({ page, setupPage }) => {
        await setupPage({
            css: `
                #zone_left, #zone_right {
                    position: fixed;
                    top: 0;
                    width: 50%;
                    height: 100%;
                }
                #zone_left { left: 0; background: lightblue; }
                #zone_right { left: 50%; background: lightgreen; }
            `,
            body: '<div id="zone_left"></div><div id="zone_right"></div>',
            code: () => {
                window.context.leftCollection = window.nipplejs.create({
                    zone: document.getElementById('zone_left'),
                    mode: 'static',
                    position: { left: '50%', top: '50%' },
                });
                window.context.rightCollection = window.nipplejs.create({
                    zone: document.getElementById('zone_right'),
                    mode: 'static',
                    position: { left: '50%', top: '50%' },
                });
            },
        });

        // Verify both exist
        const initialCount = await page.locator('.joystick').count();
        expect(initialCount).toBe(2);

        // Destroy left collection
        await page.evaluate(() => {
            window.context.leftCollection.destroy();
        });

        // Right should still exist
        const afterDestroy = await page.locator('#zone_right .joystick').count();
        expect(afterDestroy).toBe(1);

        // Right joystick should still work
        await page.evaluate(() => {
            window.context.rightMoves = 0;
            window.context.rightCollection.on('move', () => {
                window.context.rightMoves++;
            });
        });

        const rightZone = page.locator('#zone_right');
        const rightBox = await rightZone.boundingBox();
        if (!rightBox) {
            throw new Error('Right zone not found');
        }

        const rightCenter = {
            x: rightBox.x + rightBox.width / 2,
            y: rightBox.y + rightBox.height / 2,
        };
        await page.mouse.move(rightCenter.x, rightCenter.y);
        await page.mouse.down();
        await page.mouse.move(rightCenter.x + 30, rightCenter.y, { steps: 5 });
        await page.mouse.up();

        const rightMoves = await page.evaluate(() => window.context.rightMoves);
        expect(rightMoves).toBeGreaterThan(0);
    });
});
