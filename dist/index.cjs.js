'use strict';

var react = require('react');
var useImmer = require('use-immer');

const useTrigger = (cleanupCallback) => {
    const [trigger, setTrigger] = react.useState('triggered');
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
const useEdge = (callback, t1, lifecycleHandlers) => {
    // Set result state
    const [t2, setT2] = useImmer.useImmer({
        type: 'pending'
    });
    const [trigger, setTrigger] = useTrigger(() => {
        lifecycleHandlers?.cleanup?.(t2.value);
    });
    // Set the retry count ref
    const failureRetryCountRef = react.useRef(0);
    const failureErrorLogRef = react.useRef([]);
    const failureRetryCallbackRef = react.useRef(null);
    // Run the callback
    react.useEffect(() => {
        (async () => {
            if (trigger === 'triggered') {
                setT2((edge) => {
                    edge.type = 'pending';
                });
                setTrigger('done');
                return;
            }
            if (!t1.map(edge => edge.type === 'success').every(Boolean)) {
                setT2((edge) => {
                    edge.type = 'pending';
                });
                return;
            }
            if (t2.type === 'pending') {
                const t1Values = t1.map(edge => edge.value);
                lifecycleHandlers?.pending?.(t1Values);
                try {
                    const success = failureRetryCallbackRef.current
                        ? await failureRetryCallbackRef.current(t1Values)
                        : await callback(t1Values);
                    // Clear failure references
                    failureRetryCountRef.current = 0;
                    failureErrorLogRef.current.length = 0;
                    failureRetryCallbackRef.current = null;
                    // Run success handler here to guarantee it run before the child's useEffect
                    lifecycleHandlers?.success?.(success, t1Values);
                    setT2(() => ({
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
                        setT2(() => ({
                            type: 'pending'
                        }));
                    };
                    setT2(() => ({
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
    }, [trigger, t2, ...t1]); // Add result here
    return [
        t2,
        () => setTrigger('triggered')
    ];
};

exports.useEdge = useEdge;
