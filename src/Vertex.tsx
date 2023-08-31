import { Edge, useVertex } from "./index.js";



export const Vertex = <
    T extends typeof useVertex<any, any>
>(
    useVertexType: T,
    input: Parameters<T>[0]
): ReturnType<T> => {
    const vertex = useCallback(input);
}

const useStockDataVertex = (inputEdge: Edge<{
    /**The ticker symbol of the stock/equity. Examples: APPL, ABT, MMM, ACN, ADBE*/ 
    stocksTicker: string,
    /**The size of the timespan multiplier.*/ 
    multiplier: number,
    /**The size of the time window.*/ 
    timespan: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' |'year'
    /**The start of the aggregate time window. Either a date with the format YYYY-MM-DD or a millisecond timestamp.*/
    from: `${number}-${number}-${number}`,
    /**The end of the aggregate time window. Either a date with the format YYYY-MM-DD or a millisecond timestamp.*/
    to: `${number}-${number}-${number}`,
    /**Limits the number of base aggregates queried to create the aggregate results. Max 50000 and Default 5000.*/
    limit?: number,
}>) => useVertex(async ([data]) => {
    console.log(data)
    return {
        data: 5
    };
}, [inputEdge])
