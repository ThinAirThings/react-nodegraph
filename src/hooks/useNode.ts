import { FC, useEffect, useRef, useState } from "react"
import { useImmer } from "use-immer"

export type Edge<T> = 
    | {type: 'pending'}
    | {type: 'success', next: T}
    | {type: 'failure', error: Error}

export type Vertex<E1 extends ReadonlyArray<any>> = FC<{
    inputEdges: {
        [K in keyof E1]: Edge<E1[K]>
    }
}>
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

type EdgeValues<E1 extends ReadonlyArray<Record<string, any>>> = {
    [K in keyof E1]: E1[K] extends Edge<infer U> ? U : never
}
export const useNode = <E1 extends ReadonlyArray<any>, E2>(
    callback: (t1: EdgeValues<E1>) => Promise<E2>,
    inputEdges: E1,
    lifecycleHandlers?: {
        pending?: (t1: EdgeValues<E1>) => void,
        success?: (t2: E2, t1: EdgeValues<E1>) => void
        cleanup?: (value: E2) => Promise<void>|void
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
    const [outputEdge, setOutputEdge] = useImmer<Edge<E2>>({
        type: 'pending'
    })
    const [trigger, setTrigger] = useTrigger(() => {
        lifecycleHandlers?.cleanup?.((outputEdge as Edge<E2> & { type: 'success' }).next)
    })
    // Set the retry count ref
    const failureRetryCountRef = useRef(0)
    const failureErrorLogRef = useRef<Array<Error>>([])
    const failureRetryCallbackRef = useRef<(typeof callback) | null>(null)
    // Run the callback
    useEffect(() => {
        (async () => {
            if (trigger === 'triggered') {
                setOutputEdge((edge) => {
                    edge.type = 'pending'
                })
                setTrigger('done')
                return
            }
            if (!inputEdges.map(edge => edge.type === 'success').every(Boolean)) {
                setOutputEdge((edge) => {
                    edge.type = 'pending'
                })
                return
            }
            if (outputEdge.type === 'pending') {
                const edgeValues = inputEdges.map(edge => (edge as Edge<any>  & { type: 'success' }).next) as EdgeValues<E1>;
                lifecycleHandlers?.pending?.(edgeValues)
                try {
                    const success = failureRetryCallbackRef.current 
                        ? await failureRetryCallbackRef.current(edgeValues)
                        : await callback(edgeValues) 
                    // Clear failure references
                    failureRetryCountRef.current = 0
                    failureErrorLogRef.current.length = 0
                    failureRetryCallbackRef.current = null
                    // Run success handler here to guarantee it run before the child's useEffect
                    lifecycleHandlers?.success?.(success, edgeValues)
                    setOutputEdge(() => ({
                        type: 'success',
                        next: success
                    }))
                } catch (_error) {
                    const error = _error as Error
                    failureRetryCountRef.current++
                    failureErrorLogRef.current.push(error)
                    const runRetry = (newCallback?: typeof callback) => {
                        if (newCallback) failureRetryCallbackRef.current = newCallback
                        else failureRetryCallbackRef.current = null
                        setOutputEdge(() => ({
                            type: 'pending'
                        }))
                    }
                    setOutputEdge(() => ({
                        type: 'failure',
                        error: error
                    }))
                    if (failureRetryCountRef.current > (lifecycleHandlers?.failure?.maxRetryCount ?? 0)) {
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
    }, [trigger, outputEdge, ...inputEdges])   // Add result here
    return [
        outputEdge, 
        () => setTrigger('triggered')
    ] as const
}