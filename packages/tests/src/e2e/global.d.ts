import type Collection from 'nipplejs/Collection';
import type { Direction } from 'nipplejs/types';

declare global {
    interface Window {
        joystick: Collection;
        nipplejs: { create: (options: any) => Collection };
        events: string[];
        directions: Direction[];
    }
}
