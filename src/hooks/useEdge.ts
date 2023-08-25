import { useEffect, useRef, useState } from "react"
import { useImmer } from "use-immer"

export type Edge<T> = 
    | {type: 'pending'}
    | {type: 'success', value: T}
    | {type: 'failure', error: Error}

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

type DirectDependencyValues<T1 extends Array<Edge<any>>> = {
    [K in keyof T1]: T1[K] extends Edge<infer U> ? U : never
}
export const useEdge = <T1 extends Array<Edge<any>>, T2>(
    callback: (t1: DirectDependencyValues<T1>) => Promise<T2>,
    t1: T1,
    lifecycleHandlers?: {
        pending?: (t1: DirectDependencyValues<T1>) => void,
        success?: (t2: T2, t1: DirectDependencyValues<T1>) => void
        cleanup?: (value: T2) => Promise<void>|void
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
    const [t2, setT2] = useImmer<Edge<T2>>({
        type: 'pending'
    })
    const [trigger, setTrigger] = useTrigger(() => {
        lifecycleHandlers?.cleanup?.((t2 as Edge<T2> & { type: 'success' }).value)
    })
    // Set the retry count ref
    const failureRetryCountRef = useRef(0)
    const failureErrorLogRef = useRef<Array<Error>>([])
    const failureRetryCallbackRef = useRef<(typeof callback) | null>(null)
    // Run the callback
    useEffect(() => {
        (async () => {
            if (trigger === 'triggered') {
                setT2((edge) => {
                    edge.type = 'pending'
                })
                setTrigger('done')
                return
            }
            if (!t1.map(edge => edge.type === 'success').every(Boolean)) {
                setT2((edge) => {
                    edge.type = 'pending'
                })
                return
            }
            if (t2.type === 'pending') {
                const t1Values = t1.map(edge => (edge as Edge<any>  & { type: 'success' }).value) as DirectDependencyValues<T1>;
                lifecycleHandlers?.pending?.(t1Values)
                try {
                    const success = failureRetryCallbackRef.current 
                        ? await failureRetryCallbackRef.current(t1Values)
                        : await callback(t1Values) 
                    // Clear failure references
                    failureRetryCountRef.current = 0
                    failureErrorLogRef.current.length = 0
                    failureRetryCallbackRef.current = null
                    // Run success handler here to guarantee it run before the child's useEffect
                    lifecycleHandlers?.success?.(success, t1Values)
                    setT2(() => ({
                        type: 'success',
                        value: success
                    }))
                } catch (_error) {
                    const error = _error as Error
                    failureRetryCountRef.current++
                    failureErrorLogRef.current.push(error)
                    const runRetry = (newCallback?: typeof callback) => {
                        if (newCallback) failureRetryCallbackRef.current = newCallback
                        else failureRetryCallbackRef.current = null
                        setT2(() => ({
                            type: 'pending'
                        }))
                    }
                    setT2(() => ({
                        type: 'failure',
                        value: error
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
    }, [trigger, t2, ...t1])   // Add result here
    return [
        t2, 
        () => setTrigger('triggered')
    ] as const
}