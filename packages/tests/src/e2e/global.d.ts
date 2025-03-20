import type Collection from 'nipplejs/Collection';
import type Factory from 'nipplejs/Factory';
import type { Direction } from 'nipplejs/types';

declare global {
    interface Window {
        joystick: Collection;
        nipplejs: { create: (options: any) => Collection; factory: Factory };
        events: string[];
        directions: Direction[];
    }
}
