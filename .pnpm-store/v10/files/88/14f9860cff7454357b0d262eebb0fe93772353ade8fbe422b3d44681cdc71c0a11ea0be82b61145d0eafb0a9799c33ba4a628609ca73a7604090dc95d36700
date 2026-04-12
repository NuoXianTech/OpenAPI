import { isEqual } from '../../utils/data.js';
import { ComponentDefaultConfig } from '../../core/component/config.js';
import { TrimMode } from '../../types/text.js';
import { GraphLayoutType, GraphFitViewAlignment, GraphLinkStyle, GraphNodeShape, GraphNodeSelectionHighlightMode } from './types.js';

// Utils
const GraphDefaultConfig = Object.assign(Object.assign({}, ComponentDefaultConfig), { duration: 1000, zoomScaleExtent: [0.35, 1.25], disableZoom: false, zoomEventFilter: undefined, disableDrag: false, disableBrush: false, zoomThrottledUpdateNodeThreshold: 100, layoutType: GraphLayoutType.Force, layoutAutofit: true, layoutAutofitTolerance: 8.0, layoutNonConnectedAside: false, fitViewPadding: 50, fitViewAlign: GraphFitViewAlignment.Center, layoutGroupOrder: [], layoutParallelNodeSpacing: undefined, layoutParallelSubGroupsPerRow: 1, layoutParallelNodesPerColumn: 6, layoutParallelGroupSpacing: undefined, layoutParallelSubGroupSpacing: 40, layoutParallelSortConnectionsByGroup: undefined, layoutNodeGroup: (n) => n.group, layoutParallelNodeSubGroup: (n) => n.subgroup, forceLayoutSettings: {
        linkDistance: 60,
        linkStrength: 0.45,
        charge: -500,
        forceXStrength: 0.15,
        forceYStrength: 0.25,
        numIterations: undefined,
        fixNodePositionAfterSimulation: false,
    }, dagreLayoutSettings: {
        rankdir: 'BT',
        ranker: 'longest-path',
    }, layoutElkSettings: undefined, layoutElkNodeGroups: undefined, layoutElkGetNodeShape: undefined, linkFlowAnimDuration: 20000, linkFlowParticleSize: 2, linkFlowParticleSpeed: undefined, linkWidth: 1, linkStyle: GraphLinkStyle.Solid, linkBandWidth: 0, linkArrow: undefined, linkStroke: undefined, linkFlow: false, linkLabel: undefined, linkLabelShiftFromCenter: true, linkNeighborSpacing: 8, linkDisabled: false, linkCurvature: 0, linkHighlightOnHover: true, linkSourcePointOffset: undefined, linkTargetPointOffset: undefined, selectedLinkId: undefined, nodeSize: 30, nodeStrokeWidth: 3, nodeShape: GraphNodeShape.Circle, nodeGaugeValue: 0, nodeIcon: (n) => n.icon, nodeIconSize: undefined, nodeLabel: (n) => n.label, nodeLabelTrim: true, nodeLabelTrimLength: 15, nodeLabelTrimMode: TrimMode.Middle, nodeSubLabel: '', nodeSubLabelTrim: true, nodeSubLabelTrimLength: 15, nodeSubLabelTrimMode: TrimMode.Middle, nodeSideLabels: undefined, nodeBottomIcon: undefined, nodeDisabled: false, nodeFill: (n) => n.fill, nodeGaugeFill: undefined, nodeStroke: (n) => n.stroke, nodeEnterPosition: undefined, nodeEnterScale: 0.75, nodeExitPosition: undefined, nodeExitScale: 0.75, nodeSort: undefined, nodeSelectionHighlightMode: GraphNodeSelectionHighlightMode.GreyoutNonConnected, nodeGaugeAnimDuration: 1500, selectedNodeId: undefined, selectedNodeIds: undefined, panels: undefined, onNodeDragStart: undefined, onNodeDrag: undefined, onNodeDragEnd: undefined, onZoom: undefined, onZoomStart: undefined, onZoomEnd: undefined, onLayoutCalculated: undefined, onNodeSelectionBrush: undefined, onNodeSelectionDrag: undefined, onRenderComplete: undefined, shouldDataUpdate: (prevData, nextData) => {
        return !isEqual(prevData, nextData);
    } });

export { GraphDefaultConfig };
//# sourceMappingURL=config.js.map
