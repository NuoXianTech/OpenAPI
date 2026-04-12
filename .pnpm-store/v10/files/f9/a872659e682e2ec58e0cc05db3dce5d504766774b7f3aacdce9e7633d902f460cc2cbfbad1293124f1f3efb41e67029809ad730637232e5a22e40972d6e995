import { select } from 'd3-selection';
import { max, min, minIndex } from 'd3-array';
import { scaleOrdinal } from 'd3-scale';
import { drag } from 'd3-drag';
import { XYComponentCore } from '../../core/xy-component/index.js';
import { getNumber, isNumber, arrayOfIndices, getValue, isPlainObject, isFunction, getString, groupBy, getMin, getMax } from '../../utils/data.js';
import { smartTransition } from '../../utils/d3.js';
import { getColor } from '../../utils/color.js';
import { trimSVGText, textAlignToAnchor } from '../../utils/text.js';
import { arrowPolylinePath } from '../../utils/path.js';
import { guid } from '../../utils/misc.js';
import '../../types.js';
import { TimelineDefaultConfig } from './config.js';
import * as style from './style.js';
import { background, rows, arrows, lines, labels, rowIcons, scrollbar, scrollbarBackground, scrollbarHandle, label, rowIcon, row, rowOdd, lineGroup, line, lineStartIcon, lineEndIcon, arrow } from './style.js';
import { TIMELINE_DEFAULT_ARROW_HEAD_LENGTH, TIMELINE_DEFAULT_ARROW_HEAD_WIDTH, TIMELINE_DEFAULT_ARROW_MARGIN } from './constants.js';
import { getIconBleed } from './utils.js';
import { TextAlign } from '../../types/text.js';
import { Arrangement } from '../../types/position.js';

