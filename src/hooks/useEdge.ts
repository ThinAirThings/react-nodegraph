import { useEffect, useRef, useState } from "react"
import { useImmer } from "use-immer"

export type AirNode<T extends string, V> = 
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

type NodeValues<In extends ReadonlyArray<Record<string, any>>> = {
    [K in keyof In]: In[K] extends AirNode<any, infer U> ? U : never
}
export const useEdge = <T extends string, In extends ReadonlyArray<any>, Out>(
    type: T,
    callback: (t1: NodeValues<In>) => Promise<Out>,
    inputNodes: In,
    lifecycleHandlers?: {
        pending?: (t1: NodeValues<In>) => void,
        success?: (t2: Out, t1: NodeValues<In>) => void
        cleanup?: (value: Out) => Promise<void>|void
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
) => {
    // Set result state
    const [outputNode, setOutputNode] = useImmer<AirNode<any, Out>>({
        type,
        state: 'pending'
    })
    const [trigger, setTrigger] = useTrigger(() => {
        lifecycleHandlers?.cleanup?.((outputNode as AirNode<any, Out> & { state: 'success' }).value)
    })
    // Set the retry count ref
    const failureRetryCountRef = useRef(0)
    const failureErrorLogRef = useRef<Array<Error>>([])
    const failureRetryCallbackRef = useRef<(typeof callback) | null>(null)
    // Run the callback
    useEffect(() => {
        (async () => {
            if (trigger === 'triggered') {
                setOutputNode((node) => {
                    node.state = 'pending'
                })
                setTrigger('done')
                return
            }
            if (!inputNodes.map(node => node.state === 'success').every(Boolean)) {
                setOutputNode((node) => {
                    node.state = 'pending'
                })
                return
            }
            if (outputNode.state === 'pending') {
                const nodeValues = inputNodes.map(node => (node as AirNode<any, any>  & { state: 'success' }).value) as NodeValues<In>;
                lifecycleHandlers?.pending?.(nodeValues)
                try {
                    const success = failureRetryCallbackRef.current 
                        ? await failureRetryCallbackRef.current(nodeValues)
                        : await callback(nodeValues) 
                    // Clear failure references
                    failureRetryCountRef.current = 0
                    failureErrorLogRef.current.length = 0
                    failureRetryCallbackRef.current = null
                    // Run success handler here to guarantee it run before the child's useEffect
                    lifecycleHandlers?.success?.(success, nodeValues)
                    setOutputNode(() => ({
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
                        setOutputNode(() => ({
                            state: 'pending'
                        }))
                    }
                    setOutputNode(() => ({
                        state: 'failure',
                        error: error
                    }))
                    if (failureRetryCountRef.current >= (lifecycleHandlers?.failure?.maxRetryCount ?? 0)) {
                        lifecycleHandlers?.failure?.final?.({
                            errorLog: failureErrorLogRef.current,
                            maxRetryCount: failureRetryCountRef.current
                        })
                        return
                    }
                    lifecycleHandlers?.failure?.retry?.(error, {
                        runRetry,
                        errorLog: failureErrorLogRef.current, 
                        retryAttempt: failureRetryCountRef.current,
                        maxRetryCount: lifecycleHandlers?.failure?.maxRetryCount ?? 0
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