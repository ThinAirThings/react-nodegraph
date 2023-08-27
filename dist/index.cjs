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
const useNode = (callback, inputEdges, lifecycleHandlers) => {
    // Set result state
    const [outputEdge, setOutputEdge] = useImmer.useImmer({
        type: 'pending'
    });
    const [trigger, setTrigger] = useTrigger(() => {
        lifecycleHandlers?.cleanup?.(outputEdge.value);
    });
    // Set the retry count ref
    const failureRetryCountRef = react.useRef(0);
    const failureErrorLogRef = react.useRef([]);
    const failureRetryCallbackRef = react.useRef(null);
    // Run the callback
    react.useEffect(() => {
        (async () => {
            if (trigger === 'triggered') {
                setOutputEdge((edge) => {
                    edge.type = 'pending';
                });
                setTrigger('done');
                return;
            }
            if (!inputEdges.map(edge => edge.type === 'success').every(Boolean)) {
                setOutputEdge((edge) => {
                    edge.type = 'pending';
                });
                return;
            }
            if (outputEdge.type === 'pending') {
                const edgeValues = inputEdges.map(edge => edge.value);
                lifecycleHandlers?.pending?.(edgeValues);
                try {
                    const success = failureRetryCallbackRef.current
                        ? await failureRetryCallbackRef.current(edgeValues)
                        : await callback(edgeValues);
                    // Clear failure references
                    failureRetryCountRef.current = 0;
                    failureErrorLogRef.current.length = 0;
                    failureRetryCallbackRef.current = null;
                    // Run success handler here to guarantee it run before the child's useEffect
                    lifecycleHandlers?.success?.(success, edgeValues);
                    setOutputEdge(() => ({
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
                        setOutputEdge(() => ({
                            type: 'pending'
                        }));
                    };
                    setOutputEdge(() => ({
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
    }, [trigger, outputEdge, ...inputEdges]); // Add result here
    return [
        outputEdge,
        () => setTrigger('triggered')
    ];
};

exports.useNode = useNode;
