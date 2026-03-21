import console from 'console';
import nock from 'nock';

import { toBeWithinRange } from './toBeWithinRange.ts';
import { toRepeatStringTimes } from './toRepeatStringTimes.ts';

// Extend Jest's expect with custom matchers.
expect.extend({
    toBeWithinRange,
    toRepeatStringTimes,
});

interface CustomMatchers<R> {
    toBeWithinRange(floor: number, ceiling: number): R;
    toRepeatStringTimes(st: string | RegExp, occurences: number | [number, number]): R;
}

interface NonCustomMatchers {
    toBeWithinRange(floor: number, ceiling: number): number;
    toRepeatStringTimes(st: string | RegExp, occurences: number | [number, number]): string;
}

declare global {
    namespace jest {
        interface Expect extends NonCustomMatchers {}
        interface Matchers<R> extends CustomMatchers<R> {}
        interface InverseAsymmetricMatchers extends NonCustomMatchers {}
        interface AsymmetricMatchers extends NonCustomMatchers {}
    }
}

// Do not send any HTTP requests.
nock.disableNetConnect();

// Have a simpler, less verbose, console.log output.
// This bypasses Jest's --silent flag though.
global.console = console;

// @ts-expect-error - JSDOM does not support PointerEvent.
global.PointerEvent = MouseEvent;
// @ts-expect-error - JSDOM does not support Touch.
global.Touch = MouseEvent;
