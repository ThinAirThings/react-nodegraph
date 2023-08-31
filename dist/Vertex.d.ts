import { useVertex } from "./index.js";
export declare const Vertex: <T extends typeof useVertex<any, any>>(useVertexType: T, input: Parameters<T>[0]) => ReturnType<T>;
