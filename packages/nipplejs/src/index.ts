import type Collection from './Collection';
import Factory from './Factory';
import Super from './Super';
import type { CollectionOptions, LogLevel } from './types';

/**
 * Singleton Factory instance used to create joystick collections
 */
export const factory = new Factory();

/**
 * Creates a new Collection of joysticks with the given options
 * @param options Configuration options for creating the joystick collection
 * @returns A Collection instance that manages the created joysticks
 */
export const create = (options: CollectionOptions): Collection => {
    return factory.create(options);
};

/**
 * Set the log level for nipplejs.
 * - `'debug'` — all logs (verbose)
 * - `'info'` — info, warnings, and errors
 * - `'warning'` — warnings and errors (default)
 * - `'error'` — errors only
 * - `'none'` — silent
 */
export const setLogLevel = (level: LogLevel): void => {
    Super.logLevel = level;
};

/**
 * Get the current log level.
 */
export const getLogLevel = (): LogLevel => {
    return Super.logLevel;
};

/**
 * Default export containing the create function and factory instance
 */
export default {
    create,
    factory,
    setLogLevel,
    getLogLevel,
} as const;
