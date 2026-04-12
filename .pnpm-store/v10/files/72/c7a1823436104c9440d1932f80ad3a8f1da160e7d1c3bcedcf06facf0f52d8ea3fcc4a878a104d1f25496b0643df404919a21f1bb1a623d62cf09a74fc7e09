import { estimateStringPixelLength, wrapSVGText, trimSVGText, estimateTextSize } from '../../../utils/text.js';
import { getString, getValue, clamp } from '../../../utils/data.js';
import { getColor } from '../../../utils/color.js';
import { getCSSVariableValueInPixels } from '../../../utils/misc.js';
import { cssvar } from '../../../utils/style.js';
import { VerticalAlign, FitMode } from '../../../types/text.js';
import { Position } from '../../../types/position.js';
import { SankeySubLabelPlacement } from '../types.js';
import { variables, label, sublabel, labelTrimmed, labelBackground } from '../style.js';

// Utils
const SANKEY_LABEL_SPACING = 10;
const SANKEY_LABEL_BLOCK_PADDING = 6.5;
function getLabelFontSize(config, context) {
    var _a;
    return (_a = config.labelFontSize) !== null && _a !== void 0 ? _a : getCSSVariableValueInPixels(cssvar(variables.sankeyNodeLabelFontSize), context);
}
function getSubLabelFontSize(config, context) {
    var _a;
    return (_a = config.subLabelFontSize) !== null && _a !== void 0 ? _a : getCSSVariableValueInPixels(cssvar(variables.sankeyNodeSublabelFontSize), context);
}
function estimateRequiredLabelWidth(d, config, labelFontSize, subLabelFontSize) {
    var _a, _b;
    const labelAddWidth = 2; // Adding a few pixels for the label background to look more aligned
    const inlineLabelAddWidth = 8; // Without this, the label anf sub-label will look too close to each other
    const tolerance = 1.1;
    const isSublabelInline = config.subLabelPlacement === SankeySubLabelPlacement.Inline;
    const labelText = `${(_a = getString(d, config.label)) !== null && _a !== void 0 ? _a : ''}`; // Stringify because theoretically it can be a number
    const sublabelText = `${(_b = getString(d, config.subLabel)) !== null && _b !== void 0 ? _b : ''}`; // Stringify because theoretically it can be a number
    const labelTextWidth = tolerance * estimateStringPixelLength(labelText, labelFontSize);
    const sublabelTextWidth = tolerance * estimateStringPixelLength(sublabelText, subLabelFontSize);
    return isSublabelInline ? inlineLabelAddWidth + (labelTextWidth + sublabelTextWidth) : labelAddWidth + Math.max(labelTextWidth, sublabelTextWidth);
}
function getLabelBackground(width, height, orientation, arrowWidth = 5, arrowHeight = 8) {
    const halfHeight = height / 2;
    const halfArrowHeight = arrowHeight / 2;
    if (orientation === Position.Left) {
        const rightArrowPos = `L 0 ${halfHeight - halfArrowHeight}   L   ${+arrowWidth} ${halfHeight} L 0 ${halfHeight + halfArrowHeight}`;
        return `
      M 0 0
      ${rightArrowPos}
      L 0  ${height}
      L ${-width} ${height}
      L ${-width} 0
      L 0 0 `;
    }
    else {
        const leftArrowPos = `L 0 ${halfHeight - halfArrowHeight}   L   ${-arrowWidth} ${halfHeight} L 0 ${halfHeight + halfArrowHeight}`;
        return `
      M 0 0
      ${leftArrowPos}
      L 0  ${height}
      L ${width} ${height}
      L ${width} 0
      L 0 0 `;
    }
}
function getLabelOrientation(d, sankeyWidth, labelPosition) {
    let orientation = getValue(d, labelPosition);
    if (orientation === Position.Auto || !orientation) {
        orientation = d.x1 < sankeyWidth / 2 ? Position.Left : Position.Right;
    }
    return orientation;
}
function getLabelGroupXTranslate(d, config, width) {
    const orientation = getLabelOrientation(d, width, config.labelPosition);
    switch (orientation) {
        case Position.Right: return config.nodeWidth + SANKEY_LABEL_SPACING;
        case Position.Left:
        default:
            return -SANKEY_LABEL_SPACING;
    }
}
function getLabelGroupYTranslate(d, labelGroupHeight, config) {
    const nodeHeight = d.y1 - d.y0;
    if (config.labelBackground && (nodeHeight < labelGroupHeight))
        return (nodeHeight - labelGroupHeight) / 2;
    switch (config.labelVerticalAlign) {
        case VerticalAlign.Bottom: return nodeHeight - labelGroupHeight;
        case VerticalAlign.Middle: return nodeHeight / 2 - labelGroupHeight / 2;
        case VerticalAlign.Top:
        default: return 0;
    }
}
function getLabelTextAnchor(d, config, width) {
    const orientation = getLabelOrientation(d, width, config.labelPosition);
    switch (orientation) {
        case Position.Right: return 'start';
        case Position.Left:
        default:
            return 'end';
    }
}
function getSubLabelTextAnchor(d, config, width) {
    const isSublabelInline = config.subLabelPlacement === SankeySubLabelPlacement.Inline;
    const orientation = getLabelOrientation(d, width, config.labelPosition);
    switch (orientation) {
        case Position.Right: return isSublabelInline ? 'end' : 'start';
        case Position.Left:
        default:
            return isSublabelInline ? 'start' : 'end';
    }
}
function getLabelMaxWidth(d, config, labelOrientation, layerSpacing, sankeyMaxLayer, bleed) {
    var _a;
    const labelHorizontalPadding = 2 * SANKEY_LABEL_SPACING + 2 * SANKEY_LABEL_BLOCK_PADDING;
    if (d.layer === 0 && labelOrientation === Position.Left) {
        return bleed.left - labelHorizontalPadding;
    }
    if (d.layer === sankeyMaxLayer && labelOrientation === Position.Right) {
        return bleed.right - labelHorizontalPadding;
    }
    return clamp(layerSpacing - labelHorizontalPadding, 0, (_a = config.labelMaxWidth) !== null && _a !== void 0 ? _a : Infinity);
}
function renderLabel(labelGroup, d, config, width, duration, layerSpacing, sankeyMaxLayer, bleed, forceExpand = false) {
    const labelTextSelection = labelGroup.select(`.${label}`);
    const labelShowBackground = config.labelBackground || forceExpand;
    const sublabelTextSelection = labelGroup.select(`.${sublabel}`);
    const labelPadding = labelShowBackground ? SANKEY_LABEL_BLOCK_PADDING : 0;
    const isSublabelInline = config.subLabelPlacement === SankeySubLabelPlacement.Inline;
    const separator = config.labelForceWordBreak ? '' : config.labelTextSeparator;
    const fastEstimatesMode = true; // Fast but inaccurate
    const fontWidthToHeightRatio = 0.52;
    const dy = 0.32;
    const labelOrientation = getLabelOrientation(d, width, config.labelPosition);
    const labelOrientationMult = labelOrientation === Position.Left ? -1 : 1;
    const labelText = getString(d, config.label);
    const sublabelText = getString(d, config.subLabel);
    let wasTrimmed = false;
    const labelFontSize = getLabelFontSize(config, labelGroup.node());
    const subLabelFontSize = getSubLabelFontSize(config, labelGroup.node());
    // Render the main label, wrap / trim it and estimate its size
    const labelsFontSizeDifference = sublabelText ? labelFontSize - subLabelFontSize : 0;
    const labelTranslateY = labelPadding + ((isSublabelInline && labelsFontSizeDifference < 0) ? -0.6 * labelsFontSizeDifference : 0);
    labelTextSelection
        .text(labelText)
        .attr('font-size', labelFontSize)
        .style('text-decoration', getString(d, config.labelTextDecoration))
        .style('fill', getColor(d, config.labelColor))
        .attr('transform', `translate(${labelOrientationMult * labelPadding},${labelTranslateY})`)
        .style('cursor', (d) => getString(d, config.labelCursor));
    const labelMaxWidth = getLabelMaxWidth(d, config, labelOrientation, layerSpacing, sankeyMaxLayer, bleed);
    const labelWrapTrimWidth = isSublabelInline
        ? labelMaxWidth * (1 - (sublabelText ? config.subLabelToLabelInlineWidthRatio : 0))
        : labelMaxWidth;
    if (config.labelFit === FitMode.Wrap || forceExpand)
        wrapSVGText(labelTextSelection, labelWrapTrimWidth, separator);
    else
        wasTrimmed = trimSVGText(labelTextSelection, labelWrapTrimWidth, config.labelTrimMode, fastEstimatesMode, labelFontSize, fontWidthToHeightRatio);
    const labelSize = estimateTextSize(labelTextSelection, labelFontSize, dy, fastEstimatesMode, fontWidthToHeightRatio);
    // Render the sub-label, wrap / trim it and estimate its size
    const sublabelTranslateX = labelOrientationMult * (labelPadding + (isSublabelInline ? labelMaxWidth : 0));
    const sublabelMarginTop = 0;
    const sublabelTranslateY = labelPadding + (isSublabelInline
        ? (labelsFontSizeDifference > 0 ? 0.6 * labelsFontSizeDifference : 0)
        : labelSize.height + sublabelMarginTop);
    sublabelTextSelection
        .text(sublabelText)
        .attr('font-size', subLabelFontSize)
        .style('text-decoration', getString(d, config.subLabelTextDecoration))
        .style('fill', getColor(d, config.subLabelColor))
        .attr('transform', `translate(${sublabelTranslateX},${sublabelTranslateY})`)
        .style('cursor', (d) => getString(d, config.labelCursor));
    const sublabelMaxWidth = isSublabelInline ? labelMaxWidth * config.subLabelToLabelInlineWidthRatio : labelMaxWidth;
    if (config.labelFit === FitMode.Wrap || forceExpand)
        wrapSVGText(sublabelTextSelection, sublabelMaxWidth, separator);
    else
        wasTrimmed = trimSVGText(sublabelTextSelection, sublabelMaxWidth, config.labelTrimMode, fastEstimatesMode, subLabelFontSize, fontWidthToHeightRatio) || wasTrimmed;
    labelGroup.classed(labelTrimmed, wasTrimmed);
    const sublabelSize = estimateTextSize(sublabelTextSelection, subLabelFontSize, dy, fastEstimatesMode, fontWidthToHeightRatio);
    // Draw the background if needed
    const labelGroupHeight = (isSublabelInline ? Math.max(labelSize.height, sublabelSize.height) : (labelSize.height + sublabelSize.height)) + 2 * labelPadding;
    const labelBackground$1 = labelGroup.select(`.${labelBackground}`);
    labelBackground$1
        .attr('d', () => {
        if (!labelShowBackground)
            return null;
        const requiredLabelWidth = estimateRequiredLabelWidth(d, config, labelFontSize, subLabelFontSize);
        return getLabelBackground(Math.min(labelMaxWidth, requiredLabelWidth) + 2 * labelPadding, labelGroupHeight, labelOrientation);
    });
    // Position the label
    const labelTextAnchor = getLabelTextAnchor(d, config, width);
    const sublabelTextAnchor = getSubLabelTextAnchor(d, config, width);
    const xTranslate = getLabelGroupXTranslate(d, config, width);
    const yTranslate = getLabelGroupYTranslate(d, labelGroupHeight, config);
    labelTextSelection.attr('text-anchor', labelTextAnchor);
    sublabelTextSelection.attr('text-anchor', sublabelTextAnchor);
    labelGroup.attr('transform', `translate(${xTranslate},${yTranslate})`);
    return {
        x: d.x0 + xTranslate,
        y: d.y0 + yTranslate,
        width: labelMaxWidth,
        height: labelGroupHeight,
        layer: d.layer,
        selection: labelGroup,
    };
}

export { SANKEY_LABEL_BLOCK_PADDING, SANKEY_LABEL_SPACING, estimateRequiredLabelWidth, getLabelFontSize, getLabelGroupXTranslate, getLabelGroupYTranslate, getLabelMaxWidth, getLabelOrientation, getLabelTextAnchor, getSubLabelFontSize, getSubLabelTextAnchor, renderLabel };
//# sourceMappingURL=label.js.map
