"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  useEdge: () => useEdge
});
module.exports = __toCommonJS(src_exports);

// src/hooks/useEdge.ts
var import_react = require("react");
var import_use_immer = require("use-immer");
var useTrigger = (cleanupCallback) => {
  const [trigger, setTrigger] = (0, import_react.useState)("triggered");
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
  const [outputNode, setOutputValueputNode] = (0, import_use_immer.useImmer)({
    type: opts?.type ?? "anonymous",
    state: "pending"
  });
  const [trigger, setTrigger] = useTrigger(() => {
    opts?.lifecycleHandlers?.cleanup?.(outputNode.value);
  });
  const failureRetryCountRef = (0, import_react.useRef)(0);
  const failureErrorLogRef = (0, import_react.useRef)([]);
  const failureRetryCallbackRef = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  useEdge
});
