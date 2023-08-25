import { FC, ReactNode } from "react";
import React from 'react';
export declare const useUpdateParentDependencyFromChildMap: () => import("use-immer").Updater<Map<string, boolean>>;
export declare const useDependencyResolverContext: () => [boolean, (resolved: boolean) => void];
export declare const DependencyLayer: <DependencyTable extends Record<string, FC<any>>>({ dependencyTable, dependencyPropsTable, children, }: {
    dependencyTable: DependencyTable;
    dependencyPropsTable: { [Key in keyof DependencyTable]: DependencyTable[Key] extends FC<infer P> ? P : never; };
    children: ReactNode;
}) => React.JSX.Element;
