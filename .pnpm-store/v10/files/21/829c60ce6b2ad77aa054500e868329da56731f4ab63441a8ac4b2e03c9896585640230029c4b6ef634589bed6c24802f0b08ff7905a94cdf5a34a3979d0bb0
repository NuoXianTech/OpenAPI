import { select } from 'd3-selection';
import { max } from 'd3-array';
import { getColor } from '../../../utils/color.js';
import { isNumber, getString } from '../../../utils/data.js';
import { smartTransition } from '../../../utils/d3.js';
import { SankeyEnterTransitionType, SankeyNodeAlign, SankeySubLabelPlacement, SankeyExitTransitionType } from '../types.js';
import { getLabelFontSize, getSubLabelFontSize, renderLabel } from './label.js';
import { nodeSelectionRect, node, labelGroup, labelBackground, label, sublabel, nodeIcon, SANKEY_ICON_SIZE, hidden, labelTrimmed, forceShow } from '../style.js';

const NODE_SELECTION_RECT_DELTA = 3;
function createNodes(sel, config, width, bleed) {
    const { enterTransitionType } = config;
    // Node
    sel.append('rect')
        .attr('class', nodeSelectionRect)
        .attr('width', config.nodeWidth + NODE_SELECTION_RECT_DELTA * 2)
        .attr('height', d => d.y1 - d.y0 + NODE_SELECTION_RECT_DELTA * 2)
        .attr('x', -NODE_SELECTION_RECT_DELTA)
        .attr('y', -NODE_SELECTION_RECT_DELTA)
        .style('stroke', node => getColor(node, config.nodeColor))
        .style('opacity', 0);
    sel.append('rect')
        .attr('class', node)
        .attr('width', config.nodeWidth)
        .attr('height', d => d.y1 - d.y0)
        .style('fill', node => getColor(node, config.nodeColor));
    // Labels
    const labelGroup$1 = sel.append('g').attr('class', labelGroup);
    labelGroup$1.append('path').attr('class', labelBackground);
    labelGroup$1.append('text').attr('class', label);
    labelGroup$1.append('text').attr('class', sublabel);
    // Node icon
    sel.append('text').attr('class', nodeIcon)
        .attr('text-anchor', 'middle');
    sel
        .attr('transform', d => {
        var _a;
        const x = (enterTransitionType === SankeyEnterTransitionType.FromAncestor && ((_a = d.targetLinks) === null || _a === void 0 ? void 0 : _a[0])) ? d.targetLinks[0].source.x0 : d.x0;
        return `translate(${sel.size() === 1 ? width * 0.5 - bleed.left : x}, ${d.y0})`;
    })
        .style('opacity', 0);
}
function getNodeXPos(d, config, width, bleed, hasLinks) {
    if (hasLinks)
        return d.x0;
    switch (config.nodeAlign) {
        case SankeyNodeAlign.Left: return d.x0;
        case SankeyNodeAlign.Right: return width - bleed.right;
        case SankeyNodeAlign.Center:
        case SankeyNodeAlign.Justify:
        default: return width * 0.5 - bleed.left;
    }
}
function getXDistanceToNextNode(sel, datum, data, // Assuming that the nodes are sorted by the x position for performance reasons
config, width) {
    let yTolerance = config.labelMaxWidthTakeAvailableSpaceTolerance;
    if (!isNumber(yTolerance)) {
        const labelFontSize = getLabelFontSize(config, sel.node());
        const subLabelFontSize = getSubLabelFontSize(config, sel.node());
        const hasSecondLineSublabel = getString(datum, config.subLabel) && config.subLabelPlacement !== SankeySubLabelPlacement.Inline;
        yTolerance = (labelFontSize + subLabelFontSize) / (hasSecondLineSublabel ? 2 : 4);
    }
    // Assuming that the nodes are sorted by the x position
    const nodeOnTheRight = data.find(d => d.layer > datum.layer &&
        d.x0 >= datum.x1 &&
        d.y1 >= (datum.y0 - yTolerance) &&
        d.y0 <= (datum.y1 + yTolerance));
    return (nodeOnTheRight ? nodeOnTheRight.x0 : width) - datum.x1;
}
function updateNodes(sel, config, width, bleed, hasLinks, duration, layerSpacing) {
    smartTransition(sel, duration)
        .attr('transform', d => `translate(${getNodeXPos(d, config, width, bleed, hasLinks)},${d.y0})`)
        .style('opacity', d => d._state.greyout ? 0.2 : 1);
    // Node
    smartTransition(sel.select(`.${nodeSelectionRect}`), duration)
        .attr('width', config.nodeWidth + NODE_SELECTION_RECT_DELTA * 2)
        .attr('height', d => d.y1 - d.y0 + NODE_SELECTION_RECT_DELTA * 2)
        .attr('x', -NODE_SELECTION_RECT_DELTA)
        .attr('y', -NODE_SELECTION_RECT_DELTA)
        .style('stroke', (d) => getColor(d, config.nodeColor))
        .style('opacity', d => { var _a; return ((_a = config.selectedNodeIds) === null || _a === void 0 ? void 0 : _a.includes(d.id)) ? 1 : 0; });
    smartTransition(sel.select(`.${node}`), duration)
        .attr('width', config.nodeWidth)
        .attr('height', (d) => d.y1 - d.y0)
        .style('cursor', (d) => getString(d, config.nodeCursor))
        .style('fill', (d) => getColor(d, config.nodeColor));
    // Label Rendering
    const maxLayer = max(sel.data(), d => d.layer);
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    renderNodeLabels(sel, config, width, duration, layerSpacing, maxLayer, bleed);
    // Node Icon
    const nodeIcon$1 = sel.select(`.${nodeIcon}`);
    if (config.nodeIcon) {
        nodeIcon$1.each((d, i, els) => {
            const el = select(els[i]);
            const nodeHeight = d.y1 - d.y0;
            const color = getColor(d, config.nodeIconColor);
            const visibility = nodeHeight > 2 ? null : 'hidden';
            const fontSize = nodeHeight < SANKEY_ICON_SIZE ? `${nodeHeight * 0.65}px` : null;
            el
                .attr('visibility', visibility)
                .style('stroke', color)
                .style('fill', color)
                .style('font-size', fontSize)
                .html(getString(d, config.nodeIcon));
        });
        smartTransition(nodeIcon$1, duration)
            .attr('x', config.nodeWidth / 2)
            .attr('y', (d) => (d.y1 - d.y0) / 2);
    }
    else {
        nodeIcon$1
            .attr('visibility', 'hidden');
    }
}
function renderNodeLabels(sel, config, width, duration, layerSpacing, sankeyMaxLayer, bleed) {
    var _a;
    // Label Rendering
    const labelGroupSelection = sel.select(`.${labelGroup}`);
    const labelGroupEls = labelGroupSelection.nodes() || [];
    // After rendering Label return a BBox so we can do intersection detection and hide some of them
    const data = sel.data();
    const labelGroupBBoxes = labelGroupEls.map(g => {
        const gSelection = select(g);
        const datum = gSelection.datum();
        const spacing = config.labelMaxWidthTakeAvailableSpace
            ? getXDistanceToNextNode(gSelection, datum, data, config, width)
            : layerSpacing;
        return renderLabel(gSelection, datum, config, width, duration, spacing, sankeyMaxLayer, bleed);
    });
    if (config.labelVisibility) {
        for (const b of labelGroupBBoxes) {
            const datum = b.selection.datum();
            const box = { x: b.x, y: b.y, width: b.width, height: b.height };
            b.hidden = !config.labelVisibility(datum, box, false);
        }
    }
    else {
        // Detect intersecting labels
        const maxLayer = Math.max(...labelGroupBBoxes.map(b => b.layer));
        for (let layer = 0; layer <= maxLayer; layer += 1) {
            const boxes = labelGroupBBoxes.filter(b => (b.layer === layer));
            boxes.sort((a, b) => a.y - b.y);
            let lastVisibleIdx = 0;
            for (let i = 1; i < boxes.length; i += 1) {
                const b0 = boxes[lastVisibleIdx];
                const b1 = boxes[i];
                const shouldBeHidden = b1.y < (b0.y + b0.height);
                const b1Datum = b1.selection.datum();
                if (shouldBeHidden) {
                    if ((_a = config.selectedNodeIds) === null || _a === void 0 ? void 0 : _a.includes(b1Datum.id)) {
                        b0.hidden = true; // If the hovered node should be hidden, hide the previous one instead
                    }
                    else
                        b1.hidden = true;
                }
                if (!b1.hidden)
                    lastVisibleIdx = i;
            }
        }
    }
    // Hide intersecting labels
    for (const b of labelGroupBBoxes) {
        b.selection.classed(hidden, b.hidden);
    }
}
function removeNodes(selection, config, duration) {
    const { exitTransitionType } = config;
    selection.each((d, i, els) => {
        var _a;
        const node = select(els[i]);
        const transition = smartTransition(node, duration);
        if ((exitTransitionType === SankeyExitTransitionType.ToAncestor) && ((_a = d.targetLinks) === null || _a === void 0 ? void 0 : _a[0])) {
            transition.attr('transform', `translate(${d.targetLinks[0].source.x0},${d.y0})`);
        }
        transition
            .style('opacity', 0)
            .remove();
    });
}
function onNodeMouseOver(d, data, nodeSelection, config, width, layerSpacing, bleed) {
    const labelGroup$1 = nodeSelection.raise()
        .select(`.${labelGroup}`);
    const spacing = config.labelMaxWidthTakeAvailableSpace
        ? getXDistanceToNextNode(nodeSelection, d, data, config, width)
        : layerSpacing;
    const maxLayer = max(data, d => d.layer);
    if ((config.labelExpandTrimmedOnHover && labelGroup$1.classed(labelTrimmed)) || labelGroup$1.classed(hidden)) {
        renderLabel(labelGroup$1, d, config, width, 0, spacing, maxLayer, bleed, true);
    }
    labelGroup$1.classed(forceShow, true);
}
function onNodeMouseOut(d, data, nodeSelection, config, width, layerSpacing, bleed) {
    const labelGroup$1 = nodeSelection.select(`.${labelGroup}`);
    const spacing = config.labelMaxWidthTakeAvailableSpace
        ? getXDistanceToNextNode(nodeSelection, d, data, config, width)
        : layerSpacing;
    if (config.labelExpandTrimmedOnHover || labelGroup$1.classed(hidden)) {
        const maxLayer = max(data, d => d.layer);
        renderLabel(labelGroup$1, d, config, width, 0, spacing, maxLayer, bleed, false);
    }
    labelGroup$1.classed(forceShow, false);
}

export { NODE_SELECTION_RECT_DELTA, createNodes, onNodeMouseOut, onNodeMouseOver, removeNodes, renderNodeLabels, updateNodes };
//# sourceMappingURL=node.js.map
