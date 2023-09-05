import { type } from "os"
import { useEffect, useRef, useState } from "react"
import { useImmer } from "use-immer"

export type AirNode<V, T extends string='anonymous'> = 
    {type: T} & (
        | {state: 'pending'}
        | {state: 'success', value: V}
        | {state: 'failure', error: Error}
    )


const useTrigger = (cleanupCallback?: () => Promise<void>|void) => {
    const [trigger, setTrigger] = useState<'triggered' | 'done'>('triggered')
    return [
        trigger,
        async (triggerState: 'triggered' | 'done') => {
            if (triggerState === 'triggered') {
                // Run cleanup
                await cleanupCallback?.()
                setTrigger('triggered')
            } else if (triggerState === 'done') {
                setTrigger('done')
            }
        },
    ] as const
}
export type NodeValue<T extends AirNode<any, any>> = T extends {state: 'success'}?T['value']:never
export type LifeCycleHandlers<
    InputNodes extends ReadonlyArray<AirNode<any, any>>, 
    OutputValue
> = Required<
        Required<
            Parameters<
                typeof useEdge<InputNodes, OutputValue>
            >
        >[2]
    >['lifecycleHandlers']

export type NodeValues<T extends ReadonlyArray<AirNode<any, any>>> = {
    [K in keyof T]: NodeValue<T[K]>
}

export const useEdge = <InputNodes extends ReadonlyArray<AirNode<any, any>>, OutputValue, T extends string='anonymous',>(
    callback: (t1: NodeValues<InputNodes>) => Promise<OutputValue>,
    inputNodes: InputNodes ,
    opts?: {
        type?: T, 
        lifecycleHandlers?: {
            pending?: (t1: NodeValues<InputNodes>) => void,
            success?: (t2: OutputValue, t1: NodeValues<InputNodes>) => void
            cleanup?: (value: OutputValue) => Promise<void>|void
            failure?: {
                maxRetryCount?: number
                retry?: (error: Error, failureLog: {
                    runRetry: (newCallback?: typeof callback) => void,
                    retryAttempt: number,
                    maxRetryCount: number,
                    errorLog: Array<Error>
                }) => void
                final?: (failureLog: {
                    maxRetryCount: number,
                    errorLog: Array<Error>
                }) => void
            }
        },
    }
) => {
    // Set result state
    const [outputNode, setOutputValueputNode] = useImmer<AirNode<OutputValue>>(() => ({
        type: opts?.type??'anonymous' as T,
        state: 'pending'
    }) as AirNode<OutputValue>)
    const [trigger, setTrigger] = useTrigger(() => {
        opts?.lifecycleHandlers?.cleanup?.((outputNode as AirNode<any, any> & { state: 'success' }).value)
    })
    // Set the retry count ref
    const failureRetryCountRef = useRef(0)
    const failureErrorLogRef = useRef<Array<Error>>([])
    const failureRetryCallbackRef = useRef<(typeof callback) | null>(null)
    // Run the callback
    useEffect(() => {
        (async () => {
            if (trigger === 'triggered') {
                setOutputValueputNode((node) => {
                    node.state = 'pending'
                })
                setTrigger('done')
                return
            }
            if (!inputNodes.map(node => node.state === 'success').every(Boolean)) {
                setOutputValueputNode((node) => {
                    node.state = 'pending'
                })
                return
            }
            if (outputNode.state === 'pending') {
                const nodeValues = inputNodes.map(node => (node as AirNode<any, any>  & { state: 'success' }).value) as NodeValues<InputNodes>;
                opts?.lifecycleHandlers?.pending?.(nodeValues)
                try {
                    const success = failureRetryCallbackRef.current 
                        ? await failureRetryCallbackRef.current(nodeValues)
                        : await callback(nodeValues) 
                    // Clear failure references
                    failureRetryCountRef.current = 0
                    failureErrorLogRef.current.length = 0
                    failureRetryCallbackRef.current = null
                    // Run success handler here to guarantee it run before the child's useEffect
                    opts?.lifecycleHandlers?.success?.(success, nodeValues)
                    setOutputValueputNode(() => ({
                        type: opts?.type??'anonymous' as T,
                        state: 'success',
                        value: success
                    }))
                } catch (_error) {
                    const error = _error as Error
                    failureRetryCountRef.current++
                    failureErrorLogRef.current.push(error)
                    const runRetry = (newCallback?: typeof callback) => {
                        if (newCallback) failureRetryCallbackRef.current = newCallback
                        else failureRetryCallbackRef.current = null
                        setOutputValueputNode(() => ({
                            type: opts?.type??'anonymous' as T,
                            state: 'pending'
                        }))
                    }
                    setOutputValueputNode(() => ({
                        type: opts?.type??'anonymous' as T,
                        state: 'failure',
                        error: error
                    }))
                    if (failureRetryCountRef.current >= (opts?.lifecycleHandlers?.failure?.maxRetryCount ?? 0)) {
                        opts?.lifecycleHandlers?.failure?.final?.({
                            errorLog: failureErrorLogRef.current,
                            maxRetryCount: failureRetryCountRef.current
                        })
                        return
                    }
                    opts?.lifecycleHandlers?.failure?.retry?.(error, {
                        runRetry,
                        errorLog: failureErrorLogRef.current, 
                        retryAttempt: failureRetryCountRef.current,
                        maxRetryCount: opts?.lifecycleHandlers?.failure?.maxRetryCount ?? 0
                    })
                }
            }
        })()
    }, [trigger, outputNode, ...inputNodes])   // Add result here
    return [
        outputNode, 
        () => setTrigger('triggered')
    ] as const
}