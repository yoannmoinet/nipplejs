import type nipplejs from 'nipplejs';

type Collection = ReturnType<typeof nipplejs.create>;
type CollectionOptions = Parameters<typeof nipplejs.create>[0];

export type { Collection, CollectionOptions };

export interface ZoneConfig {
    options: CollectionOptions;
    position: { left: string; top: string; width: string; height: string };
}

export interface GameConfig {
    zones: ZoneConfig[];
}

export interface GameInstance {
    start(canvas: HTMLCanvasElement, joysticks: Collection[]): void;
    destroy(): void;
}

export type CreateGame = (container: HTMLElement) => {
    config: GameConfig;
    create: () => GameInstance;
};
