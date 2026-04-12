import { Selection } from 'd3-selection';
import { ComponentCore } from "../../core/component";
import { GraphDataModel } from "../../data-models/graph";
import { ExtendedSizeComponent } from "../../types/component";
import { Spacing } from "../../types/spacing";
import { SankeyConfigInterface } from './config';
import * as s from './style';
import { SankeyInputLink, SankeyInputNode, SankeyLink, SankeyNode } from './types';
export declare class Sankey<N extends SankeyInputNode, L extends SankeyInputLink> extends ComponentCore<{
    nodes: N[];
    links?: L[];
}, SankeyConfigInterface<N, L>> implements ExtendedSizeComponent {
    static selectors: typeof s;
    protected _defaultConfig: SankeyConfigInterface<N, L>;
    config: SankeyConfigInterface<N, L>;
    datamodel: GraphDataModel<N, L, SankeyNode<N, L>, SankeyLink<N, L>>;
    g: Selection<SVGGElement, unknown, null, undefined>;
    private _gNode;
    private _prevWidth;
    private _extendedWidth;
    private _extendedHeight;
    private _extendedHeightIncreased;
    private _extendedWidthIncreased;
    private _linksGroup;
    private _nodesGroup;
    private _backgroundRect;
    private _sankey;
    private _highlightTimeoutId;
    private _highlightActive;
    private _zoomScale;
    private _pan;
    private _zoomBehavior;
    private _prevZoomTransform;
    private _animationFrameId;
    private _bleedCached;
    events: {
        [x: string]: {
            mouseenter: (d: SankeyNode<N, L>, event: MouseEvent) => void;
            mouseleave: (d: SankeyNode<N, L>, event: MouseEvent) => void;
        } | {
            mouseenter: (d: SankeyLink<N, L>) => void;
            mouseleave: () => void;
        };
    };
    constructor(config?: SankeyConfigInterface<N, L>);
    get bleed(): Spacing;
    setData(data: {
        nodes: N[];
        links?: L[];
    }): void;
    setConfig(config: SankeyConfigInterface<N, L>): void;
    _render(customDuration?: number): void;
    private _applyPanTransform;
    private _scheduleRender;
    private _getConstrainedPan;
    setZoomScale(horizontalScale?: number, verticalScale?: number, duration?: number): void;
    getZoomScale(): [number, number];
    setPan(x: number, y: number, duration?: number, shouldConstraint?: boolean): void;
    getPan(): [number, number];
    fitView(duration?: number): void;
    private _onZoom;
    private _populateLinkAndNodeValues;
    private _preCalculateComponentSize;
    private _prepareLayout;
    private _applyLayoutScaling;
    getWidth(): number;
    getHeight(): number;
    getLayoutWidth(): number;
    getLayoutHeight(): number;
    getSankeyDepth(): number;
    /** @deprecated Use getLayerXCenters instead */
    getColumnCenters(): number[];
    getLayerXCenters(): number[];
    getLayerYCenters(): number[];
    highlightSubtree(node: SankeyNode<N, L>): void;
    recursiveSetSubtreeState(node: SankeyNode<N, L>, linksKey: 'sourceLinks' | 'targetLinks', nodeKey: 'source' | 'target', key: string, value: unknown): void;
    disableHighlight(): void;
    private _hasLinks;
    private _getLayerSpacing;
    private _onNodeMouseOver;
    private _onNodeMouseOut;
    private _onNodeRectMouseOver;
    private _onNodeRectMouseOut;
    private _onLinkMouseOver;
    private _onLinkMouseOut;
}
