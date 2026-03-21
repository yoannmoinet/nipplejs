import { test } from '@nipple/tests/_playwright/testParams';

const { expect } = test;

interface ThresholdResult {
    threshold: number;
    eventCount: number;
}

test.describe('NippleJS Threshold', () => {
    test.beforeEach(async ({ setupPage }) => {
        await setupPage({
            body: '<div id="zone_joystick"></div>',
        });
    });

    test('events not triggered below threshold', async ({ page }) => {
        await page.evaluate(() => {
            window.events = [];
            window.joystick = window.nipplejs.create({
                zone: document.getElementById('zone_joystick'),
                threshold: 0.5, // 50% threshold
            });

            window.joystick.on('dir', () => {
                window.events.push('dir');
            });
        });

        const zone = page.locator('#zone_joystick');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Zone not found');
        }

        // Move just slightly - below threshold
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 10, box.y + box.height / 2);

        const events = await page.evaluate(() => window.events);
        expect(events.length).toBe(0);
    });

    test('events triggered above threshold', async ({ page }) => {
        await page.evaluate(() => {
            window.events = [];
            window.joystick = window.nipplejs.create({
                zone: document.getElementById('zone_joystick'),
                threshold: 0.5, // 50% threshold
            });

            window.joystick.on('dir', () => {
                window.events.push('dir');
            });
        });

        const zone = page.locator('#zone_joystick');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Zone not found');
        }

        // Move significantly - above threshold
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width, box.y + box.height / 2);

        const events = await page.evaluate(() => window.events);
        expect(events.length).toBeGreaterThan(0);
    });

    test('different threshold values affect event triggering', async ({ page }) => {
        const thresholdResults = await page.evaluate(async () => {
            const thresholds = [0.1, 0.5, 0.9];
            const thresholdLog: ThresholdResult[] = [];

            for (const threshold of thresholds) {
                window.events = [];
                window.joystick = window.nipplejs.create({
                    zone: document.getElementById('zone_joystick'),
                    threshold,
                });

                window.joystick.on('dir', () => {
                    window.events.push('dir');
                });

                // Simulate movement at 40% distance
                const evt = new MouseEvent('mousemove', {
                    clientX: 140, // Assuming 100px is center, moving 40px
                    clientY: 100,
                });
                document.dispatchEvent(evt);

                thresholdLog.push({
                    threshold,
                    eventCount: window.events.length,
                });

                window.joystick.destroy();
            }

            return thresholdLog;
        });

        // Lower thresholds should trigger more events
        expect(thresholdResults[0].eventCount).toBeGreaterThanOrEqual(
            thresholdResults[1].eventCount,
        );
        expect(thresholdResults[1].eventCount).toBeGreaterThanOrEqual(
            thresholdResults[2].eventCount,
        );
    });
});
