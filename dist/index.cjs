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
  useNode: () => useNode
});
module.exports = __toCommonJS(src_exports);

// src/hooks/useNode.ts
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
var useNode = (callback, inputEdges, lifecycleHandlers) => {
  const [outputEdge, setOutputEdge] = (0, import_use_immer.useImmer)({
    type: "pending"
  });
  const [trigger, setTrigger] = useTrigger(() => {
    lifecycleHandlers?.cleanup?.(outputEdge.next);
  });
  const failureRetryCountRef = (0, import_react.useRef)(0);
  const failureErrorLogRef = (0, import_react.useRef)([]);
  const failureRetryCallbackRef = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  useNode
});
