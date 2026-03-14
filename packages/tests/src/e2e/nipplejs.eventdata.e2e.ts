import { test } from '@nipple/tests/_playwright/testParams';

const { expect } = test;

test.describe('NippleJS Event Data Correctness', () => {
    test.beforeEach(async ({ setupPage }) => {
        await setupPage({
            body: '<div id="zone_joystick"></div>',
        });
    });

    test('move event data contains all required fields', async ({ page }) => {
        await page.evaluate(() => {
            window.context.moveData = null;
            window.joystick.on('move', (evt: any) => {
                window.context.moveData = {
                    hasAngle: evt.data.angle != null,
                    hasAngleDegree: typeof evt.data.angle?.degree === 'number',
                    hasAngleRadian: typeof evt.data.angle?.radian === 'number',
                    hasVector: evt.data.vector != null,
                    hasVectorX: typeof evt.data.vector?.x === 'number',
                    hasVectorY: typeof evt.data.vector?.y === 'number',
                    hasDistance: typeof evt.data.distance === 'number',
                    hasForce: typeof evt.data.force === 'number',
                    hasPressure: typeof evt.data.pressure === 'number',
                    hasPosition: evt.data.position != null,
                    hasRaw: evt.data.raw != null,
                    hasInstance: evt.data.instance != null,
                };
            });
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

        const moveData = await page.evaluate(() => window.context.moveData);
        expect(moveData).not.toBeNull();
        expect(moveData.hasAngle).toBe(true);
        expect(moveData.hasAngleDegree).toBe(true);
        expect(moveData.hasAngleRadian).toBe(true);
        expect(moveData.hasVector).toBe(true);
        expect(moveData.hasVectorX).toBe(true);
        expect(moveData.hasVectorY).toBe(true);
        expect(moveData.hasDistance).toBe(true);
        expect(moveData.hasForce).toBe(true);
        expect(moveData.hasPressure).toBe(true);
        expect(moveData.hasPosition).toBe(true);
        expect(moveData.hasRaw).toBe(true);
        expect(moveData.hasInstance).toBe(true);
    });

    test('direction events fire with correct cardinal directions', async ({ page }) => {
        await page.evaluate(() => {
            window.context.dirEvents = [];
            window.joystick.on('dir:up dir:right dir:down dir:left', (evt: { type: string }) => {
                window.context.dirEvents.push(evt.type);
            });
        });

        const zone = page.locator('#zone_joystick');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Zone not found');
        }

        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;
        const moveDistance = 60;

        // Move right
        await page.mouse.move(centerX, centerY);
        await page.mouse.down();
        await page.mouse.move(centerX + moveDistance, centerY, { steps: 10 });
        await page.mouse.up();

        // Move up
        await page.mouse.move(centerX, centerY);
        await page.mouse.down();
        await page.mouse.move(centerX, centerY - moveDistance, { steps: 10 });
        await page.mouse.up();

        // Move down
        await page.mouse.move(centerX, centerY);
        await page.mouse.down();
        await page.mouse.move(centerX, centerY + moveDistance, { steps: 10 });
        await page.mouse.up();

        // Move left
        await page.mouse.move(centerX, centerY);
        await page.mouse.down();
        await page.mouse.move(centerX - moveDistance, centerY, { steps: 10 });
        await page.mouse.up();

        const dirEvents = await page.evaluate(() => window.context.dirEvents);
        expect(dirEvents).toContain('dir:right');
        expect(dirEvents).toContain('dir:up');
        expect(dirEvents).toContain('dir:down');
        expect(dirEvents).toContain('dir:left');
    });

    test('force and distance scale correctly', async ({ page }) => {
        await page.evaluate(() => {
            window.context.smallForce = null;
            window.context.largeForce = null;
        });

        const zone = page.locator('#zone_joystick');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Zone not found');
        }

        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;

        // Small movement
        await page.evaluate(() => {
            window.joystick.on('move', (evt: any) => {
                window.context.smallForce = {
                    force: evt.data.force,
                    distance: evt.data.distance,
                };
            });
        });

        await page.mouse.move(centerX, centerY);
        await page.mouse.down();
        await page.mouse.move(centerX + 10, centerY, { steps: 5 });
        await page.mouse.up();

        // Large movement
        await page.evaluate(() => {
            window.joystick.off('move');
            window.joystick.on('move', (evt: any) => {
                window.context.largeForce = {
                    force: evt.data.force,
                    distance: evt.data.distance,
                };
            });
        });

        await page.mouse.move(centerX, centerY);
        await page.mouse.down();
        await page.mouse.move(centerX + 80, centerY, { steps: 5 });
        await page.mouse.up();

        const result = await page.evaluate(() => ({
            small: window.context.smallForce,
            large: window.context.largeForce,
        }));

        expect(result.small).not.toBeNull();
        expect(result.large).not.toBeNull();
        expect(result.large.force).toBeGreaterThan(result.small.force);
        expect(result.large.distance).toBeGreaterThan(result.small.distance);
    });

    test('vector values are normalized', async ({ page }) => {
        await page.evaluate(() => {
            window.context.vectors = [];
            window.joystick.on('move', (evt: any) => {
                window.context.vectors.push({
                    x: evt.data.vector.x,
                    y: evt.data.vector.y,
                });
            });
        });

        const zone = page.locator('#zone_joystick');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Zone not found');
        }

        // Move far to ensure we hit max range
        await page.mouse.move(box.x + 50, box.y + 50);
        await page.mouse.down();
        await page.mouse.move(box.x + 100, box.y + 100, { steps: 10 });
        await page.mouse.up();

        const vectors = await page.evaluate(() => window.context.vectors);
        expect(vectors.length).toBeGreaterThan(0);

        // All vector components should be between -1 and 1
        for (const v of vectors) {
            expect(v.x).toBeGreaterThanOrEqual(-1);
            expect(v.x).toBeLessThanOrEqual(1);
            expect(v.y).toBeGreaterThanOrEqual(-1);
            expect(v.y).toBeLessThanOrEqual(1);
        }
    });
});
