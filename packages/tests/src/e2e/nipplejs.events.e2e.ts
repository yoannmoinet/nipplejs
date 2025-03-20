import { test } from '@nipple/tests/_playwright/testParams';

// Have a similar experience to Jest.
const { expect, beforeEach, describe } = test;

describe.skip('NippleJS Events', () => {
    beforeEach(async ({ page }) => {
        await page.goto('/example/codepen-demo.html');
    });

    test('emits basic lifecycle events', async ({ page }) => {
        // Setup event listeners
        await page.evaluate(() => {
            window.events = [];
            window.joystick.on('start move end', (evt: { type: string }) => {
                window.events.push(evt.type);
            });
        });

        const zone = page.locator('.zone.active');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Could not get zone position');
        }

        // Perform basic interaction
        await page.mouse.move(box.x + 50, box.y + 50);
        await page.mouse.down();
        await page.mouse.move(box.x + 100, box.y + 100);
        await page.mouse.up();

        // Verify events
        const events = await page.evaluate(() => window.events);
        expect(events).toContain('start');
        expect(events).toContain('move');
        expect(events).toContain('end');

        // Verify event order
        expect(events.indexOf('start')).toBeLessThan(events.indexOf('move'));
        expect(events.lastIndexOf('move')).toBeLessThan(events.indexOf('end'));
    });

    test('emits directional events', async ({ page }) => {
        // Setup event listeners
        await page.evaluate(() => {
            window.events = [];
            window.joystick.on('dir:up dir:right dir:down dir:left', (evt: { type: string }) => {
                window.events.push(evt.type);
            });
        });

        const zone = page.locator('.zone.active');
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
            await page.mouse.move(centerX, centerY);
            await page.mouse.down();
            await page.mouse.move(move.x, move.y);
            await page.mouse.up();
        }

        // Verify all directional events were emitted
        const events = await page.evaluate(() => window.events);
        expect(events).toContain('dir:up');
        expect(events).toContain('dir:right');
        expect(events).toContain('dir:down');
        expect(events).toContain('dir:left');
    });

    test('emits plain direction events', async ({ page }) => {
        // Setup event listeners
        await page.evaluate(() => {
            window.events = [];
            window.joystick.on(
                'plain:up plain:right plain:down plain:left',
                (evt: { type: string }) => {
                    window.events.push(evt.type);
                },
            );
        });

        const zone = page.locator('.zone.active');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Could not get zone position');
        }

        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;
        const moveDistance = 50;

        // Move in each plain direction
        await page.mouse.move(centerX, centerY);
        await page.mouse.down();

        // Up
        await page.mouse.move(centerX, centerY - moveDistance);
        // Right
        await page.mouse.move(centerX + moveDistance, centerY);
        // Down
        await page.mouse.move(centerX, centerY + moveDistance);
        // Left
        await page.mouse.move(centerX - moveDistance, centerY);

        await page.mouse.up();

        // Verify all plain direction events were emitted
        const events = await page.evaluate(() => window.events);
        expect(events).toContain('plain:up');
        expect(events).toContain('plain:right');
        expect(events).toContain('plain:down');
        expect(events).toContain('plain:left');
    });

    test('emits pressure events', async ({ page }) => {
        // Setup event listeners
        await page.evaluate(() => {
            window.events = [];
            window.joystick.on('pressure', (evt: { data: number }) => {
                window.events.push(`pressure:${evt.data}`);
            });
        });

        const zone = page.locator('.zone.active');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Could not get zone position');
        }

        // Simulate pressure event
        await page.evaluate(() => {
            const targetZone = document.querySelector('.zone.active');
            if (targetZone) {
                const event = new PointerEvent('pointerdown', {
                    pressure: 2.5,
                    clientX: 50,
                    clientY: 50,
                });
                targetZone.dispatchEvent(event);
            }
        });

        // Verify pressure event was emitted
        const events = await page.evaluate(() => window.events);
        expect(events.some((e) => e.startsWith('pressure:2.5'))).toBe(true);
    });
});
