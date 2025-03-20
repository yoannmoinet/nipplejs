import { test, expect } from '@playwright/test';
import type { Coordinates } from 'nipplejs/types';

test.describe.skip('NippleJS Follow Mode', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => {
            window.joystick = window.nipplejs.create({
                zone: document.getElementById('zone_joystick'),
                follow: true,
            });
        });
    });

    test('joystick follows beyond boundaries', async ({ page }) => {
        const zone = page.locator('#zone_joystick');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Zone not found');
        }

        // Move beyond boundary
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * 2, box.y + box.height / 2);

        // Verify joystick followed
        const frontPos = await page.evaluate(() => {
            const front = document.querySelector('.front') as HTMLElement;
            return front ? front.style.transform : '';
        });
        expect(frontPos).toBeTruthy();
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
