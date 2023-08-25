export type Edge<T> = {
    type: 'pending';
} | {
    type: 'success';
    value: T;
} | {
    type: 'failure';
    error: Error;
};
type DirectDependencyValues<T1 extends Array<Edge<any>>> = {
    [K in keyof T1]: T1[K] extends Edge<infer U> ? U : never;
};
export declare const useEdge: <T1 extends Edge<any>[], T2>(callback: (t1: DirectDependencyValues<T1>) => Promise<T2>, t1: T1, lifecycleHandlers?: {
    pending?: (t1: DirectDependencyValues<T1>) => void;
    success?: (t2: T2, t1: DirectDependencyValues<T1>) => void;
    cleanup?: (value: T2) => Promise<void> | void;
    failure?: {
        maxRetryCount?: number;
        retry?: (error: Error, failureLog: {
            runRetry: (newCallback?: (t1: DirectDependencyValues<T1>) => Promise<T2>) => void;
            retryAttempt: number;
            maxRetryCount: number;
            errorLog: Array<Error>;
        }) => void;
        final?: (failureLog: {
            maxRetryCount: number;
            errorLog: Array<Error>;
        }) => void;
    };
}) => readonly [Edge<T2>, () => Promise<void>];
export {};
