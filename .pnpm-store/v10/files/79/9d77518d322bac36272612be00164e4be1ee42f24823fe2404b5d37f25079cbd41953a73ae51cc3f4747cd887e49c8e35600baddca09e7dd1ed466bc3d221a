import { select } from 'd3-selection';
import { range, sum } from 'd3-array';
import { getBoolean, ensureArray, getValue, getNumber, throttle } from '../../../../utils/data.js';
import { smartTransition } from '../../../../utils/d3.js';
import { getCSSVariableValueInPixels } from '../../../../utils/misc.js';
import { estimateStringPixelLength } from '../../../../utils/text.js';
import { toPx } from '../../../../utils/to-px.js';
import { GraphLinkStyle } from '../../types.js';
import { getX, getY, isInternalHref } from '../node/helper.js';
import { getLinkBandWidth, getLinkColor, getLinkShiftTransform, getLinkStrokeWidth, getLinkArrowStyle, LINK_MARKER_WIDTH, getLinkLabelTextColor } from './helper.js';
import { ZoomLevel } from '../zoom-levels.js';
import { zoomOutLevel2 } from '../../style.js';
import { linkSupport, link, linkBand, linkArrow, flowGroup, flowCircle, greyedOutLink, linkDashed, linkLabelGroup, linkLabelBackground, linkLabelContent } from './style.js';

