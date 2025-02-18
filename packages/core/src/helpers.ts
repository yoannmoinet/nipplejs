import retry from 'async-retry';
import fsp from 'fs/promises';
import fs from 'fs';
import path from 'path';
import type { RequestInit } from 'undici-types';

import type {
    RequestOpts,
} from './types';

// Format a duration 0h 0m 0s 0ms
export const formatDuration = (duration: number) => {
    const days = Math.floor(duration / 1000 / 60 / 60 / 24);
    const usedDuration = duration - days * 24 * 60 * 60 * 1000;
    const d = new Date(usedDuration);
    const hours = d.getUTCHours();
    const minutes = d.getUTCMinutes();
    const seconds = d.getUTCSeconds();
    const milliseconds = d.getUTCMilliseconds();
    return `${days ? `${days}d ` : ''}${hours ? `${hours}h ` : ''}${minutes ? `${minutes}m ` : ''}${
        seconds ? `${seconds}s ` : ''
    }${milliseconds ? `${milliseconds}ms` : ''}`.trim();
};

export const ERROR_CODES_NO_RETRY = [400, 403, 413];
export const NB_RETRIES = 5;
// Do a retriable fetch.
export const doRequest = <T>(opts: RequestOpts): Promise<T> => {
    const { url, method = 'GET', getData, onRetry, type = 'text' } = opts;
    return retry(
        async (bail: (e: Error) => void, attempt: number) => {
            let response: Response;
            try {
                const requestInit: RequestInit = {
                    method,
                    // This is needed for sending body in NodeJS' Fetch.
                    // https://github.com/nodejs/node/issues/46221
                    duplex: 'half',
                };

                let requestHeaders: RequestInit['headers'] = {};
                if (typeof getData === 'function') {
                    const { data, headers } = await getData();
                    requestInit.body = data;
                    requestHeaders = { ...requestHeaders, ...headers };
                }

                response = await fetch(url, { ...requestInit, headers: requestHeaders });
            } catch (error: any) {
                // We don't want to retry if there is a non-fetch related error.
                bail(error);
                // bail(error) throws so the return is never executed.
                return {} as T;
            }

            if (!response.ok) {
                // Not instantiating the error here, as it will make Jest throw in the tests.
                const errorMessage = `HTTP ${response.status} ${response.statusText}`;
                if (ERROR_CODES_NO_RETRY.includes(response.status)) {
                    bail(new Error(errorMessage));
                    // bail(error) throws so the return is never executed.
                    return {} as T;
                } else {
                    // Trigger the retry.
                    throw new Error(errorMessage);
                }
            }

            try {
                let result;
                // Await it so we catch any parsing error and bail.
                if (type === 'json') {
                    result = await response.json();
                } else {
                    result = await response.text();
                }

                return result as T;
            } catch (error: any) {
                // We don't want to retry on parsing errors.
                bail(error);
                // bail(error) throws so the return is never executed.
                return {} as T;
            }
        },
        {
            retries: NB_RETRIES,
            onRetry,
        },
    );
};

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

// Replacing fs-extra with local helpers.
// Delete folders recursively.
export const rm = async (dir: string) => {
    return fsp.rm(dir, { force: true, maxRetries: 3, recursive: true });
};

// Mkdir recursively.
export const mkdir = async (dir: string) => {
    return fsp.mkdir(dir, { recursive: true });
};

export const mkdirSync = (dir: string) => {
    return fs.mkdirSync(dir, { recursive: true });
};

// Write a file but first ensure the directory exists.
export const outputFile = async (filepath: string, data: string) => {
    await mkdir(path.dirname(filepath));
    await fsp.writeFile(filepath, data, { encoding: 'utf-8' });
};

export const outputFileSync = (filepath: string, data: string) => {
    mkdirSync(path.dirname(filepath));
    fs.writeFileSync(filepath, data, { encoding: 'utf-8' });
};

// Output a JSON file.
export const outputJson = async (filepath: string, data: any) => {
    // FIXME: This will crash on strings too long.
    const dataString = JSON.stringify(data, null, 4);
    return outputFile(filepath, dataString);
};

export const outputJsonSync = (filepath: string, data: any) => {
    // FIXME: This will crash on strings too long.
    const dataString = JSON.stringify(data, null, 4);
    outputFileSync(filepath, dataString);
};

// Read a JSON file.
export const readJsonSync = (filepath: string) => {
    const data = fs.readFileSync(filepath, { encoding: 'utf-8' });
    return JSON.parse(data);
};

let index = 0;
export const getUniqueId = () => `${Date.now()}.${performance.now()}.${++index}`;
