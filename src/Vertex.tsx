import { Edge, useVertex } from "./index.js";



export const Vertex = <
    C extends (input: Edge<any>) => Edge<any>
>(
    useVertexComposition: C,
    input: Parameters<C>[0]
): ReturnType<C> => {
    const edge = useVertexType(input);

}


