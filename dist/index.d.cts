import { FC } from 'react';

type Edge<T> = {
    type: 'pending';
} | {
    type: 'success';
    next: T;
} | {
    type: 'failure';
    error: Error;
};
type Vertex<E1 extends ReadonlyArray<any>> = FC<{
    inputEdges: {
        [K in keyof E1]: Edge<E1[K]>;
    };
}>;
type EdgeValues<E1 extends ReadonlyArray<Record<string, any>>> = {
    [K in keyof E1]: E1[K] extends Edge<infer U> ? U : never;
};
declare const useNode: <E1 extends readonly any[], E2>(callback: (t1: EdgeValues<E1>) => Promise<E2>, inputEdges: E1, lifecycleHandlers?: {
    pending?: ((t1: EdgeValues<E1>) => void) | undefined;
    success?: ((t2: E2, t1: EdgeValues<E1>) => void) | undefined;
    cleanup?: ((value: E2) => Promise<void> | void) | undefined;
    failure?: {
        maxRetryCount?: number | undefined;
        retry?: ((error: Error, failureLog: {
            runRetry: (newCallback?: ((t1: EdgeValues<E1>) => Promise<E2>) | undefined) => void;
            retryAttempt: number;
            maxRetryCount: number;
            errorLog: Array<Error>;
        }) => void) | undefined;
        final?: ((failureLog: {
            maxRetryCount: number;
            errorLog: Array<Error>;
        }) => void) | undefined;
    } | undefined;
} | undefined) => readonly [Edge<E2>, () => Promise<void>];

export { Edge, Vertex, useNode };
