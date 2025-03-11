import type Collection from './Collection';
import Factory from './Factory';
import type { CollectionOptions } from './types';

const factory = new Factory();
export default {
    create(options: CollectionOptions): Collection {
        return factory.create(options);
    },
    factory,
};
