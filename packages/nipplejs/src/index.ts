import type Collection from './Collection';
import Factory from './Factory';
import type { CollectionOptions } from './types';

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
 * Default export containing the create function and factory instance
 */
export default {
    create,
    factory,
} as const;
