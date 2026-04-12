import { pointer } from 'd3-selection';
import { easeLinear } from 'd3-ease';
import { XYComponentCore } from '../../core/xy-component/index.js';
import { isArray, isNumber, getNearest, clamp, getNumber, isFunction, getStackedValues } from '../../utils/data.js';
import { smartTransition } from '../../utils/d3.js';
import { getColor } from '../../utils/color.js';
import { Position } from '../../types/position.js';
import { FindNearestDirection } from '../../types/data.js';
import { CrosshairDefaultConfig } from './config.js';
import * as style from './style.js';
import { line, circle } from './style.js';

class Crosshair extends XYComponentCore {
    constructor(config) {
        super();
        this.clippable = true; // Don't apply clipping path to this component. See XYContainer
        this._defaultConfig = CrosshairDefaultConfig;
        this.config = this._defaultConfig;
        this._xPx = undefined;
        this._yPx = undefined;
        this._mouseEvent = undefined;
        this._animFrameId = null;
        /** Accessors passed externally (e.g. from XYContainer) */
        this._accessors = {
            x: undefined,
            y: undefined,
            yStacked: undefined,
            baseline: undefined,
        };
        if (config)
            this.setConfig(config);
        this.g.style('opacity', 0);
        this.line = this.g.append('line')
            .attr('class', line);
    }
    set accessors(accessors) { this._accessors = accessors; }
    get accessors() {
        var _a;
        const { config } = this;
        const hasConfig = !!(config.x || config.y || config.yStacked);
        const x = hasConfig ? config.x : this._accessors.x;
        const yAcc = hasConfig ? config.y : this._accessors.y;
        const y = yAcc ? (isArray(yAcc) ? yAcc : [yAcc]) : undefined;
        const yStacked = hasConfig ? config.yStacked : this._accessors.yStacked;
        const baseline = (_a = config.baseline) !== null && _a !== void 0 ? _a : this._accessors.baseline;
        return { x, y, yStacked, baseline };
    }
    _isContainerInViewport() {
        var _a;
        if (!((_a = this.container) === null || _a === void 0 ? void 0 : _a.node()))
            return false;
        const containerRect = this.container.node().getBoundingClientRect();
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        // Calculate the visible area of the container
        const visibleWidth = Math.max(0, Math.min(containerRect.right, viewportWidth) - Math.max(containerRect.left, 0));
        const visibleHeight = Math.max(0, Math.min(containerRect.bottom, viewportHeight) - Math.max(containerRect.top, 0));
        const containerArea = containerRect.width * containerRect.height;
        const visibleArea = visibleWidth * visibleHeight;
        // Container must be at least 35% visible
        return containerArea > 0 && (visibleArea / containerArea) >= 0.35;
    }
    setContainer(containerSvg) {
        if (this.container === containerSvg)
            return;
        this.container = containerSvg;
        this.container.on('mousemove.crosshair', this._onMouseMove.bind(this));
        this.container.on('mouseout.crosshair', this._onMouseOut.bind(this));
        this.container.on('wheel.crosshair', this._onWheel.bind(this));
    }
    _render(customDuration) {
        var _a, _b, _c, _d, _e;
        const { config, datamodel } = this;
        const duration = isNumber(customDuration) ? customDuration : config.duration;
        const isForceShowAtDefined = config.forceShowAt !== undefined;
        const xPx = isForceShowAtDefined ? this.xScale(config.forceShowAt) : this._xPx;
        const xValue = this.xScale.invert(xPx);
        const leftNearestDatumIndex = (((_a = datamodel.data) === null || _a === void 0 ? void 0 : _a.length) && this.accessors.x)
            ? datamodel.data.indexOf(getNearest(datamodel.data, xValue, this.accessors.x, FindNearestDirection.Left)) : undefined;
        // If `snapToData` is `true`, we need to find the nearest datum to the crosshair
        // It can be from a mouse interaction or from a `forceShowAt` setting
        let nearestDatum;
        let nearestDatumIndex;
        if (config.snapToData) {
            if (!this.accessors.y && !this.accessors.yStacked && ((_b = datamodel.data) === null || _b === void 0 ? void 0 : _b.length)) {
                console.warn('Unovis | Crosshair: Y accessors have not been configured. Please check if they\'re present in the configuration object');
            }
            // Emit a warning if there's no data to snap to.
            // To keep the console clean, only emit the warning when there's mouse interaction.
            if (!((_c = datamodel.data) === null || _c === void 0 ? void 0 : _c.length) && this._mouseEvent) {
                console.warn('Unovis | Crosshair: No data to snap to. Make sure the data has been passed to the container or to the crosshair itself');
            }
            nearestDatum = getNearest(datamodel.data, xValue, this.accessors.x);
            nearestDatumIndex = datamodel.data.indexOf(nearestDatum);
        }
        const xRange = this.xScale.range();
        const yRange = this.yScale.range();
        const xClamped = config.snapToData && nearestDatum
            ? clamp(Math.round(this.xScale(getNumber(nearestDatum, this.accessors.x, nearestDatumIndex))), 0, this._width)
            : clamp(xPx, xRange[0], xRange[1]);
        const isCrosshairWithinXRange = (xPx >= xRange[0]) && (xPx <= xRange[1]);
        const isCrosshairWithinYRange = (this._yPx >= Math.min(yRange[0], yRange[1])) && (this._yPx <= Math.max(yRange[0], yRange[1]));
        let shouldShow = config.skipRangeCheck ? !!this._xPx : (this._xPx ? isCrosshairWithinXRange && isCrosshairWithinYRange : isCrosshairWithinXRange);
        // If the crosshair is far from the mouse pointer (usually when `snapToData` is `true` and data resolution is low), hide it
        if (config.hideWhenFarFromPointer && ((Math.abs(xClamped - (+xPx)) >= config.hideWhenFarFromPointerDistance))) {
            shouldShow = false;
        }
        const tooltip = (_d = config.tooltip) !== null && _d !== void 0 ? _d : this.tooltip;
        if (shouldShow && tooltip && this._isContainerInViewport()) {
            const container = tooltip.getContainer() || this.container.node();
            const isContainerBody = tooltip.isContainerBody();
            const nearestDatumXValue = this.accessors.x ? getNumber(nearestDatum, this.accessors.x, nearestDatumIndex) : undefined;
            if (isForceShowAtDefined) {
                // Convert SVG coordinates to screen coordinates
                const containerRect = this.container.node().getBoundingClientRect();
                // Use the actual left margin from the container
                const screenX = (isContainerBody ? xPx + containerRect.left : xPx) + this._containerMargin.left;
                const screenY = this._height / 2 + (isContainerBody ? containerRect.top : 0);
                const pos = [screenX, screenY];
                this._showTooltip(nearestDatum, nearestDatumXValue, pos, leftNearestDatumIndex);
            }
            else if (this._mouseEvent) {
                const pos = (isContainerBody ? [this._mouseEvent.clientX, this._mouseEvent.clientY] : pointer(this._mouseEvent, container));
                this._showTooltip(nearestDatum, nearestDatumXValue, pos, leftNearestDatumIndex);
            }
        }
        else
            this._hideTooltip();
        // Trigger `onCrosshairMove` if the render was triggered by a mouse move event
        if (this._mouseEvent) {
            (_e = config.onCrosshairMove) === null || _e === void 0 ? void 0 : _e.call(config, shouldShow ? this.xScale.invert(this._xPx) : undefined, nearestDatum, nearestDatumIndex, this._mouseEvent);
            this._mouseEvent = undefined;
        }
        smartTransition(this.g, duration)
            .style('opacity', shouldShow ? 1 : 0);
        // When `config.forceShowAt` becomes `undefined`, the crosshair "jumps" to the edge of the chart.
        // This looks off, so we stop further rendering when the `xPx` value is not finite.
        if (!isFinite(xPx))
            return;
        this.line
            .attr('y1', 0)
            .attr('y2', this._height);
        smartTransition(this.line, duration, easeLinear)
            .attr('x1', xClamped)
            .attr('x2', xClamped);
        const circleData = isFunction(config.getCircles)
            ? config.getCircles(xValue, datamodel.data, this.yScale, leftNearestDatumIndex)
            : this.getCircleData(nearestDatum, nearestDatumIndex);
        const circles = this.g
            .selectAll('circle')
            .data(circleData, (d, i) => { var _a; return (_a = d.id) !== null && _a !== void 0 ? _a : i; });
        const circlesEnter = circles.enter()
            .append('circle')
            .attr('class', circle)
            .attr('r', 0)
            .attr('cx', xClamped)
            .attr('cy', d => d.y)
            .style('fill', d => d.color)
            .style('stroke', d => d.strokeColor)
            .style('stroke-width', d => d.strokeWidth);
        smartTransition(circlesEnter.merge(circles), duration, easeLinear)
            .attr('cx', xClamped)
            .attr('cy', d => d.y)
            .attr('r', 4)
            .style('opacity', d => d.opacity)
            .style('fill', d => d.color)
            .style('stroke', d => d.strokeColor)
            .style('stroke-width', d => d.strokeWidth);
        circles.exit().remove();
    }
    hide(sourceEvent) {
        window.cancelAnimationFrame(this._animFrameId);
        this._animFrameId = window.requestAnimationFrame(() => {
            var _a, _b;
            this._xPx = undefined;
            this._yPx = undefined;
            this._mouseEvent = undefined;
            // We call `onCrosshairMove` with all the arguments set to `undefined` because we want
            // the users to be able to hide the crosshair easily when using `forceShowAt`
            (_b = (_a = this.config).onCrosshairMove) === null || _b === void 0 ? void 0 : _b.call(_a, undefined, undefined, undefined, sourceEvent);
            this._render();
        });
    }
    _onMouseMove(event) {
        var _a;
        const { datamodel, element } = this;
        if (!this.accessors.x && ((_a = datamodel.data) === null || _a === void 0 ? void 0 : _a.length)) {
            console.warn('Unovis | Crosshair: X accessor function has not been configured. Please check if it\'s present in the configuration object');
        }
        const [x, y] = pointer(event, element);
        this._xPx = x;
        this._yPx = y;
        this._mouseEvent = event;
        window.cancelAnimationFrame(this._animFrameId);
        this._animFrameId = window.requestAnimationFrame(() => {
            // We'll call `config.onCrosshairMove` in `_render` with the found `nearestDatum` and `nearestDatumIndex`,
            // which can come from the mouse interaction or from the `forceShowAt` setting
            this._render();
        });
    }
    _onMouseOut(event) {
        var _a;
        // Only hide if the mouse actually left the SVG, not just moved to a child
        if (!event || !((_a = this.container) === null || _a === void 0 ? void 0 : _a.node().contains(event.relatedTarget))) {
            this.hide(event);
        }
    }
    _onWheel(event) {
        this.hide(event);
    }
    _showTooltip(datum, xValue, pos, nearestDatumIndex) {
        var _a;
        const { config, datamodel } = this;
        const tooltip = (_a = config.tooltip) !== null && _a !== void 0 ? _a : this.tooltip;
        if (!tooltip || !pos)
            return;
        const [x, y] = pos;
        const content = config.template(datum, xValue, datamodel.data, nearestDatumIndex);
        // Force set `followCursor` to `true` because we don't want Crosshair's tooltip to be hoverable
        tooltip.config.followCursor = true;
        // Set tooltip placement based on Crosshair's position (left / right)
        if (!tooltip.config.horizontalPlacement || tooltip.config.horizontalPlacement === Position.Auto) {
            const xRelative = tooltip.isContainerBody() ? x - this.container.node().getBoundingClientRect().left : x;
            tooltip.overrideHorizontalPlacement(xRelative > this._containerWidth / 2 ? Position.Left : Position.Right);
        }
        if (content)
            tooltip.show(content, { x, y });
    }
    _hideTooltip() {
        var _a;
        const { config } = this;
        const tooltip = (_a = config.tooltip) !== null && _a !== void 0 ? _a : this.tooltip;
        tooltip === null || tooltip === void 0 ? void 0 : tooltip.hide();
    }
    // We don't want Crosshair to be be taken in to account in domain calculations
    getYDataExtent() {
        return [undefined, undefined];
    }
    getCircleData(datum, datumIndex) {
        var _a, _b;
        const { config } = this;
        if (config.snapToData && datum) {
            const yAccessors = (_a = this.accessors.y) !== null && _a !== void 0 ? _a : [];
            const yStackedAccessors = (_b = this.accessors.yStacked) !== null && _b !== void 0 ? _b : [];
            const baselineValue = getNumber(datum, this.accessors.baseline, datumIndex) || 0;
            const stackedValues = getStackedValues(datum, datumIndex, ...yStackedAccessors)
                .map((value, index) => ({
                y: this.yScale(value + baselineValue),
                opacity: isNumber(getNumber(datum, yStackedAccessors[index], index)) ? 1 : 0,
                color: getColor(datum, config.color, index),
                strokeColor: config.strokeColor ? getColor(datum, config.strokeColor, index) : undefined,
                strokeWidth: config.strokeWidth ? getNumber(datum, config.strokeWidth, index) : undefined,
            }));
            const regularValues = yAccessors
                .map((a, index) => {
                const value = getNumber(datum, a, datumIndex);
                return {
                    y: this.yScale(value),
                    opacity: isNumber(value) ? 1 : 0,
                    color: getColor(datum, config.color, stackedValues.length + index),
                    strokeColor: config.strokeColor ? getColor(datum, config.strokeColor, index) : undefined,
                    strokeWidth: config.strokeWidth ? getNumber(datum, config.strokeWidth, index) : undefined,
                };
            });
            return stackedValues.concat(regularValues);
        }
        return [];
    }
}
Crosshair.selectors = style;

export { Crosshair };
//# sourceMappingURL=index.js.map
