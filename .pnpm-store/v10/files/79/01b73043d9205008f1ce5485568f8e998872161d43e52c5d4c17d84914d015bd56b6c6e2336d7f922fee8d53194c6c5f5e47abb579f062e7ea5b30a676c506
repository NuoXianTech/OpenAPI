import { Selection } from 'd3-selection';
import { Transition } from 'd3-transition';
import { GraphInputLink, GraphInputNode } from "../../../../types/graph";
import { Selection$Transition } from "../../../../utils/d3";
import { GraphNode } from '../../types';
import { GraphConfigInterface } from '../../config';
export interface GraphNodeSVGGElement extends SVGGElement {
    nodeShape?: string;
    nodeIcon?: string;
}
export declare function createNodes<N extends GraphInputNode, L extends GraphInputLink>(selection: Selection<SVGGElement, GraphNode<N, L>, SVGGElement, unknown>, config: GraphConfigInterface<N, L>, duration: number, scale?: number): void;
/** Updates the nodes partially according to their `_state` */
export declare function updateNodesPartial<N extends GraphInputNode, L extends GraphInputLink>(selection: Selection<SVGGElement, GraphNode<N, L>, SVGGElement, unknown>, config: GraphConfigInterface<N, L>, duration: number, scale?: number): void;
export declare function updateNodePositions<N extends GraphInputNode, L extends GraphInputLink>(selection: Selection<SVGGElement, GraphNode<N, L>, SVGGElement, unknown>, duration: number): Selection$Transition<SVGGElement, GraphNode<N, L>, SVGGElement, unknown>;
export declare function updateNodes<N extends GraphInputNode, L extends GraphInputLink>(selection: Selection<SVGGElement, GraphNode<N, L>, SVGGElement, unknown>, config: GraphConfigInterface<N, L>, duration: number, scale?: number): Selection<SVGGElement, GraphNode<N, L>, SVGGElement, unknown> | Transition<SVGGElement, GraphNode<N, L>, SVGGElement, unknown>;
export declare function removeNodes<N extends GraphInputNode, L extends GraphInputLink>(selection: Selection<SVGGElement, GraphNode<N, L>, SVGGElement, unknown>, config: GraphConfigInterface<N, L>, duration: number, scale?: number): void;
export declare function zoomNodes<N extends GraphInputNode, L extends GraphInputLink>(selection: Selection<SVGGElement, GraphNode<N, L>, SVGGElement, unknown>, config: GraphConfigInterface<N, L>, scale: number): void;
export declare const zoomNodesThrottled: import("throttle-debounce").throttle<typeof zoomNodes>;
