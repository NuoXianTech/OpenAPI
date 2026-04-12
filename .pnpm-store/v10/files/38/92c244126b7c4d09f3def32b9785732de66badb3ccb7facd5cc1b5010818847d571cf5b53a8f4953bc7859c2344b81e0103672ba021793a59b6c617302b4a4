import { smartTransition } from '../../utils/d3.js';
import { XYComponentCore } from '../../core/xy-component/index.js';
import { AxisType } from '../axis/types.js';
import { VERTICAL_X, HORIZONTAL_X, VERTICAL_Y, HORIZONTAL_Y } from './constants.js';
import { PlotbandDefaultConfig } from './config.js';
import * as style from './style.js';
import { plotband, label } from './style.js';

// Utils
class Plotband extends XYComponentCore {
    constructor(config) {
        super();
        this._defaultConfig = PlotbandDefaultConfig;
        if (config)
            this.setConfig(config);
        this.plotband = this.g.append('rect')
            .attr('class', plotband);
        this.label = this.g
            .append('text')
            .attr('class', label);
    }
    _render(customDuration) {
        super._render(customDuration);
        const { config } = this;
        this.from = config.from;
        this.to = config.to;
        this.plotband
            .style('fill', config.color);
        if (this.from == null || this.to == null)
            return;
        let x = 0;
        let y = 0;
        let width = 0;
        let height = 0;
        if (config.axis === 'y') {
            const y1 = this.yScale(this.from);
            const y2 = this.yScale(this.to);
            y = Math.min(y1, y2);
            height = Math.abs(y1 - y2);
            x = 0;
            width = this._width;
        }
        else {
            const x1 = this.xScale(this.from);
            const x2 = this.xScale(this.to);
            x = Math.min(x1, x2);
            width = Math.abs(x1 - x2);
            y = 0;
            height = this._height;
        }
        smartTransition(this.plotband, config.duration)
            .attr('x', x)
            .attr('y', y)
            .attr('width', width)
            .attr('height', height);
        if (config.labelText) {
            const labelProps = this.computeLabel(config.axis, x, y, width, height, config.labelPosition, config.labelOffsetX, config.labelOffsetY, config.labelOrientation);
            this.label
                .attr('dominant-baseline', labelProps.dominantBaseline)
                .attr('transform', labelProps.transform)
                .style('text-anchor', labelProps.textAnchor)
                .style('fill', config.labelColor)
                .style('font-size', config.labelSize ? `${config.labelSize}px` : undefined);
            smartTransition(this.label, config.duration)
                .text(config.labelText)
                .attr('x', labelProps.x)
                .attr('y', labelProps.y);
        }
        smartTransition(this.plotband.exit())
            .style('opacity', 0)
            .remove();
    }
    computeLabel(axis, startX, startY, width, height, position, offsetX, offsetY, orientation) {
        const isVertical = orientation === 'vertical';
        const rotation = isVertical ? -90 : 0;
        const args = { startX, startY, width, height, offsetX, offsetY };
        let layoutPartial;
        if (axis === AxisType.X) {
            layoutPartial = (isVertical ? VERTICAL_X : HORIZONTAL_X)[position](args);
        }
        else {
            layoutPartial = (isVertical ? VERTICAL_Y : HORIZONTAL_Y)[position](args);
        }
        const { x, y, textAnchor, dominantBaseline } = layoutPartial;
        const transform = rotation !== 0 ? `rotate(${rotation}, ${x}, ${y})` : '';
        return { x, y, rotation, textAnchor, transform, dominantBaseline };
    }
}
Plotband.selectors = style;

export { Plotband };
//# sourceMappingURL=index.js.map
