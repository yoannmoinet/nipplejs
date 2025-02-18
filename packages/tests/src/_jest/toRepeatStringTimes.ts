import type { MatcherFunction } from 'expect';

export const toRepeatStringTimes: MatcherFunction<
    [st: string | RegExp, occurences: number | [number, number]]
> =
    // `st` and `occurences` get types from the line above
    function toRepeatStringTimes(actual, st, occurences) {
        if (typeof actual !== 'string' || (typeof st !== 'string' && !(st instanceof RegExp))) {
            throw new TypeError('Only works with strings or RegExp.');
        }
        if (
            typeof occurences !== 'number' &&
            (!Array.isArray(occurences) || occurences.length !== 2)
        ) {
            throw new TypeError('Need a number or an array of two numbers.');
        }

        const { truncateString } = jest.requireActual('@dd/core/helpers');
        const result = actual.split(st).length - 1;
        const isRange = Array.isArray(occurences);
        const pass = isRange
            ? result <= occurences[1] && result >= occurences[0]
            : result === occurences;

        const time = (num: number) => (num > 1 ? 'times' : 'time');
        const failure = !pass
            ? `\n\nBut got it ${this.utils.printReceived(result)} ${time(result)}.`
            : '.';
        const expected = this.utils.printReceived(truncateString(actual).replace(/\n/g, ' '));
        const expectedSt = isRange
            ? `Between ${this.utils.printExpected(`${occurences[0]} and ${occurences[1]}`)} times${failure}`
            : `Exactly ${this.utils.printExpected(occurences)} ${time(occurences)}${failure}`;

        const message = `Expected: ${expected}\nTo repeat ${this.utils.printExpected(st)}\n${expectedSt}`;

        return {
            message: () => message,
            pass,
        };
    };
