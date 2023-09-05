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
type InferNode<T extends AirNode<any, any>> = T extends AirNode<infer U, infer V> ? AirNode<U, V> : never;
type InferNodes<T extends ReadonlyArray<AirNode<any, any>>> = {
    [K in keyof T]: T[K] extends AirNode<infer U, infer V> ? AirNode<U, V> : never;
};
declare const useEdge: <In extends readonly AirNode<any, any>[], Out extends AirNode<any, any>, T extends string = "anonymous">(callback: (t1: NodeValues<InferNodes<In>>) => Promise<NodeValue<InferNode<Out>>>, inputNodes: InferNodes<In>, opts?: {
    type?: T | undefined;
    lifecycleHandlers?: {
        pending?: ((t1: NodeValues<InferNodes<In>>) => void) | undefined;
        success?: ((t2: NodeValue<InferNode<Out>>, t1: NodeValues<InferNodes<In>>) => void) | undefined;
        cleanup?: ((value: NodeValue<InferNode<Out>>) => Promise<void> | void) | undefined;
        failure?: {
            maxRetryCount?: number | undefined;
            retry?: ((error: Error, failureLog: {
                runRetry: (newCallback?: ((t1: NodeValues<InferNodes<In>>) => Promise<NodeValue<InferNode<Out>>>) | undefined) => void;
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

export { AirNode, InferNode, InferNodes, LifeCycleHandlers, NodeValue, NodeValues, useEdge };
