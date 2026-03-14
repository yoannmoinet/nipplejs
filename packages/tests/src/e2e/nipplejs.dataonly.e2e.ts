import { test } from '@nipple/tests/_playwright/testParams';

const { expect } = test;

test.describe('NippleJS DataOnly (Issue #201)', () => {
    test('dataOnly fires move events without exception', async ({ page, setupPage }) => {
        await setupPage({
            body: '<div id="zone_joystick"></div>',
            code: () => {
                window.events = [];
                window.context.errors = [];
                window.addEventListener('error', (e) => {
                    window.context.errors.push(e.message);
                });
                window.joystick = window.nipplejs.create({
                    zone: document.getElementById('zone_joystick'),
                    dataOnly: true,
                    mode: 'static',
                    shape: 'square',
                    position: { left: '50%', top: '50%' },
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

        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;

        await page.mouse.move(centerX, centerY);
        await page.mouse.down();
        await page.mouse.move(centerX + 50, centerY + 50, { steps: 10 });
        await page.mouse.up();

        const errors = await page.evaluate(() => window.context.errors);
        expect(errors).toHaveLength(0);

        const events = await page.evaluate(() => window.events);
        expect(events.length).toBeGreaterThan(0);
    });

    test('dataOnly works with dynamic mode', async ({ page, setupPage }) => {
        await setupPage({
            body: '<div id="zone_joystick"></div>',
            code: () => {
                window.events = [];
                window.context.errors = [];
                window.addEventListener('error', (e) => {
                    window.context.errors.push(e.message);
                });
                window.joystick = window.nipplejs.create({
                    zone: document.getElementById('zone_joystick'),
                    dataOnly: true,
                    mode: 'dynamic',
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

        await page.mouse.move(box.x + 50, box.y + 50);
        await page.mouse.down();
        await page.mouse.move(box.x + 100, box.y + 100, { steps: 10 });
        await page.mouse.up();

        const errors = await page.evaluate(() => window.context.errors);
        expect(errors).toHaveLength(0);

        const events = await page.evaluate(() => window.events);
        expect(events.length).toBeGreaterThan(0);
    });

    test('dataOnly event data is correct', async ({ page, setupPage }) => {
        await setupPage({
            body: '<div id="zone_joystick"></div>',
            code: () => {
                window.context.moveData = null;
                window.joystick = window.nipplejs.create({
                    zone: document.getElementById('zone_joystick'),
                    dataOnly: true,
                    mode: 'static',
                    position: { left: '50%', top: '50%' },
                });
                window.joystick.on('move', (evt: any) => {
                    window.context.moveData = evt.data;
                });
            },
        });

        const zone = page.locator('#zone_joystick');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Zone not found');
        }

        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;

        await page.mouse.move(centerX, centerY);
        await page.mouse.down();
        await page.mouse.move(centerX + 40, centerY, { steps: 5 });
        await page.mouse.up();

        const moveData = await page.evaluate(() => {
            const d = window.context.moveData;
            if (!d) {
                return null;
            }
            return {
                hasAngle: d.angle != null && d.angle.degree != null && d.angle.radian != null,
                hasVector: d.vector != null && d.vector.x != null && d.vector.y != null,
                hasDistance: typeof d.distance === 'number',
                hasForce: typeof d.force === 'number',
                hasPosition: d.position != null,
            };
        });

        expect(moveData).not.toBeNull();
        expect(moveData!.hasAngle).toBe(true);
        expect(moveData!.hasVector).toBe(true);
        expect(moveData!.hasDistance).toBe(true);
        expect(moveData!.hasForce).toBe(true);
        expect(moveData!.hasPosition).toBe(true);

        // Verify no DOM elements were created
        const joystickCount = await page.locator('.joystick').count();
        expect(joystickCount).toBe(0);
    });
});
