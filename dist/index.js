// src/hooks/useNode.ts
import { useEffect, useRef, useState } from "react";
import { useImmer } from "use-immer";
var useTrigger = (cleanupCallback) => {
  const [trigger, setTrigger] = useState("triggered");
  return [
    trigger,
    async (triggerState) => {
      if (triggerState === "triggered") {
        await cleanupCallback?.();
        setTrigger("triggered");
      } else if (triggerState === "done") {
        setTrigger("done");
      }
    }
  ];
};
var useNode = (callback, inputEdges, lifecycleHandlers) => {
  const [outputEdge, setOutputEdge] = useImmer({
    type: "pending"
  });
  const [trigger, setTrigger] = useTrigger(() => {
    lifecycleHandlers?.cleanup?.(outputEdge.next);
  });
  const failureRetryCountRef = useRef(0);
  const failureErrorLogRef = useRef([]);
  const failureRetryCallbackRef = useRef(null);
  useEffect(() => {
    (async () => {
      if (trigger === "triggered") {
        setOutputEdge((edge) => {
          edge.type = "pending";
        });
        setTrigger("done");
        return;
      }
      if (!inputEdges.map((edge) => edge.type === "success").every(Boolean)) {
        setOutputEdge((edge) => {
          edge.type = "pending";
        });
        return;
      }
      if (outputEdge.type === "pending") {
        const edgeValues = inputEdges.map((edge) => edge.next);
        lifecycleHandlers?.pending?.(edgeValues);
        try {
          const success = failureRetryCallbackRef.current ? await failureRetryCallbackRef.current(edgeValues) : await callback(edgeValues);
          failureRetryCountRef.current = 0;
          failureErrorLogRef.current.length = 0;
          failureRetryCallbackRef.current = null;
          lifecycleHandlers?.success?.(success, edgeValues);
          setOutputEdge(() => ({
            type: "success",
            next: success
          }));
        } catch (_error) {
          const error = _error;
          failureRetryCountRef.current++;
          failureErrorLogRef.current.push(error);
          const runRetry = (newCallback) => {
            if (newCallback)
              failureRetryCallbackRef.current = newCallback;
            else
              failureRetryCallbackRef.current = null;
            setOutputEdge(() => ({
              type: "pending"
            }));
          };
          setOutputEdge(() => ({
            type: "failure",
            error
          }));
          if (failureRetryCountRef.current >= (lifecycleHandlers?.failure?.maxRetryCount ?? 0)) {
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
  }, [trigger, outputEdge, ...inputEdges]);
  return [
    outputEdge,
    () => setTrigger("triggered")
  ];
};
export {
  useNode
};
