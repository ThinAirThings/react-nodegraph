type NodeIndex<Nodes extends AirNode<any, any>> = {
    [Node in Nodes as Node['type']]: NodeValue<Nodes & {
        type: Node['type'];
    }>;
};
type GoalNode = AirNode<{
    /** Reasoning as to why this goal was chosen. */
    reasoning: string;
}, `${Capitalize<string>}Node`>;
type Resolver<Success extends AirNode<any, any> = AirNode<Record<string, any>, any>, Failure extends AirNode<any, any> = AirNode<Record<string, any>, any>> = {
    success: (successValue: NodeValue<Success>) => void;
    failure: (failureValue: NodeValue<Failure>) => void;
};
declare const useNodeResolver: () => readonly [Resolver<AirNode<Record<string, any>, any>, AirNode<Record<string, any>, any>>, AirNode<Record<string, any>, "AnonymousNode">, () => Promise<void>];
declare const nodeFromValue: <V, T extends `${Capitalize<string>}Node`>(value: V, type?: T | undefined) => AirNode<V, T>;
type NodeTypeString = `${Capitalize<string>}Node`;
type AirNode<V, T extends NodeTypeString = 'AnonymousNode'> = {
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
type SubtypeAdjacencyAirNode<A extends AirNode<any, any>, AdjacencySet extends AirNode<any, any>> = AirNode<NodeValue<A> & {
    [Subtype in AdjacencySet['type']]: {
        subtype: Subtype;
    } & Omit<NodeValue<AdjacencySet & {
        type: Subtype;
    }>, 'type'>;
}[AdjacencySet['type']], A extends AirNode<any, infer T> ? T : never>;
type NodeValue<T extends AirNode<any, any>> = T extends {
    state: 'success';
} ? T['value'] : never;
type LifeCycleHandlers<InputNodes extends ReadonlyArray<AirNode<any, any>>, OutputNode extends AirNode<any, any>> = Required<Parameters<typeof useEdge<InputNodes, NodeValue<OutputNode>>>>[2]['lifecycleHandlers'];
type NodeValues<T extends ReadonlyArray<AirNode<any, any>>> = {
    [K in keyof T]: NodeValue<T[K]>;
};
declare const useEdge: <InputNodes extends readonly AirNode<any, any>[], OutputValue, T extends `${Capitalize<string>}Node` = "AnonymousNode">(callback: (t1: NodeValues<InputNodes>) => Promise<OutputValue>, inputNodes: InputNodes, opts?: {
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

export { AirNode, GoalNode, LifeCycleHandlers, NodeIndex, NodeTypeString, NodeValue, NodeValues, Resolver, SubtypeAdjacencyAirNode, nodeFromValue, useEdge, useNodeResolver };
