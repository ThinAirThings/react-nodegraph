export type Result<T> = {
    type: 'pending';
} | {
    type: 'success';
    value: T;
} | {
    type: 'failure';
    error: Error;
};
type DependencyValues<Deps extends Array<Result<any>>> = {
    [K in keyof Deps]: Deps[K] extends Result<infer U> ? U : never;
};
export declare const useTriggeredResultEffect: <T, Deps extends Result<any>[]>(callback: (dependencyValues: DependencyValues<Deps>) => Promise<T>, dependencies: Deps, lifecycleHandlers?: {
    pending?: (dependencyValues: DependencyValues<Deps>) => void;
    success?: (value: T, dependencyValues: DependencyValues<Deps>) => void;
    cleanup?: (value: T) => Promise<void> | void;
    failure?: {
        maxRetryCount?: number;
        retry?: (error: Error, failureLog: {
            runRetry: (newCallback?: (dependencyValues: DependencyValues<Deps>) => Promise<T>) => void;
            retryAttempt: number;
            maxRetryCount: number;
            errorLog: Array<Error>;
        }) => void;
        final?: (failureLog: {
            maxRetryCount: number;
            errorLog: Array<Error>;
        }) => void;
    };
}) => readonly [Result<T>, () => Promise<void>];
export {};
