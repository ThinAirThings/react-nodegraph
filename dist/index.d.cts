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
type LifeCycleHandlers<In extends ReadonlyArray<AirNode<any, any>>, Out extends AirNode<any, any>> = Required<Required<Parameters<typeof useEdge<In, Out>>>[2]>['lifecycleHandlers'];
type NodeValues<T extends ReadonlyArray<AirNode<any, any>>> = {
    [K in keyof T]: NodeValue<T[K]>;
};
declare const useEdge: <In extends readonly AirNode<any, any>[], Out extends AirNode<any, any>, T extends string = "anonymous">(callback: (t1: NodeValues<In>) => Promise<NodeValue<Out>>, inputNodes: In, opts?: {
    type?: T | undefined;
    lifecycleHandlers?: {
        pending?: ((t1: NodeValues<In>) => void) | undefined;
        success?: ((t2: NodeValue<Out>, t1: NodeValues<In>) => void) | undefined;
        cleanup?: ((value: NodeValue<Out>) => Promise<void> | void) | undefined;
        failure?: {
            maxRetryCount?: number | undefined;
            retry?: ((error: Error, failureLog: {
                runRetry: (newCallback?: ((t1: NodeValues<In>) => Promise<NodeValue<Out>>) | undefined) => void;
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
} | undefined) => readonly [Out, () => Promise<void>];

export { AirNode, LifeCycleHandlers, NodeValue, NodeValues, useEdge };
