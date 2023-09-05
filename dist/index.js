// src/hooks/useEdge.ts
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
var useEdge = (callback, inputNodes, lifecycleHandlers) => {
  const [outputNode, setOutputNode] = useImmer({
    type: "internal",
    state: "pending"
  });
  const [trigger, setTrigger] = useTrigger(() => {
    lifecycleHandlers?.cleanup?.(outputNode.value);
  });
  const failureRetryCountRef = useRef(0);
  const failureErrorLogRef = useRef([]);
  const failureRetryCallbackRef = useRef(null);
  useEffect(() => {
    (async () => {
      if (trigger === "triggered") {
        setOutputNode((node) => {
          node.state = "pending";
        });
        setTrigger("done");
        return;
      }
      if (!inputNodes.map((node) => node.state === "success").every(Boolean)) {
        setOutputNode((node) => {
          node.state = "pending";
        });
        return;
      }
      if (outputNode.state === "pending") {
        const nodeValues = inputNodes.map((node) => node.value);
        lifecycleHandlers?.pending?.(nodeValues);
        try {
          const success = failureRetryCallbackRef.current ? await failureRetryCallbackRef.current(nodeValues) : await callback(nodeValues);
          failureRetryCountRef.current = 0;
          failureErrorLogRef.current.length = 0;
          failureRetryCallbackRef.current = null;
          lifecycleHandlers?.success?.(success, nodeValues);
          setOutputNode(() => ({
            state: "success",
            value: success
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
            setOutputNode(() => ({
              state: "pending"
            }));
          };
          setOutputNode(() => ({
            state: "failure",
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
  }, [trigger, outputNode, ...inputNodes]);
  return [
    outputNode,
    () => setTrigger("triggered")
  ];
};
export {
  useEdge
};
