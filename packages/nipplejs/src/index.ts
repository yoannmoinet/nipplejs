import Factory from './Factory';
import type { CollectionOptions } from './types';

const factory = new Factory();
export default {
    create(options: CollectionOptions) {
        return factory.create(options);
    },
    factory,
};
