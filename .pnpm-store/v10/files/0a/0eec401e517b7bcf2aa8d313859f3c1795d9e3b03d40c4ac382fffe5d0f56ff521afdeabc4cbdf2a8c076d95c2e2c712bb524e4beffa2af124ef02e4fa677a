import { GraphInputLink, GraphInputNode, GraphLinkCore, GraphNodeCore } from "../types/graph";
import { CoreDataModel } from './core';
export declare type GraphData<N extends GraphInputNode, L extends GraphInputLink> = {
    nodes: N[];
    links?: L[];
};
export declare class GraphDataModel<N extends GraphInputNode, L extends GraphInputLink, OutNode extends GraphNodeCore<N, L> = GraphNodeCore<N, L>, OutLink extends GraphLinkCore<N, L> = GraphLinkCore<N, L>> extends CoreDataModel<GraphData<N, L>> {
    private _nonConnectedNodes;
    private _connectedNodes;
    private _nodes;
    private _links;
    private _inputNodesMap;
    private _nodesMap;
    nodeId: ((n: N) => string | undefined);
    linkId: ((n: L) => string | undefined);
    nodeSort: ((a: N, b: N) => number);
    getNodeById(id: string | number): OutNode;
    get data(): GraphData<N, L>;
    set data(inputData: GraphData<N, L>);
    get nodes(): OutNode[];
    get links(): OutLink[];
    get connectedNodes(): OutNode[];
    get nonConnectedNodes(): OutNode[];
    private findNode;
    private transferState;
    setNodeStateById(id: string, state: Record<string, any>): void;
}
