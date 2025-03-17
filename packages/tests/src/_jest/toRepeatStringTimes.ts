import type { MatcherFunction } from 'expect';

// Truncate a string to a certain length.
// Placing a [...] placeholder in the middle.
// "A way too long sentence could be truncated a bit." => "A way too[...]could be truncated a bit."
export const truncateString = (
    str: string,
    maxLength: number = 60,
    placeholder: string = '[...]',
) => {
    if (str.length <= maxLength) {
        return str;
    }

    // We want to keep at the very least 4 characters.
    const stringLength = Math.max(4, maxLength - placeholder.length);

    // We want to keep most of the end of the string, hence the 10 chars top limit for left.
    const leftStop = Math.min(10, Math.floor(stringLength / 2));
    const rightStop = stringLength - leftStop;

    return `${str.slice(0, leftStop)}${placeholder}${str.slice(-rightStop)}`;
};

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