function createLinks(selection) {
    selection.attr('opacity', 0);
    selection.append('path')
        .attr('class', linkSupport);
    selection.append('path')
        .attr('class', link);
    selection.append('path')
        .attr('class', linkBand);
    selection.append('use')
        .attr('class', linkArrow);
    selection.append('g')
        .attr('class', flowGroup)
        .style('opacity', 0)
        .selectAll(`.${flowCircle}`)
        .data(range(0, 6)).enter()
        .append('circle')
        .attr('class', flowCircle);
}
/** Updates the links partially according to their `_state` */
function updateLinksPartial(selection, config, scale) {
    const isGreyedOut = (d, i) => getBoolean(d, config.linkDisabled, i) || d._state.greyout;
    selection
        .classed(greyedOutLink, (d, i) => isGreyedOut(d, i));
    selection.each((d, i, elements) => {
        const element = elements[i];
        const group = select(element);
        group.select(`.${link}`);
        group.select(`.${linkBand}`);
        const linkSupport$1 = group.select(`.${linkSupport}`);
        linkSupport$1
            .style('stroke-opacity', (d._state.hovered || d._state.selected) ? 0.2 : 0)
            .style('stroke-width', d._state.selected
            ? getLinkBandWidth(d, scale, config) + 5
            : d._state.hovered ? getLinkBandWidth(d, scale, config) + 10 : null);
    });
}
function updateLinkLines(selection, config, duration, scale = 1, getLinkArrowDefId, linkPathLengthMap) {
    return selection.each((d, i, elements) => {
        var _a;
        const element = elements[i];
        const linkGroup = select(element);
        const link$1 = linkGroup.select(`.${link}`);
        const linkBand$1 = linkGroup.select(`.${linkBand}`);
        const linkSupport$1 = linkGroup.select(`.${linkSupport}`);
        const linkArrow$1 = linkGroup.select(`.${linkArrow}`);
        const linkColor = getLinkColor(d, config);
        const linkShiftTransform = getLinkShiftTransform(d, config.linkNeighborSpacing);
        const linkLabelData = ensureArray(getValue(d, config.linkLabel, d._indexGlobal));
        const offsetSource = getValue(d, config.linkSourcePointOffset, i);
        const offsetTarget = getValue(d, config.linkTargetPointOffset, i);
        const x1 = getX(d.source) + ((offsetSource === null || offsetSource === void 0 ? void 0 : offsetSource[0]) || 0);
        const y1 = getY(d.source) + ((offsetSource === null || offsetSource === void 0 ? void 0 : offsetSource[1]) || 0);
        const x2 = getX(d.target) + ((offsetTarget === null || offsetTarget === void 0 ? void 0 : offsetTarget[0]) || 0);
        const y2 = getY(d.target) + ((offsetTarget === null || offsetTarget === void 0 ? void 0 : offsetTarget[1]) || 0);
        const curvature = (_a = getNumber(d, config.linkCurvature, i)) !== null && _a !== void 0 ? _a : 0;
        const cp1x = x1 + (x2 - x1) * 0.5 * curvature;
        const cp1y = y1 + (y2 - y1) * 0.0 * curvature;
        const cp2x = x1 + (x2 - x1) * 0.5 * curvature;
        const cp2y = y1 + (y2 - y1) * 1.0 * curvature;
        const pathData = `M${x1},${y1} C${cp1x},${cp1y} ${cp2x},${cp2y} ${x2},${y2}`;
        const linkPathElement = linkSupport$1.attr('d', pathData).node();
        const cachedLinkPathLength = linkPathLengthMap.get(pathData);
        const pathLength = cachedLinkPathLength !== null && cachedLinkPathLength !== void 0 ? cachedLinkPathLength : linkPathElement.getTotalLength();
        if (!cachedLinkPathLength)
            linkPathLengthMap.set(pathData, pathLength);
        linkSupport$1
            .style('stroke', linkColor)
            .attr('transform', linkShiftTransform);
        link$1
            .attr('class', link)
            .style('stroke-width', getLinkStrokeWidth(d, scale, config))
            .style('stroke', linkColor)
            .attr('transform', linkShiftTransform);
        smartTransition(link$1, duration)
            .attr('d', pathData);
        linkBand$1
            .attr('class', linkBand)
            .attr('transform', linkShiftTransform)
            .style('stroke-width', getLinkBandWidth(d, scale, config))
            .style('stroke', linkColor);
        smartTransition(linkBand$1, duration)
            .attr('d', pathData);
        // Arrow
        const linkArrowStyle = getLinkArrowStyle(d, config);
        if (linkArrowStyle) {
            const arrowPos = pathLength * (linkLabelData.length ? 0.65 : 0.5);
            const p1 = linkPathElement.getPointAtLength(arrowPos);
            const p2 = linkPathElement.getPointAtLength(arrowPos + 1); // A point very close to p1
            // Calculate the angle for the arrowhead
            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
            const arrowWasShownBefore = linkArrow$1.attr('href');
            linkArrow$1
                .attr('href', `#${getLinkArrowDefId(linkArrowStyle)}`);
            smartTransition(linkArrow$1, arrowWasShownBefore ? duration : 0)
                .attr('fill', linkColor)
                .attr('transform', `translate(${p1.x}, ${p1.y}) rotate(${angle})`);
        }
        else {
            linkArrow$1.attr('href', null);
        }
    });
}
function updateLinks(selection, config, duration, scale = 1, getLinkArrowDefId, linkPathLengthMap) {
    const { linkStyle, linkFlow, linkLabel, linkLabelShiftFromCenter } = config;
    if (!selection.size())
        return;
    selection
        .classed(linkDashed, d => getValue(d, linkStyle, d._indexGlobal) === GraphLinkStyle.Dashed);
    // Update line and arrow positions
    updateLinkLines(selection, config, duration, scale, getLinkArrowDefId, linkPathLengthMap);
    // Update labels and link flow (particles) groups
    selection.each((d, i, elements) => {
        const element = elements[i];
        const linkGroup = select(element);
        const flowGroup$1 = linkGroup.select(`.${flowGroup}`);
        const linkSupport$1 = linkGroup.select(`.${linkSupport}`);
        const linkPathElement = linkSupport$1.node();
        const linkColor = getLinkColor(d, config);
        const linkShiftTransform = getLinkShiftTransform(d, config.linkNeighborSpacing);
        const linkLabelData = ensureArray(getValue(d, linkLabel, d._indexGlobal));
        const linkFlowParticleSize = getNumber(d, config.linkFlowParticleSize, d._indexGlobal);
        // Particle Flow
        flowGroup$1
            .attr('transform', linkShiftTransform)
            .style('display', getBoolean(d, linkFlow, d._indexGlobal) ? null : 'none');
        flowGroup$1
            .selectAll(`.${flowCircle}`)
            .attr('r', linkFlowParticleSize / Math.sqrt(scale))
            .style('fill', linkColor);
        smartTransition(flowGroup$1, duration)
            .style('opacity', scale < ZoomLevel.Level2 ? 0 : 1);
        // Labels
        // Preparing the labels before rendering to be able to center them
        const linkLabelsDataPrepared = linkLabelData.map((linkLabelDatum) => {
            var _a, _b, _c;
            const text = ((_a = linkLabelDatum.text) === null || _a === void 0 ? void 0 : _a.toString()) || '';
            const shouldRenderUseElement = isInternalHref(text);
            const fontSizePx = (_b = toPx(linkLabelDatum.fontSize)) !== null && _b !== void 0 ? _b : getCSSVariableValueInPixels('var(--vis-graph-link-label-font-size)', linkGroup.node());
            const shouldBeRenderedAsCircle = text.length <= 2 || shouldRenderUseElement;
            const paddingVertical = 4;
            const paddingHorizontal = shouldBeRenderedAsCircle ? paddingVertical : 8;
            const estimatedWidthPx = estimateStringPixelLength(text, fontSizePx);
            return Object.assign(Object.assign({}, linkLabelDatum), { _shouldRenderUseElement: shouldRenderUseElement, _fontSizePx: fontSizePx, _shouldBeRenderedAsCircle: shouldBeRenderedAsCircle, _paddingVertical: paddingVertical, _paddingHorizontal: paddingHorizontal, _estimatedWidthPx: estimatedWidthPx, _borderRadius: (_c = linkLabelDatum.radius) !== null && _c !== void 0 ? _c : (shouldBeRenderedAsCircle ? fontSizePx : 4), _backgroundWidth: (shouldBeRenderedAsCircle ? fontSizePx : estimatedWidthPx) + paddingHorizontal * 2, _backgroundHeight: fontSizePx + paddingVertical * 2 });
        });
        const linkLabelGroups = linkGroup
            .selectAll(`.${linkLabelGroup}`)
            .data(linkLabelsDataPrepared, (d) => d.text);
        const linkLabelGroupsEnter = linkLabelGroups.enter().append('g').attr('class', linkLabelGroup);
        linkLabelGroupsEnter.each((linkLabelDatum, i, elements) => {
            var _a;
            const linkLabelGroup = select(elements[i]);
            linkLabelGroup.append('rect').attr('class', linkLabelBackground);
            const linkLabelText = linkLabelDatum ? (_a = linkLabelDatum.text) === null || _a === void 0 ? void 0 : _a.toString() : undefined;
            const shouldRenderUseElement = isInternalHref(linkLabelText);
            linkLabelGroup.select(`.${linkLabelContent}`).remove();
            linkLabelGroup
                .append(shouldRenderUseElement ? 'use' : 'text')
                .attr('class', linkLabelContent);
        });
        linkLabelGroupsEnter.style('opacity', 0);
        const linkLabelGroupsMerged = linkLabelGroups.merge(linkLabelGroupsEnter);
        const linkLabelMargin = 1;
        let linkLabelShiftCumulative = -sum(linkLabelsDataPrepared, d => d._backgroundWidth + linkLabelMargin) / 2; // Centering the labels
        const cachedLinkPathLength = linkPathLengthMap.get(linkPathElement.getAttribute('d'));
        const pathLength = cachedLinkPathLength !== null && cachedLinkPathLength !== void 0 ? cachedLinkPathLength : linkPathElement.getTotalLength();
        const linkArrowStyle = getLinkArrowStyle(d, config);
        linkLabelGroupsMerged.each((linkLabelDatum, i, elements) => {
            var _a, _b;
            const element = elements[i];
            const linkLabelGroup = select(element);
            const linkLabelText = (_a = linkLabelDatum.text) === null || _a === void 0 ? void 0 : _a.toString();
            const linkLabelContent$1 = linkLabelGroup.select(`.${linkLabelContent}`);
            const linkMarkerWidth = linkArrowStyle ? LINK_MARKER_WIDTH * 2 : 0;
            const linkLabelShift = getBoolean(d, linkLabelShiftFromCenter, d._indexGlobal) ? -linkMarkerWidth + 4 : 0;
            const linkLabelPos = linkPathElement.getPointAtLength(pathLength / 2 + linkLabelShift + linkLabelShiftCumulative + linkLabelDatum._backgroundWidth / 2);
            const linkLabelTranslate = `translate(${linkLabelPos.x}, ${linkLabelPos.y})`;
            const linkLabelBackground$1 = linkLabelGroup.select(`.${linkLabelBackground}`);
            // If the label was not displayed before, we set the initial transform
            if (!linkLabelGroup.attr('transform')) {
                linkLabelGroup.attr('transform', `${linkLabelTranslate} scale(0)`);
            }
            const linkLabelColor = (_b = linkLabelDatum.textColor) !== null && _b !== void 0 ? _b : getLinkLabelTextColor(linkLabelDatum);
            if (linkLabelDatum._shouldRenderUseElement) {
                linkLabelContent$1
                    .attr('href', linkLabelText)
                    .attr('x', -linkLabelDatum._fontSizePx / 2)
                    .attr('y', -linkLabelDatum._fontSizePx / 2)
                    .attr('width', linkLabelDatum._fontSizePx)
                    .attr('height', linkLabelDatum._fontSizePx)
                    .style('color', linkLabelColor);
            }
            else {
                linkLabelContent$1
                    .text(linkLabelText)
                    .attr('dy', '0.1em')
                    .style('font-size', linkLabelDatum._fontSizePx)
                    .style('fill', linkLabelColor);
            }
            linkLabelGroup.attr('hidden', null)
                .style('cursor', linkLabelDatum.cursor);
            smartTransition(linkLabelGroup, duration)
                .attr('transform', `${linkLabelTranslate} scale(1)`)
                .style('opacity', 1);
            linkLabelBackground$1
                .attr('x', -linkLabelDatum._backgroundWidth / 2)
                .attr('y', -linkLabelDatum._backgroundHeight / 2)
                .attr('width', linkLabelDatum._backgroundWidth)
                .attr('height', linkLabelDatum._backgroundHeight)
                .attr('rx', linkLabelDatum._borderRadius)
                .style('fill', linkLabelDatum.color);
            linkLabelShiftCumulative += linkLabelDatum._backgroundWidth + linkLabelMargin;
        });
        smartTransition(linkLabelGroups.exit(), duration)
            .style('opacity', 0)
            .remove();
    });
    // Pointer Events
    if (duration > 0) {
        selection.attr('pointer-events', 'none');
        const t = smartTransition(selection, duration);
        t
            .attr('opacity', 1)
            .on('end interrupt', (d, i, elements) => {
            select(elements[i])
                .attr('pointer-events', 'stroke')
                .attr('opacity', 1);
        });
    }
    else {
        selection.attr('opacity', 1);
    }
    updateLinksPartial(selection, config, scale);
}
function removeLinks(selection, config, duration) {
    smartTransition(selection, duration / 2)
        .attr('opacity', 0)
        .remove();
}
function animateLinkFlow(selection, config, scale, linkPathLengthMap) {
    const { linkFlow } = config;
    if (scale < ZoomLevel.Level2)
        return;
    selection.each((d, i, elements) => {
        const element = elements[i];
        const linkGroup = select(element);
        const flowGroup$1 = linkGroup.select(`.${flowGroup}`);
        const linkPathElement = linkGroup.select(`.${link}`).node();
        const cachedLinkPathLength = linkPathLengthMap.get(linkPathElement.getAttribute('d'));
        const pathLength = cachedLinkPathLength !== null && cachedLinkPathLength !== void 0 ? cachedLinkPathLength : linkPathElement.getTotalLength();
        if (!getBoolean(d, linkFlow, d._indexGlobal) || !pathLength)
            return;
        const t = d._state.flowAnimDistanceRelative;
        const circles = flowGroup$1.selectAll(`.${flowCircle}`);
        circles
            .attr('transform', index => {
            const tt = (t + (+index) / (circles.size() - 1)) % 1;
            const p = linkPathElement.getPointAtLength(tt * pathLength);
            return `translate(${p.x}, ${p.y})`;
        });
    });
}
function zoomLinks(selection, config, scale) {
    selection.classed(zoomOutLevel2, scale < ZoomLevel.Level2);
    selection.select(`.${flowGroup}`)
        .style('opacity', scale < ZoomLevel.Level2 ? 0 : 1);
    selection.each((l, i, els) => {
        const r = getNumber(l, config.linkFlowParticleSize, l._indexGlobal) / Math.sqrt(scale);
        select(els[i]).selectAll(`.${flowCircle}`).attr('r', r);
    });
    const linkElements = selection.selectAll(`.${link}`);
    linkElements
        .style('stroke-width', d => getLinkStrokeWidth(d, scale, config));
    const linkBandElements = selection.selectAll(`.${linkBand}`);
    linkBandElements
        .style('stroke-width', d => getLinkBandWidth(d, scale, config));
}
const zoomLinksThrottled = throttle(zoomLinks, 500);

export { animateLinkFlow, createLinks, removeLinks, updateLinkLines, updateLinks, updateLinksPartial, zoomLinks, zoomLinksThrottled };
//# sourceMappingURL=index.js.map
