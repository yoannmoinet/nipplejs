import { test } from '@nipple/tests/_playwright/testParams';

const { expect } = test;

test.describe('NippleJS Semi Mode', () => {
    test.beforeEach(async ({ setupPage }) => {
        await setupPage({
            body: '<div id="zone_joystick"></div>',
            code: () => {
                window.joystick = window.nipplejs.create({
                    zone: document.getElementById('zone_joystick'),
                    mode: 'semi',
                    catchDistance: 200,
                    fadeTime: 50,
                });
            },
        });
    });

    test('semi mode reuses joystick within catchDistance', async ({ page }) => {
        const zone = page.locator('#zone_joystick');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Zone not found');
        }

        const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

        // First touch — creates joystick
        await page.mouse.move(center.x, center.y);
        await page.mouse.down();
        await page.mouse.move(center.x + 20, center.y, { steps: 5 });
        await page.mouse.up();

        // Get the UID of the first joystick
        const firstUid = await page.evaluate(() => {
            const el = document.querySelector('.joystick');
            return el ? el.id : null;
        });
        expect(firstUid).not.toBeNull();

        // Wait for rest animation
        await page.waitForTimeout(200);

        // Second touch nearby (within catchDistance)
        await page.mouse.move(center.x + 10, center.y + 10);
        await page.mouse.down();
        await page.mouse.move(center.x + 30, center.y + 10, { steps: 5 });

        // Should reuse the same joystick
        const secondUid = await page.evaluate(() => {
            const els = document.querySelectorAll('.joystick');
            // Filter to visible ones
            const visible = Array.from(els).filter(
                (el) => (el as HTMLElement).style.display !== 'none',
            );
            return visible.length > 0 ? visible[0].id : null;
        });

        expect(secondUid).toBe(firstUid);
        await page.mouse.up();
    });

    test('semi mode creates new joystick beyond catchDistance', async ({ page }) => {
        const zone = page.locator('#zone_joystick');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Zone not found');
        }

        // First touch at top-left
        await page.mouse.move(box.x + 50, box.y + 50);
        await page.mouse.down();
        await page.mouse.move(box.x + 70, box.y + 50, { steps: 5 });
        await page.mouse.up();

        const firstUid = await page.evaluate(() => {
            const el = document.querySelector('.joystick');
            return el ? el.id : null;
        });

        // Wait for animations
        await page.waitForTimeout(200);

        // Second touch far away (beyond catchDistance of 200)
        await page.mouse.move(box.x + box.width - 50, box.y + box.height - 50);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width - 30, box.y + box.height - 50, { steps: 5 });

        const secondUid = await page.evaluate(() => {
            const els = document.querySelectorAll('.joystick');
            const visible = Array.from(els).filter(
                (el) => (el as HTMLElement).style.display !== 'none',
            );
            return visible.length > 0 ? visible[visible.length - 1].id : null;
        });

        // Should be a different joystick
        expect(secondUid).not.toBe(firstUid);
        await page.mouse.up();
    });

    test('semi mode joystick returns to position after release', async ({ page }) => {
        const zone = page.locator('#zone_joystick');
        const box = await zone.boundingBox();
        if (!box) {
            throw new Error('Zone not found');
        }

        await page.evaluate(() => {
            window.events = [];
            window.joystick.on('rested', () => {
                window.events.push('rested');
            });
        });

        const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

        // Create and move joystick
        await page.mouse.move(center.x, center.y);
        await page.mouse.down();
        await page.mouse.move(center.x + 40, center.y + 40, { steps: 5 });
        await page.mouse.up();

        // Wait for rest animation
        await page.waitForTimeout(300);

        const events = await page.evaluate(() => window.events);
        expect(events).toContain('rested');

        // Verify the front element returned to center (transform should be near 0,0)
        const frontTransform = await page.evaluate(() => {
            const front = document.querySelector('.joystick .front') as HTMLElement;
            return front ? front.style.transform : null;
        });

        expect(frontTransform).toContain('translate(0px, 0px)');
    });
});
