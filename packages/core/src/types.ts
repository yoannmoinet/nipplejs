import type { BodyInit } from 'undici-types';

type Data = { data?: BodyInit; headers?: Record<string, string> };
export type RequestOpts = {
    url: string;
    method?: string;
    getData?: () => Promise<Data> | Data;
    type?: 'json' | 'text';
    onRetry?: (error: Error, attempt: number) => void;
};
