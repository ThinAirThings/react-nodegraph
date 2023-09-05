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
var useEdge = (callback, inputNodes, opts) => {
  const [outputNode, setOutputValueputNode] = useImmer({
    type: opts?.type ?? "anonymous",
    state: "pending"
  });
  const [trigger, setTrigger] = useTrigger(() => {
    opts?.lifecycleHandlers?.cleanup?.(outputNode.value);
  });
  const failureRetryCountRef = useRef(0);
  const failureErrorLogRef = useRef([]);
  const failureRetryCallbackRef = useRef(null);
  useEffect(() => {
    (async () => {
      if (trigger === "triggered") {
        setOutputValueputNode((node) => {
          node.state = "pending";
        });
        setTrigger("done");
        return;
      }
      if (!inputNodes.map((node) => node.state === "success").every(Boolean)) {
        setOutputValueputNode((node) => {
          node.state = "pending";
        });
        return;
      }
      if (outputNode.state === "pending") {
        const nodeValues = inputNodes.map((node) => ({
          ...node.value,
          type: node.type
        }));
        opts?.lifecycleHandlers?.pending?.(nodeValues);
        try {
          const success = failureRetryCallbackRef.current ? await failureRetryCallbackRef.current(nodeValues) : await callback(nodeValues);
          failureRetryCountRef.current = 0;
          failureErrorLogRef.current.length = 0;
          failureRetryCallbackRef.current = null;
          opts?.lifecycleHandlers?.success?.(success, nodeValues);
          setOutputValueputNode(() => ({
            type: opts?.type ?? "anonymous",
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
            setOutputValueputNode(() => ({
              type: opts?.type ?? "anonymous",
              state: "pending"
            }));
          };
          setOutputValueputNode(() => ({
            type: opts?.type ?? "anonymous",
            state: "failure",
            error
          }));
          if (failureRetryCountRef.current >= (opts?.lifecycleHandlers?.failure?.maxRetryCount ?? 0)) {
            opts?.lifecycleHandlers?.failure?.final?.({
              errorLog: failureErrorLogRef.current,
              maxRetryCount: failureRetryCountRef.current
            });
            return;
          }
          opts?.lifecycleHandlers?.failure?.retry?.(error, {
            runRetry,
            errorLog: failureErrorLogRef.current,
            retryAttempt: failureRetryCountRef.current,
            maxRetryCount: opts?.lifecycleHandlers?.failure?.maxRetryCount ?? 0
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
