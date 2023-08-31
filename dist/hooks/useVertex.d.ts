import { FC } from "react";
export type Edge<T> = {
    type: 'pending';
} | {
    type: 'success';
    value: T;
} | {
    type: 'failure';
    error: Error;
};
export type Vertex<E1 extends ReadonlyArray<any>> = FC<{
    inputEdges: {
        [K in keyof E1]: Edge<E1[K]>;
    };
}>;
type EdgeValues<E1 extends ReadonlyArray<Record<string, any>>> = {
    [K in keyof E1]: E1[K] extends Edge<infer U> ? U : never;
};
export declare const useVertex: <E1 extends readonly any[], E2>(callback: (t1: EdgeValues<E1>) => Promise<E2>, inputEdges: E1, lifecycleHandlers?: {
    pending?: (t1: EdgeValues<E1>) => void;
    success?: (t2: E2, t1: EdgeValues<E1>) => void;
    cleanup?: (value: E2) => Promise<void> | void;
    failure?: {
        maxRetryCount?: number;
        retry?: (error: Error, failureLog: {
            runRetry: (newCallback?: (t1: EdgeValues<E1>) => Promise<E2>) => void;
            retryAttempt: number;
            maxRetryCount: number;
            errorLog: Array<Error>;
        }) => void;
        final?: (failureLog: {
            maxRetryCount: number;
            errorLog: Array<Error>;
        }) => void;
    };
}) => readonly [Edge<E2>, () => Promise<void>];
export {};
