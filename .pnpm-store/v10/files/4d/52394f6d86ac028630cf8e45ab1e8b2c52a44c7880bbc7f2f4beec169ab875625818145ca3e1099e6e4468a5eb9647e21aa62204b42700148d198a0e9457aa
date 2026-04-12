import { Selection } from 'd3-selection';
import { GraphInputLink, GraphInputNode } from "../../../../types/graph";
import { GraphLink, GraphLinkArrowStyle } from '../../types';
import { GraphConfigInterface } from '../../config';
export declare function createLinks<N extends GraphInputNode, L extends GraphInputLink>(selection: Selection<SVGGElement, GraphLink<N, L>, SVGGElement, unknown>): void;
/** Updates the links partially according to their `_state` */
export declare function updateLinksPartial<N extends GraphInputNode, L extends GraphInputLink>(selection: Selection<SVGGElement, GraphLink<N, L>, SVGGElement, unknown>, config: GraphConfigInterface<N, L>, scale: number): void;
export declare function updateLinkLines<N extends GraphInputNode, L extends GraphInputLink>(selection: Selection<SVGGElement, GraphLink<N, L>, SVGGElement, unknown>, config: GraphConfigInterface<N, L>, duration: number, scale: number, getLinkArrowDefId: (arrow: GraphLinkArrowStyle | undefined) => string, linkPathLengthMap: Map<string, number>): Selection<SVGGElement, GraphLink<N, L>, SVGGElement, unknown>;
export declare function updateLinks<N extends GraphInputNode, L extends GraphInputLink>(selection: Selection<SVGGElement, GraphLink<N, L>, SVGGElement, unknown>, config: GraphConfigInterface<N, L>, duration: number, scale: number, getLinkArrowDefId: (arrow: GraphLinkArrowStyle | undefined) => string, linkPathLengthMap: Map<string, number>): void;
export declare function removeLinks<N extends GraphInputNode, L extends GraphInputLink>(selection: Selection<SVGGElement, GraphLink<N, L>, SVGGElement, unknown>, config: GraphConfigInterface<N, L>, duration: number): void;
export declare function animateLinkFlow<N extends GraphInputNode, L extends GraphInputLink>(selection: Selection<SVGGElement, GraphLink<N, L>, SVGGElement, unknown>, config: GraphConfigInterface<N, L>, scale: number, linkPathLengthMap: Map<string, number>): void;
export declare function zoomLinks<N extends GraphInputNode, L extends GraphInputLink>(selection: Selection<SVGGElement, GraphLink<N, L>, SVGGElement, unknown>, config: GraphConfigInterface<N, L>, scale: number): void;
export declare const zoomLinksThrottled: import("throttle-debounce").throttle<typeof zoomLinks>;
