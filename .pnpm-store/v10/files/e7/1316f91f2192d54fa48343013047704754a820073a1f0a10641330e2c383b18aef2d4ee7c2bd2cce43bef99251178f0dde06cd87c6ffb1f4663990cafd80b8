import { select } from 'd3-selection';
import { area, line } from 'd3-shape';
import { interpolatePath } from 'd3-interpolate-path';
import { XYComponentCore } from '../../core/xy-component/index.js';
import { isNumber, isArray, getNumber, getStackedData, getString, getValue, filterDataByRange, getStackedExtent } from '../../utils/data.js';
import { smartTransition } from '../../utils/d3.js';
import { getColor } from '../../utils/color.js';
import { Curve } from '../../types/curve.js';
import { Direction } from '../../types/direction.js';
import { AreaDefaultConfig } from './config.js';
import * as style from './style.js';
import { area as area$1, areaLinePath } from './style.js';

class Area extends XYComponentCore {
    constructor(config) {
        super();
        this._defaultConfig = AreaDefaultConfig;
        this.config = this._defaultConfig;
        this.stacked = true;
        this.events = {
            [Area.selectors.area]: {},
        };
        if (config)
            this.setConfig(config);
        // Determine if the provided chart should be stacked
        this.stacked = Array.isArray(this.config.y);
    }
    get bleed() {
        const { config: { line, lineWidth } } = this;
        if (!line)
            return { top: 0, bottom: 0, left: 0, right: 0 };
        const yDomain = this.yScale.domain();
        const yDirection = this.yScale.range()[0] > this.yScale.range()[1]
            ? Direction.North
            : Direction.South;
        const isYDirectionSouth = yDirection === Direction.South;
        const isLineThick = lineWidth > 3;
        const isLineVeryThick = lineWidth >= 10;
        return {
            top: !isLineVeryThick && ((!isYDirectionSouth && (yDomain[1] === 0)) || (isYDirectionSouth && (yDomain[0] === 0))) ? 0 : lineWidth / 2,
            bottom: !isLineVeryThick && ((!isYDirectionSouth && (yDomain[0] === 0)) || (isYDirectionSouth && (yDomain[1] === 0))) ? 0 : lineWidth / 2,
            left: isLineThick ? lineWidth / 2 : 0,
            right: isLineThick ? lineWidth / 2 : 0,
        };
    }
    _render(customDuration) {
        super._render(customDuration);
        const { config, datamodel: { data } } = this;
        const duration = isNumber(customDuration) ? customDuration : config.duration;
        const curveGen = Curve[config.curveType];
        this._areaGen = area()
            .x(d => d.x)
            .y0(d => d.y0)
            .y1(d => d.y1)
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            .curve(curveGen);
        const yAccessors = (isArray(config.y) ? config.y : [config.y]);
        const areaDataX = data.map((d, i) => this.xScale(getNumber(d, config.x, i)));
        const stacked = getStackedData(data, config.baseline, yAccessors, this._prevNegative);
        this._prevNegative = stacked.map(s => !!s.isMostlyNegative);
        const minHeightCumulativeArray = [];
        const stackedData = stacked.map(arr => arr.map((d, j) => {
            var _a, _b;
            const x = areaDataX[j];
            const y0 = this.yScale(d[0]);
            const y1 = this.yScale(d[1]);
            const isNegativeArea = y1 > y0;
            // Only apply cumulative adjustment if `config.stackMinHeight` is true
            const cumulative = config.stackMinHeight ? (minHeightCumulativeArray[j] || 0) : 0;
            const adjustedY0 = isNegativeArea ? y0 + cumulative : y0 - cumulative;
            const adjustedY1 = isNegativeArea ? y1 + cumulative : y1 - cumulative;
            // Calculate height adjustment if needed
            let heightAdjustment = 0;
            if ((config.minHeight || config.minHeight1Px) &&
                Math.abs(adjustedY1 - adjustedY0) < ((_a = config.minHeight) !== null && _a !== void 0 ? _a : 1)) {
                heightAdjustment = ((_b = config.minHeight) !== null && _b !== void 0 ? _b : 1) - Math.abs(adjustedY1 - adjustedY0);
                // Only update cumulative array if we're stacking min heights
                if (config.stackMinHeight) {
                    minHeightCumulativeArray[j] = cumulative + heightAdjustment;
                }
            }
            return {
                x,
                y0: adjustedY0,
                y1: isNegativeArea ? adjustedY1 + heightAdjustment : adjustedY1 - heightAdjustment,
            };
        }));
        // We reverse the data in order to have the first areas to be displayed on top
        //   for better visibility when they're close to zero
        const areaMaxIdx = stackedData.length - 1;
        const stackedDataReversed = [...stackedData].reverse();
        const areas = this.g
            .selectAll(`.${area$1}`)
            .data(stackedDataReversed);
        const areasEnter = areas.enter().append('path')
            .attr('class', area$1)
            .attr('d', d => this._areaGen(d) || this._emptyPath())
            .style('opacity', 0)
            .style('fill', (d, i) => getColor(data, config.color, areaMaxIdx - i));
        const areasMerged = smartTransition(areasEnter.merge(areas), duration)
            .style('opacity', (d, i) => {
            const isDefined = d.some(p => (p.y0 - p.y1) !== 0);
            return isDefined ? getNumber(data, config.opacity, areaMaxIdx - i) : 0;
        })
            .style('fill', (d, i) => getColor(data, config.color, areaMaxIdx - i))
            .style('cursor', (d, i) => getString(data, config.cursor, areaMaxIdx - i));
        if (duration) {
            const transition = areasMerged;
            transition.attrTween('d', (d, i, el) => {
                const previous = select(el[i]).attr('d');
                const next = this._areaGen(d) || this._emptyPath();
                return interpolatePath(previous, next);
            });
        }
        else {
            areasMerged.attr('d', d => this._areaGen(d) || this._emptyPath());
        }
        smartTransition(areas.exit(), duration)
            .style('opacity', 0)
            .remove();
        if (config.line) {
            this._renderLines(duration, stackedData);
        }
    }
    _renderLines(duration, stackedData) {
        var _a;
        const { config, datamodel: { data } } = this;
        const areaMaxIdx = stackedData.length - 1;
        const stackedDataReversed = [...stackedData].reverse();
        const colorAccessor = (_a = config.lineColor) !== null && _a !== void 0 ? _a : config.color;
        const lines = this.g
            .selectAll(`.${areaLinePath}`)
            .data(stackedDataReversed);
        const areas = this.g.selectAll(`.${area$1}`).nodes();
        const linesEnter = lines.enter().insert('path', (d, i) => areas[i + 1])
            .attr('class', areaLinePath)
            .attr('stroke', (d, i) => getColor(data, colorAccessor, areaMaxIdx - i))
            .attr('stroke-width', config.lineWidth)
            .attr('stroke-opacity', 0);
        const linesMerged = smartTransition(linesEnter.merge(lines), duration)
            .attr('stroke', (d, i) => getColor(data, colorAccessor, areaMaxIdx - i))
            .attr('stroke-width', config.lineWidth)
            .attr('stroke-opacity', 1)
            .attr('cursor', (d, i) => getString(data, config.cursor, areaMaxIdx - i))
            .style('stroke-dasharray', (d, i) => { var _a, _b; return (_b = (_a = getValue(data, config.lineDashArray, i)) === null || _a === void 0 ? void 0 : _a.join(' ')) !== null && _b !== void 0 ? _b : null; });
        const curveGen = Curve[config.curveType];
        this._lineGen = line()
            .x(d => d.x)
            .y(d => d.y1)
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            .curve(curveGen);
        if (duration) {
            const lineTransition = linesMerged;
            lineTransition.attrTween('d', (d, i, el) => {
                const previous = select(el[i]).attr('d') || this._emptyLinePath();
                const next = this._lineGen(d) || this._emptyLinePath();
                return interpolatePath(previous, next);
            });
        }
        else {
            linesMerged.attr('d', d => this._lineGen(d) || this._emptyLinePath());
        }
        smartTransition(lines.exit(), duration)
            .style('opacity', 0)
            .remove();
    }
    getYDataExtent(scaleByVisibleData) {
        const { config, datamodel } = this;
        const yAccessors = (isArray(config.y) ? config.y : [config.y]);
        const xDomain = this.xScale.domain();
        const data = scaleByVisibleData ? filterDataByRange(datamodel.data, xDomain, config.x, true) : datamodel.data;
        return getStackedExtent(data, config.baseline, ...yAccessors);
    }
    _emptyPath() {
        const xRange = this.xScale.range();
        const yDomain = this.yScale.domain();
        const y0 = this.yScale((yDomain[0] + yDomain[1]) / 2);
        const y1 = y0;
        return this._areaGen([
            { y0, y1, x: xRange[0] },
            { y0, y1, x: xRange[1] },
        ]);
    }
    _emptyLinePath() {
        const xRange = this.xScale.range();
        const yRange = this.yScale.range();
        return `M${xRange[0]},${yRange[0]} L${xRange[1]},${yRange[0]}`;
    }
}
Area.selectors = style;

export { Area };
//# sourceMappingURL=index.js.map
