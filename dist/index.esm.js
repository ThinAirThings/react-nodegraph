import { useRef, useEffect, useState } from 'react';
import { useImmer } from 'use-immer';

const useTrigger = (cleanupCallback) => {
    const [trigger, setTrigger] = useState('triggered');
    return [
        trigger,
        async (triggerState) => {
            if (triggerState === 'triggered') {
                // Run cleanup
                await cleanupCallback?.();
                setTrigger('triggered');
            }
            else if (triggerState === 'done') {
                setTrigger('done');
            }
        },
    ];
};
const useStateMachine = (callback, dependencies, lifecycleHandlers) => {
    // Set result state
    const [result, setResult] = useImmer({
        type: 'pending'
    });
    const [trigger, setTrigger] = useTrigger(() => {
        lifecycleHandlers?.cleanup?.(result.value);
    });
    // Set the retry count ref
    const failureRetryCountRef = useRef(0);
    const failureErrorLogRef = useRef([]);
    const failureRetryCallbackRef = useRef(null);
    // Run the callback
    useEffect(() => {
        (async () => {
            if (trigger === 'triggered') {
                setResult((draft) => {
                    draft.type = 'pending';
                });
                setTrigger('done');
                return;
            }
            if (!dependencies.map(dependencyResult => dependencyResult.type === 'success').every(Boolean)) {
                setResult((draft) => {
                    draft.type = 'pending';
                });
                return;
            }
            if (result.type === 'pending') {
                const depValues = dependencies.map(dep => dep.value);
                lifecycleHandlers?.pending?.(depValues);
                try {
                    const success = failureRetryCallbackRef.current
                        ? await failureRetryCallbackRef.current(depValues)
                        : await callback(depValues);
                    // Clear failure references
                    failureRetryCountRef.current = 0;
                    failureErrorLogRef.current.length = 0;
                    failureRetryCallbackRef.current = null;
                    // Run success handler here to guarantee it run before the child's useEffect
                    lifecycleHandlers?.success?.(success, depValues);
                    setResult(() => ({
                        type: 'success',
                        value: success
                    }));
                }
                catch (_error) {
                    const error = _error;
                    failureRetryCountRef.current++;
                    failureErrorLogRef.current.push(error);
                    const runRetry = (newCallback) => {
                        if (newCallback)
                            failureRetryCallbackRef.current = newCallback;
                        else
                            failureRetryCallbackRef.current = null;
                        setResult(() => ({
                            type: 'pending'
                        }));
                    };
                    setResult(() => ({
                        type: 'failure',
                        value: error
                    }));
                    if (failureRetryCountRef.current > (lifecycleHandlers?.failure?.maxRetryCount ?? 0)) {
                        lifecycleHandlers?.failure?.final?.({
                            errorLog: failureErrorLogRef.current,
                            maxRetryCount: failureRetryCountRef.current
                        });
                        return;
                    }
                    lifecycleHandlers?.failure?.retry?.(error, {
                        runRetry,
                        errorLog: failureErrorLogRef.current,
                        retryAttempt: failureRetryCountRef.current,
                        maxRetryCount: lifecycleHandlers?.failure?.maxRetryCount ?? 0
                    });
                }
            }
        })();
    }, [trigger, result, ...dependencies]); // Add result here
    return [
        result,
        () => setTrigger('triggered')
    ];
};

export { useStateMachine };
