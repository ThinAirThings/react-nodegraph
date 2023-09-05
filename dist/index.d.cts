type AirNode<T> = {
    type: string;
} & ({
    state: 'pending';
} | {
    state: 'success';
    value: T;
} | {
    state: 'failure';
    error: Error;
});
type NodeValues<In extends ReadonlyArray<Record<string, any>>> = {
    [K in keyof In]: In[K] extends AirNode<infer U> ? U : never;
};
declare const useEdge: <In extends readonly any[], Out>(callback: (t1: NodeValues<In>) => Promise<Out>, inputNodes: In, lifecycleHandlers?: {
    pending?: ((t1: NodeValues<In>) => void) | undefined;
    success?: ((t2: Out, t1: NodeValues<In>) => void) | undefined;
    cleanup?: ((value: Out) => Promise<void> | void) | undefined;
    failure?: {
        maxRetryCount?: number | undefined;
        retry?: ((error: Error, failureLog: {
            runRetry: (newCallback?: ((t1: NodeValues<In>) => Promise<Out>) | undefined) => void;
            retryAttempt: number;
            maxRetryCount: number;
            errorLog: Array<Error>;
        }) => void) | undefined;
        final?: ((failureLog: {
            maxRetryCount: number;
            errorLog: Array<Error>;
        }) => void) | undefined;
    } | undefined;
} | undefined) => readonly [AirNode<Out>, () => Promise<void>];

export { AirNode, useEdge };
