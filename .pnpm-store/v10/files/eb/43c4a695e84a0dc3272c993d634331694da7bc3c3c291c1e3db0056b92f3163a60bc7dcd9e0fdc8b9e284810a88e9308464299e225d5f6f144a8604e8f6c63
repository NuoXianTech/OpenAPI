import { Selection } from 'd3-selection';
import { ComponentCore } from "../../core/component";
import { GraphDataModel } from "../../data-models/graph";
import { GraphInputLink, GraphInputNode, GraphInputData } from "../../types/graph";
import { Spacing } from "../../types/spacing";
import { GraphNode, GraphLink, GraphFitViewAlignment } from './types';
import { GraphConfigInterface } from './config';
import * as nodeSelectors from './modules/node/style';
export declare class Graph<N extends GraphInputNode, L extends GraphInputLink> extends ComponentCore<GraphInputData<N, L>, GraphConfigInterface<N, L>> {
    static selectors: {
        root: string;
        graphGroup: string;
        background: string;
        node: string;
        nodeShape: string;
        nodeGauge: string;
        nodeSideLabel: string;
        nodeLabel: string;
        dimmedNode: string;
        link: string;
        linkLine: string;
        linkLabel: string;
        dimmedLink: string;
        panel: string;
        panelRect: string;
        panelSelection: string;
        panelLabel: string;
        panelLabelText: string;
        panelSideIcon: string;
        panelSideIconShape: string;
        panelSideIconSymbol: string;
    };
    static nodeSelectors: typeof nodeSelectors;
    g: Selection<SVGGElement, unknown, null, undefined>;
    protected _defaultConfig: GraphConfigInterface<N, L>;
    config: GraphConfigInterface<N, L>;
    datamodel: GraphDataModel<N, L, GraphNode<N, L>, GraphLink<N, L>>;
    private _selectedNodes;
    private _selectedLink;
    private _graphGroup;
    private _panelsGroup;
    private _linksGroup;
    private _nodesGroup;
    private _brush;
    private _timer;
    private _isFirstRender;
    private _prevWidth;
    private _prevHeight;
    private _shouldRecalculateLayout;
    private _currentLayoutType;
    private _layoutCalculationPromise;
    private _shouldFitLayout;
    private _shouldSetPanels;
    private _panels;
    private _defs;
    private _backgroundRect;
    private _zoomBehavior;
    private _isAutoFitDisabled;
    private _scale;
    private _initialTransform;
    private _isDragging;
    private _brushBehavior;
    private _groupDragInit;
    private _linkPathLengthMap;
    private _linkFlowFrameElapsed;
    events: {
        [x: string]: {
            click: () => void;
            mouseover?: undefined;
            mouseout?: undefined;
        } | {
            click: (d: GraphNode<N, L>) => void;
            mouseover: (d: GraphNode<N, L>) => void;
            mouseout: (d: GraphNode<N, L>) => void;
        } | {
            click: (d: GraphLink<N, L>) => void;
            mouseover: (d: GraphLink<N, L>) => void;
            mouseout: (d: GraphLink<N, L>) => void;
        };
    };
    get selectedNode(): GraphNode<N, L>;
    get selectedNodes(): GraphNode<N, L>[];
    get selectedLink(): GraphLink<N, L>;
    constructor(config?: GraphConfigInterface<N, L>);
    setData(data: GraphInputData<N, L>): void;
    setConfig(config: GraphConfigInterface<N, L>): void;
    get bleed(): Spacing;
    _render(customDuration?: number): void;
    private _drawNodes;
    private _drawLinks;
    private _drawPanels;
    private _updatePanels;
    private _calculateLayout;
    private _initPanelsData;
    private _fit;
    private _getTransform;
    private _setNodeSelectionState;
    private _setLinkSelectionState;
    private _resetSelectionGreyoutState;
    private _updateNodesLinksPartial;
    private _onBackgroundClick;
    private _onNodeClick;
    private _onNodeMouseOut;
    private _onNodeMouseOver;
    private _onLinkClick;
    private _onLinkMouseOver;
    private _onLinkMouseOut;
    private _onLinkFlowTimerFrame;
    private _onZoom;
    private _onZoomStart;
    private _onZoomEnd;
    private _updateNodePosition;
    private _onBrush;
    private _handleDrag;
    private _onDragStarted;
    private _onDragged;
    private _onDragEnded;
    private _dragSelectedNodes;
    private _activateBrush;
    private _clearBrush;
    private _shouldLayoutRecalculate;
    private _getLinkArrowDefId;
    private _addSVGDefs;
    zoomIn(increment?: number): void;
    zoomOut(increment?: number): void;
    setZoom(zoomLevel: number): void;
    getZoom(): number;
    fitView(duration?: number, nodeIds?: (string | number)[], alignment?: GraphFitViewAlignment): void;
    fitViewToBounds(xExtent?: [number, number] | undefined, yExtent?: [number, number] | undefined, duration?: number, alignment?: GraphFitViewAlignment): void;
    /** Enable automatic fitting to container if it was disabled due to previous zoom / pan interactions */
    resetAutofitState(): void;
    /** Get current coordinates of the nodes as an array of { id: string; x: number; y: number } objects */
    getNodesCoordinates(): {
        id: string;
        x: number;
        y: number;
    }[];
    /** Get node coordinates by id as { id: string; x: number; y: number } */
    getNodeCoordinatesById(id: string): {
        id: string;
        x: number;
        y: number;
    } | undefined;
    /** Set the node state by id */
    setNodeStateById(nodeId: string, state: GraphNode<N, L>['_state']): void;
    /** Call a partial render to update the positions of the nodes and their links.
      * This can be useful when you've changed the node positions manually outside
      * of the component and want to update the graph.
    */
    updateNodePositions(duration?: number): void;
}
