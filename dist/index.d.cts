type AirNode<V, T extends string = 'anonymous'> = {
    type: T;
} & ({
    state: 'pending';
} | {
    state: 'success';
    value: V;
} | {
    state: 'failure';
    error: Error;
});
type NodeValue<T extends AirNode<any, any>> = T extends {
    state: 'success';
} ? T['value'] : never;
type LifeCycleHandlers<InputNodes extends ReadonlyArray<AirNode<any, any>>, OutputValue> = Required<Required<Parameters<typeof useEdge<InputNodes, OutputValue>>>[2]>['lifecycleHandlers'];
type NodeValues<T extends ReadonlyArray<AirNode<any, any>>> = {
    [K in keyof T]: NodeValue<T[K]> & {
        type: T[K]['type'];
    };
};
declare const useEdge: <InputNodes extends readonly AirNode<any, any>[], OutputValue, T extends string = "anonymous">(callback: (t1: NodeValues<InputNodes>) => Promise<OutputValue>, inputNodes: InputNodes, opts?: {
    type?: T | undefined;
    lifecycleHandlers?: {
        pending?: ((t1: NodeValues<InputNodes>) => void) | undefined;
        success?: ((t2: OutputValue, t1: NodeValues<InputNodes>) => void) | undefined;
        cleanup?: ((value: OutputValue) => Promise<void> | void) | undefined;
        failure?: {
            maxRetryCount?: number | undefined;
            retry?: ((error: Error, failureLog: {
                runRetry: (newCallback?: ((t1: NodeValues<InputNodes>) => Promise<OutputValue>) | undefined) => void;
                retryAttempt: number;
                maxRetryCount: number;
                errorLog: Array<Error>;
            }) => void) | undefined;
            final?: ((failureLog: {
                maxRetryCount: number;
                errorLog: Array<Error>;
            }) => void) | undefined;
        } | undefined;
    } | undefined;
} | undefined) => readonly [AirNode<OutputValue, T>, () => Promise<void>];

export { AirNode, LifeCycleHandlers, NodeValue, NodeValues, useEdge };