class Timeline extends XYComponentCore {
    constructor(config) {
        super();
        this._defaultConfig = TimelineDefaultConfig;
        this.config = this._defaultConfig;
        this.events = {
            [Timeline.selectors.background]: {
                wheel: this._onMouseWheel.bind(this),
            },
            [Timeline.selectors.label]: {
                wheel: this._onMouseWheel.bind(this),
            },
            [Timeline.selectors.rows]: {
                wheel: this._onMouseWheel.bind(this),
            },
            [Timeline.selectors.line]: {
                wheel: this._onMouseWheel.bind(this),
            },
        };
        this._scrollBarWidth = 5;
        this._scrollDistance = 0;
        this._scrollBarMargin = 5;
        this._maxScroll = 0;
        this._scrollbarHeight = 0;
        this._labelMargin = 5;
        this._labelWidth = 0; // Will be overridden in `get bleed ()`
        this._rowIconBleed = [0, 0];
        this._lineBleed = [0, 0];
        /** We define a dedicated clipping path for this component because it needs to behave
         * differently than the regular XYContainer's clipPath */
        this._clipPathId = guid();
        if (config)
            this.setConfig(config);
        // Invisible background rect to track events
        this._background = this.g.append('rect').attr('class', background);
        // Clip path
        this._clipPath = this.g.append('clipPath')
            .attr('id', this._clipPathId);
        this._clipPath.append('rect');
        // Group for content
        this._rowsGroup = this.g.append('g').attr('class', rows)
            .style('clip-path', `url(#${this._clipPathId})`);
        this._arrowsGroup = this.g.append('g').attr('class', arrows)
            .style('clip-path', `url(#${this._clipPathId})`);
        this._linesGroup = this.g.append('g').attr('class', lines)
            .style('clip-path', `url(#${this._clipPathId})`);
        this._labelsGroup = this.g.append('g').attr('class', labels);
        this._rowIconsGroup = this.g.append('g').attr('class', rowIcons);
        this._scrollBarGroup = this.g.append('g').attr('class', scrollbar);
        // Scroll bar
        this._scrollBarBackground = this._scrollBarGroup.append('rect')
            .attr('class', scrollbarBackground);
        this._scrollBarHandle = this._scrollBarGroup.append('rect')
            .attr('class', scrollbarHandle);
        // Set up scrollbar drag event
        const dragBehaviour = drag()
            .on('drag', this._onScrollbarDrag.bind(this));
        this._scrollBarHandle.call(dragBehaviour);
    }
    setConfig(config) {
        super.setConfig(config);
    }
    setData(data) {
        super.setData(data);
    }
    get bleed() {
        var _a, _b, _c, _d;
        const { config, datamodel: { data } } = this;
        const rowLabels = this._getRowLabels(data);
        const rowHeight = config.rowHeight || (this._height / (rowLabels.length || 1));
        const hasIcons = rowLabels.some(l => l.iconHref);
        const maxIconSize = max(rowLabels.map(l => l.iconSize || 0));
        // We calculate the longest label width to set the bleed values accordingly
        if ((_a = config.showRowLabels) !== null && _a !== void 0 ? _a : config.showLabels) {
            if ((_b = config.rowLabelWidth) !== null && _b !== void 0 ? _b : config.labelWidth)
                this._labelWidth = ((_c = config.rowLabelWidth) !== null && _c !== void 0 ? _c : config.labelWidth) + this._labelMargin;
            else {
                const longestLabel = rowLabels.reduce((longestLabel, l) => longestLabel.formattedLabel.length > l.formattedLabel.length ? longestLabel : l, rowLabels[0]);
                const label$1 = this._labelsGroup.append('text')
                    .attr('class', label)
                    .text((longestLabel === null || longestLabel === void 0 ? void 0 : longestLabel.formattedLabel) || '')
                    .call(trimSVGText, (_d = config.rowMaxLabelWidth) !== null && _d !== void 0 ? _d : config.maxLabelWidth);
                const labelWidth = label$1.node().getBBox().width;
                label$1.remove();
                const tolerance = 1.15; // Some characters are wider than others so we add a little of extra space to take that into account
                this._labelWidth = labelWidth ? tolerance * labelWidth + this._labelMargin : 0;
            }
        }
        // There can be multiple start / end items with the same timestamp, so we need to find the shortest one
        const minTimestamp = min(data, (d, i) => getNumber(d, config.x, i));
        const dataMin = data.filter((d, i) => getNumber(d, config.x, i) === minTimestamp);
        const dataMinShortestItemIdx = minIndex(dataMin, (d, i) => this._getLineDuration(d, i));
        const firstItemIdx = data.findIndex(d => d === dataMin[dataMinShortestItemIdx]);
        const firstItem = data[firstItemIdx];
        const maxTimestamp = max(data, (d, i) => getNumber(d, config.x, i) + this._getLineDuration(d, i));
        const dataMax = data.filter((d, i) => getNumber(d, config.x, i) + this._getLineDuration(d, i) === maxTimestamp);
        const dataMaxShortestItemIdx = minIndex(dataMax, (d, i) => this._getLineDuration(d, i));
        const lastItemIdx = data.findIndex(d => d === dataMax[dataMaxShortestItemIdx]);
        const lastItem = data[lastItemIdx];
        // Small segments bleed
        const lineBleed = [1, 1];
        if (config.showEmptySegments && config.lineCap && firstItem && lastItem) {
            const firstItemStart = getNumber(firstItem, config.x, firstItemIdx);
            const firstItemEnd = getNumber(firstItem, config.x, firstItemIdx) + this._getLineDuration(firstItem, firstItemIdx);
            const lastItemStart = getNumber(lastItem, config.x, lastItemIdx);
            const lastItemEnd = getNumber(lastItem, config.x, lastItemIdx) + this._getLineDuration(lastItem, lastItemIdx);
            const fullTimeRange = lastItemEnd - firstItemStart;
            const firstItemHeight = this._getLineWidth(firstItem, firstItemIdx, rowHeight);
            const lastItemHeight = this._getLineWidth(lastItem, lastItemIdx, rowHeight);
            if ((firstItemEnd - firstItemStart) / fullTimeRange * this._width < firstItemHeight) {
                lineBleed[0] = config.showEmptySegmentsCorrectPosition ? firstItemHeight / 2 : 0;
            }
            if ((lastItemEnd - lastItemStart) / fullTimeRange * this._width < lastItemHeight) {
                lineBleed[1] = config.showEmptySegmentsCorrectPosition ? lastItemHeight / 2 : lastItemHeight;
            }
        }
        this._lineBleed = lineBleed;
        // Icon bleed
        const iconBleed = [0, 0];
        if (config.lineStartIcon) {
            iconBleed[0] = max(data, (d, i) => getIconBleed(d, i, config.lineStartIcon, config.lineStartIconSize, config.lineStartIconArrangement, rowHeight)) || 0;
        }
        if (config.lineEndIcon) {
            iconBleed[1] = max(data, (d, i) => getIconBleed(d, i, config.lineEndIcon, config.lineEndIconSize, config.lineEndIconArrangement, rowHeight)) || 0;
        }
        this._rowIconBleed = iconBleed;
        return {
            top: 0,
            bottom: 0,
            left: this._labelWidth + iconBleed[0] + (hasIcons ? maxIconSize : 0) + lineBleed[0],
            right: this._scrollBarWidth + this._scrollBarMargin + iconBleed[1] + lineBleed[1],
        };
    }
    _render(customDuration) {
        var _a;
        super._render(customDuration);
        const { config, datamodel: { data } } = this;
        const duration = isNumber(customDuration) ? customDuration : config.duration;
        const xRange = this.xScale.range();
        const yRange = this.yScale.range();
        const yStart = Math.min(...yRange);
        const yHeight = Math.abs(yRange[1] - yRange[0]);
        const rowLabels = this._getRowLabels(data);
        const numRowLabels = rowLabels.length;
        const rowHeight = config.rowHeight || (yHeight / (numRowLabels || 1));
        const yOrdinalScale = scaleOrdinal()
            .range(arrayOfIndices(numRowLabels))
            .domain(rowLabels.map(l => l.label));
        const lineDataPrepared = this._prepareLinesData(data, yOrdinalScale, rowHeight);
        // Invisible Background rect to track events
        this._background
            .attr('width', this._width)
            .attr('height', this._height)
            .attr('opacity', 0);
        // Row Icons
        const rowIcons = this._rowIconsGroup.selectAll(`.${rowIcon}`)
            .data(rowLabels.filter(d => d.iconSize), l => l === null || l === void 0 ? void 0 : l.label);
        const rowIconsEnter = rowIcons.enter().append('use')
            .attr('class', rowIcon)
            .attr('x', 0)
            .attr('width', l => l.iconSize)
            .attr('height', l => l.iconSize)
            .attr('y', l => yStart + (yOrdinalScale(l.label) + 0.5) * rowHeight - l.iconSize / 2)
            .style('opacity', 0);
        smartTransition(rowIconsEnter.merge(rowIcons), duration)
            .attr('href', l => l.iconHref)
            .attr('x', 0)
            .attr('y', l => yStart + (yOrdinalScale(l.label) + 0.5) * rowHeight - l.iconSize / 2)
            .attr('width', l => l.iconSize)
            .attr('height', l => l.iconSize)
            .style('color', l => l.iconColor)
            .style('opacity', 1);
        smartTransition(rowIcons.exit(), duration)
            .style('opacity', 0)
            .remove();
        // Labels
        const labels = this._labelsGroup.selectAll(`.${label}`)
            .data(((_a = config.showRowLabels) !== null && _a !== void 0 ? _a : config.showLabels) ? rowLabels : [], l => l === null || l === void 0 ? void 0 : l.label);
        const labelOffset = config.rowLabelTextAlign === TextAlign.Center ? this._labelWidth / 2
            : config.rowLabelTextAlign === TextAlign.Left ? this._labelWidth
                : this._labelMargin;
        const xStart = xRange[0] - this._rowIconBleed[0] - this._lineBleed[0];
        const labelXStart = xStart - labelOffset;
        const labelsEnter = labels.enter().append('text')
            .attr('class', label)
            .attr('x', labelXStart)
            .attr('y', l => yStart + (yOrdinalScale(l.label) + 0.5) * rowHeight)
            .style('opacity', 0);
        const labelsMerged = labelsEnter.merge(labels)
            .text(l => l.formattedLabel)
            .each((label, i, els) => {
            var _a, _b;
            const labelSelection = select(els[i]);
            trimSVGText(labelSelection, ((_a = config.rowLabelWidth) !== null && _a !== void 0 ? _a : config.labelWidth) || ((_b = config.rowMaxLabelWidth) !== null && _b !== void 0 ? _b : config.maxLabelWidth));
            // Apply custom label style if it has been provided
            const customStyle = getValue(label, config.rowLabelStyle);
            if (!isPlainObject(customStyle))
                return;
            for (const [prop, value] of Object.entries(customStyle)) {
                labelSelection.style(prop, value);
            }
        })
            .style('text-anchor', textAlignToAnchor(config.rowLabelTextAlign));
        smartTransition(labelsMerged, duration)
            .attr('x', labelXStart)
            .attr('y', l => yStart + (yOrdinalScale(l.label) + 0.5) * rowHeight)
            .style('opacity', 1);
        smartTransition(labels.exit(), duration)
            .style('opacity', 0)
            .remove();
        // Row background rects
        const timelineWidth = xRange[1] - xRange[0] + this._rowIconBleed[0] + this._rowIconBleed[1] + this._lineBleed[0] + this._lineBleed[1];
        const numRows = Math.max(Math.floor(yHeight / rowHeight), numRowLabels);
        const recordTypes = Array(numRows).fill(null).map((_, i) => rowLabels[i]);
        const rects = this._rowsGroup.selectAll(`.${row}`)
            .data(recordTypes);
        const rectsEnter = rects.enter().append('rect')
            .attr('class', row)
            .attr('x', xStart)
            .attr('width', timelineWidth)
            .attr('y', (_, i) => yStart + i * rowHeight)
            .attr('height', rowHeight)
            .style('opacity', 0);
        const rectsMerged = rectsEnter.merge(rects)
            .classed(rowOdd, config.alternatingRowColors ? (_, i) => !(i % 2) : null);
        smartTransition(rectsMerged, duration)
            .attr('x', xStart)
            .attr('width', timelineWidth)
            .attr('y', (_, i) => yStart + i * rowHeight)
            .attr('height', rowHeight)
            .style('opacity', 1);
        smartTransition(rects.exit(), duration)
            .style('opacity', 0)
            .remove();
        // Lines
        const lines = this._linesGroup.selectAll(`.${lineGroup}`)
            .data(lineDataPrepared, (d) => d._id);
        const linesEnter = lines.enter().append('g')
            .attr('class', lineGroup)
            .style('opacity', 0)
            .attr('transform', (d, i) => {
            var _a, _b;
            const configuredPos = isFunction(config.animationLineEnterPosition)
                ? config.animationLineEnterPosition(d, i, lineDataPrepared)
                : config.animationLineEnterPosition;
            const [x, y] = [(_a = configuredPos === null || configuredPos === void 0 ? void 0 : configuredPos[0]) !== null && _a !== void 0 ? _a : d._xPx, (_b = configuredPos === null || configuredPos === void 0 ? void 0 : configuredPos[1]) !== null && _b !== void 0 ? _b : d._yPx];
            return `translate(${x}, ${y})`;
        });
        linesEnter.append('rect')
            .attr('class', line)
            .style('fill', (d, i) => getColor(d, config.color, yOrdinalScale(this._getRecordKey(d, i))))
            .call(this._renderLines.bind(this), rowHeight);
        linesEnter.append('use').attr('class', lineStartIcon);
        linesEnter.append('use').attr('class', lineEndIcon);
        const linesMerged = linesEnter.merge(lines);
        smartTransition(linesMerged, duration)
            .attr('transform', d => `translate(${d._xPx + d._xOffsetPx}, ${d._yPx})`)
            .style('opacity', 1);
        const lineRectElementsSelection = linesMerged.selectAll(`.${line}`)
            .data(d => [d]);
        smartTransition(lineRectElementsSelection, duration)
            .style('fill', (d, i) => getColor(d, config.color, yOrdinalScale(this._getRecordKey(d, i))))
            .style('cursor', (d, i) => { var _a; return getString(d, (_a = config.lineCursor) !== null && _a !== void 0 ? _a : config.cursor, i); })
            .call(this._renderLines.bind(this), rowHeight);
        linesMerged.selectAll(`.${lineStartIcon}`)
            .data(d => [d])
            .attr('href', (d, i) => getString(d, config.lineStartIcon, i))
            .attr('x', (d, i) => {
            const iconSize = d._startIconSize;
            const iconArrangement = d._startIconArrangement;
            const offset = iconArrangement === Arrangement.Inside ? 0
                : iconArrangement === Arrangement.Center ? -iconSize / 2
                    : -iconSize;
            return offset;
        })
            .attr('y', d => (-(d._startIconSize - d._height) / 2) || 0)
            .attr('width', d => d._startIconSize)
            .attr('height', d => d._startIconSize)
            .style('color', d => d._startIconColor);
        linesMerged.selectAll(`.${lineEndIcon}`)
            .data(d => [d])
            .attr('href', (d, i) => getString(d, config.lineEndIcon, i))
            .attr('x', (d, i) => {
            const lineLength = d._lengthCorrected;
            const iconSize = d._endIconSize;
            const iconArrangement = d._endIconArrangement;
            const offset = iconArrangement === Arrangement.Inside ? -iconSize
                : iconArrangement === Arrangement.Center ? -iconSize / 2
                    : 0;
            return lineLength + offset;
        })
            .attr('y', d => -((d._endIconSize - d._height) / 2) || 0)
            .attr('width', d => d._endIconSize)
            .attr('height', d => d._endIconSize)
            .style('color', d => d._endIconColor);
        const linesExit = lines.exit();
        smartTransition(linesExit, duration)
            .style('opacity', 0)
            .attr('transform', (d, i) => {
            var _a, _b;
            const configuredPos = isFunction(config.animationLineExitPosition)
                ? config.animationLineExitPosition(d, i, lineDataPrepared)
                : config.animationLineExitPosition;
            const [x, y] = [(_a = configuredPos === null || configuredPos === void 0 ? void 0 : configuredPos[0]) !== null && _a !== void 0 ? _a : d._xPx, (_b = configuredPos === null || configuredPos === void 0 ? void 0 : configuredPos[1]) !== null && _b !== void 0 ? _b : d._yPx];
            return `translate(${x}, ${y})`;
        })
            .remove();
        // Arrows
        const arrowsData = this._prepareArrowsData(data, yOrdinalScale, rowHeight);
        const arrows = this._arrowsGroup.selectAll(`.${arrow}`)
            .data(arrowsData !== null && arrowsData !== void 0 ? arrowsData : [], d => d.id);
        const arrowsEnter = arrows.enter().append('path')
            .attr('class', arrow)
            .style('opacity', 0);
        smartTransition(arrowsEnter.merge(arrows), duration)
            .attr('d', (d) => {
            var _a, _b;
            return arrowPolylinePath(d._points, (_a = d.arrowHeadLength) !== null && _a !== void 0 ? _a : TIMELINE_DEFAULT_ARROW_HEAD_LENGTH, (_b = d.arrowHeadWidth) !== null && _b !== void 0 ? _b : TIMELINE_DEFAULT_ARROW_HEAD_WIDTH);
        })
            .style('opacity', 1);
        smartTransition(arrows.exit(), duration)
            .style('opacity', 0)
            .remove();
        // Scroll Bar
        const absoluteContentHeight = recordTypes.length * rowHeight;
        this._scrollbarHeight = yHeight * yHeight / absoluteContentHeight || 0;
        this._maxScroll = Math.max(absoluteContentHeight - yHeight, 0);
        this._scrollBarGroup
            .attr('transform', `translate(${this._width - this._scrollBarWidth}, ${yStart})`)
            .attr('opacity', this._maxScroll ? 1 : 0);
        this._scrollBarBackground
            .attr('width', this._scrollBarWidth)
            .attr('height', this._height)
            .attr('rx', this._scrollBarWidth / 2)
            .attr('ry', this._scrollBarWidth / 2);
        this._scrollBarHandle
            .attr('width', this._scrollBarWidth)
            .attr('height', this._scrollbarHeight)
            .attr('rx', this._scrollBarWidth / 2)
            .attr('ry', this._scrollBarWidth / 2);
        this._updateScrollPosition(0);
        // Clip path
        const clipPathRect = this._clipPath.select('rect');
        smartTransition(clipPathRect, clipPathRect.attr('width') ? duration : 0)
            .attr('x', xStart)
            .attr('width', timelineWidth)
            .attr('height', this._height);
    }
    _getLineLength(d, i) {
        var _a, _b;
        const { config, xScale } = this;
        const x = getNumber(d, config.x, i);
        const length = (_b = getNumber(d, (_a = config.lineDuration) !== null && _a !== void 0 ? _a : config.length, i)) !== null && _b !== void 0 ? _b : 0;
        const lineLength = xScale(x + length) - xScale(x);
        return lineLength;
    }
    _getLineWidth(d, i, rowHeight) {
        var _a;
        const { config } = this;
        return (_a = getNumber(d, config.lineWidth, i)) !== null && _a !== void 0 ? _a : Math.max(Math.floor(rowHeight / 2), 1);
    }
    _getLineDuration(d, i) {
        var _a, _b;
        const { config } = this;
        return (_b = getNumber(d, (_a = config.lineDuration) !== null && _a !== void 0 ? _a : config.length, i)) !== null && _b !== void 0 ? _b : 0;
    }
    _prepareLinesData(data, rowOrdinalScale, rowHeight) {
        const { config, xScale, yScale } = this;
        const yRange = yScale.range();
        const yStart = Math.min(...yRange);
        return data.map((d, i) => {
            var _a, _b, _c, _d, _e;
            const id = (_a = getString(d, config.id, i)) !== null && _a !== void 0 ? _a : [
                this._getRecordKey(d, i), getNumber(d, config.x, i),
            ].join('-');
            const lineWidth = this._getLineWidth(d, i, rowHeight);
            const lineLength = this._getLineLength(d, i);
            if (lineLength < 0) {
                console.warn('Unovis | Timeline: Line segments should not have negative lengths. Setting to 0.');
            }
            const lineLengthCorrected = config.showEmptySegments
                ? Math.max(config.lineCap ? lineWidth : 1, lineLength)
                : Math.max(0, lineLength);
            const x = xScale(getNumber(d, config.x, i));
            const y = yStart + rowOrdinalScale(this._getRecordKey(d, i)) * rowHeight + (rowHeight - lineWidth) / 2;
            const isLineTooShort = config.showEmptySegments && config.showEmptySegmentsCorrectPosition && config.lineCap && (lineLength < lineWidth);
            const xOffset = isLineTooShort ? -(lineLengthCorrected - lineLength) / 2 : 0;
            return Object.assign(Object.assign({}, d), { _id: id, _xPx: x, _yPx: y, _xOffsetPx: xOffset, _length: lineLength, _height: lineWidth, _lengthCorrected: lineLengthCorrected, _startIconSize: (_b = getNumber(d, config.lineStartIconSize, i)) !== null && _b !== void 0 ? _b : lineWidth, _endIconSize: (_c = getNumber(d, config.lineEndIconSize, i)) !== null && _c !== void 0 ? _c : lineWidth, _startIconColor: getString(d, config.lineStartIconColor, i), _endIconColor: getString(d, config.lineEndIconColor, i), _startIconArrangement: (_d = getValue(d, config.lineStartIconArrangement, i)) !== null && _d !== void 0 ? _d : Arrangement.Outside, _endIconArrangement: (_e = getValue(d, config.lineEndIconArrangement, i)) !== null && _e !== void 0 ? _e : Arrangement.Outside });
        });
    }
    _prepareArrowsData(data, rowOrdinalScale, rowHeight) {
        var _a;
        const { config } = this;
        const arrowsData = (_a = config.arrows) === null || _a === void 0 ? void 0 : _a.map(a => {
            var _a, _b, _c, _d, _e;
            const sourceLineIndex = data.findIndex((d, i) => getString(d, config.id, i) === a.lineSourceId);
            const targetLineIndex = data.findIndex((d, i) => getString(d, config.id, i) === a.lineTargetId);
            const sourceLine = data[sourceLineIndex];
            const targetLine = data[targetLineIndex];
            if (!sourceLine || !targetLine) {
                console.warn('Unovis | Timeline: Arrow references a non-existent line. Skipping...', a);
                return undefined;
            }
            const sourceLineY = rowOrdinalScale(this._getRecordKey(sourceLine, sourceLineIndex)) * rowHeight + rowHeight / 2;
            const targetLineY = rowOrdinalScale(this._getRecordKey(targetLine, targetLineIndex)) * rowHeight + rowHeight / 2;
            const sourceLineWidth = this._getLineWidth(sourceLine, sourceLineIndex, rowHeight);
            const targetLineWidth = this._getLineWidth(targetLine, targetLineIndex, rowHeight);
            const x1 = (a.xSource
                ? this.xScale(a.xSource)
                : this.xScale(getNumber(sourceLine, config.x, sourceLineIndex)) + this._getLineLength(sourceLine, sourceLineIndex)) + ((_a = a.xSourceOffsetPx) !== null && _a !== void 0 ? _a : 0);
            const targetLineLength = this._getLineLength(targetLine, targetLineIndex);
            const isTargetLineTooShort = config.showEmptySegments && config.lineCap && (targetLineLength < targetLineWidth);
            const targetLineStart = this.xScale(getNumber(targetLine, config.x, targetLineIndex)) + (isTargetLineTooShort ? -targetLineWidth / 2 : 0);
            const x2 = (a.xTarget ? this.xScale(a.xTarget) : targetLineStart) + ((_b = a.xTargetOffsetPx) !== null && _b !== void 0 ? _b : 0);
            const isX2OutsideTargetLineStart = (x2 < targetLineStart) || (x2 > targetLineStart);
            // Points array
            const sourceMargin = (_c = a.lineSourceMarginPx) !== null && _c !== void 0 ? _c : TIMELINE_DEFAULT_ARROW_MARGIN;
            const targetMargin = (_d = a.lineTargetMarginPx) !== null && _d !== void 0 ? _d : TIMELINE_DEFAULT_ARROW_MARGIN;
            const y1 = sourceLineY < targetLineY ? sourceLineY + sourceLineWidth / 2 + sourceMargin : sourceLineY - sourceLineWidth / 2 - sourceMargin;
            const y2 = sourceLineY < targetLineY ? targetLineY - targetLineWidth / 2 - targetMargin : targetLineY + targetLineWidth / 2 + targetMargin;
            const arrowHeadLength = (_e = a.arrowHeadLength) !== null && _e !== void 0 ? _e : TIMELINE_DEFAULT_ARROW_HEAD_LENGTH;
            const isForwardArrow = x1 < x2 && !isX2OutsideTargetLineStart;
            const threshold = arrowHeadLength + (isForwardArrow ? targetMargin : 0);
            const points = [[x1, y1]];
            if (Math.abs(x2 - x1) > threshold) {
                if (isForwardArrow) {
                    points.push([x1, (y1 + targetLineY) / 2]); // A dummy point to enable smooth transitions when arrows change
                    points.push([x1, targetLineY]);
                    points.push([x2 - targetMargin, targetLineY]);
                }
                else {
                    const verticalOffset = Math.sign(targetLineY - sourceLineY) * (rowHeight / 4);
                    points.push([x1, y2 - verticalOffset]);
                    points.push([x2, y2 - verticalOffset]);
                    points.push([x2, y2]);
                }
            }
            else {
                const quarterOffset = (y2 - y1) / 4;
                points.push([x1, y1 + quarterOffset]); // A dummy point to enable smooth transitions
                points.push([x1, y1 + 3 * quarterOffset]); // A dummy point to enable smooth transitions
                points.push([x1, y2]);
            }
            return Object.assign(Object.assign({}, a), { _points: points });
        }).filter(Boolean);
        return arrowsData;
    }
    _renderLines(selection) {
        const { config } = this;
        selection
            .attr('width', d => d._lengthCorrected)
            .attr('height', d => d._height)
            .attr('rx', d => config.lineCap ? d._height / 2 : null);
    }
    _onScrollbarDrag(event) {
        const yRange = this.yScale.range();
        const yHeight = Math.abs(yRange[1] - yRange[0]);
        this._updateScrollPosition(event.dy * this._maxScroll / (yHeight - this._scrollbarHeight));
    }
    _onMouseWheel(d, event) {
        var _a;
        const { config } = this;
        this._updateScrollPosition(event === null || event === void 0 ? void 0 : event.deltaY);
        if (this._scrollDistance > 0 && this._scrollDistance < this._maxScroll)
            event === null || event === void 0 ? void 0 : event.preventDefault();
        (_a = config.onScroll) === null || _a === void 0 ? void 0 : _a.call(config, this._scrollDistance);
        // Programmatically trigger a mousemove event to update Tooltip or Crosshair if they were set up
        const e = new Event('mousemove');
        this.element.dispatchEvent(e);
    }
    _updateScrollPosition(diff) {
        const yRange = this.yScale.range();
        const yHeight = Math.abs(yRange[1] - yRange[0]);
        this._scrollDistance += diff;
        this._scrollDistance = Math.max(0, this._scrollDistance);
        this._scrollDistance = Math.min(this._maxScroll, this._scrollDistance);
        this._clipPath.attr('transform', `translate(0,${this._scrollDistance})`);
        this._linesGroup.attr('transform', `translate(0,${-this._scrollDistance})`);
        this._rowsGroup.attr('transform', `translate(0,${-this._scrollDistance})`);
        this._labelsGroup.attr('transform', `translate(0,${-this._scrollDistance})`);
        this._rowIconsGroup.attr('transform', `translate(0,${-this._scrollDistance})`);
        this._arrowsGroup.attr('transform', `translate(0,${-this._scrollDistance})`);
        const scrollBarPosition = (this._scrollDistance / this._maxScroll * (yHeight - this._scrollbarHeight)) || 0;
        this._scrollBarHandle.attr('y', scrollBarPosition);
    }
    _getRecordKey(d, i) {
        var _a;
        return getString(d, (_a = this.config.lineRow) !== null && _a !== void 0 ? _a : this.config.type) || `__${i}`;
    }
    _getRowLabels(data) {
        const grouped = groupBy(data, (d, i) => { var _a; return getString(d, (_a = this.config.lineRow) !== null && _a !== void 0 ? _a : this.config.type) || `${i + 1}`; });
        const rowLabels = Object.entries(grouped).map(([key, items], i) => {
            var _a, _b, _c, _d, _e;
            const icon = (_b = (_a = this.config).rowIcon) === null || _b === void 0 ? void 0 : _b.call(_a, key, items, i);
            return {
                label: key,
                formattedLabel: (_e = (_d = (_c = this.config).rowLabelFormatter) === null || _d === void 0 ? void 0 : _d.call(_c, key, items, i)) !== null && _e !== void 0 ? _e : key,
                iconHref: icon === null || icon === void 0 ? void 0 : icon.href,
                iconSize: icon === null || icon === void 0 ? void 0 : icon.size,
                iconColor: icon === null || icon === void 0 ? void 0 : icon.color,
                data: items,
            };
        });
        return rowLabels;
    }
    // Override the default XYComponent getXDataExtent method to take into account line lengths
    getXDataExtent() {
        const { config, datamodel } = this;
        const min = getMin(datamodel.data, config.x);
        const max = getMax(datamodel.data, (d, i) => { var _a, _b; return getNumber(d, config.x, i) + ((_b = getNumber(d, (_a = config.lineDuration) !== null && _a !== void 0 ? _a : config.length, i)) !== null && _b !== void 0 ? _b : 0); });
        return [min, max];
    }
}
Timeline.selectors = style;

export { Timeline };
//# sourceMappingURL=index.js.map
