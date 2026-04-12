import { select } from 'd3-selection';
import { merge } from '../../utils/data.js';
import { RollingPinLegendDefaultConfig } from './config.js';
import * as style from './style.js';
import { root, label, rectsContainer, leftLabel, rightLabel, rect } from './style.js';

class RollingPinLegend {
    constructor(element, config) {
        this._defaultConfig = RollingPinLegendDefaultConfig;
        this.config = this._defaultConfig;
        this._container = element;
        this.div = (config === null || config === void 0 ? void 0 : config.renderIntoProvidedDomNode) ? select(this._container) : select(this._container).append('div');
        this.div.classed(root, true);
        this.element = this.div.node();
        if (config)
            this.setConfig(config);
    }
    setConfig(config) {
        this.prevConfig = this.config;
        this.config = merge(this._defaultConfig, config);
        this.render();
    }
    render() {
        const { config } = this;
        const newRoot = this.div
            .selectAll(`.${root}`)
            .data([0])
            .enter()
            .append('div')
            .attr('class', root);
        newRoot
            .append('span')
            .attr('class', label)
            .classed(config.labelClassName, true)
            .style('font-size', config.labelFontSize);
        newRoot
            .append('div')
            .attr('class', rectsContainer);
        newRoot
            .append('span')
            .attr('class', label)
            .classed(config.labelClassName, true)
            .style('font-size', config.labelFontSize);
        const root$1 = this.div
            .select(`.${root}`);
        root$1.selectAll(`.${label}`)
            .data([config.leftLabelText, config.rightLabelText])
            .text(d => d)
            .classed(leftLabel, (d, i) => i === 0 && typeof d === 'string' && d.length > 0)
            .classed(rightLabel, (d, i) => i === 1 && typeof d === 'string' && d.length > 0);
        const rectsContainer$1 = root$1.select(`.${rectsContainer}`);
        const rects = rectsContainer$1.selectAll(`.${rect}`).data(config.rects);
        const rectsEnter = rects.enter()
            .append('div')
            .attr('class', rect);
        const rectsMerged = rectsEnter.merge(rects);
        rectsMerged
            .style('background-color', d => d);
        rects.exit().remove();
    }
    destroy() {
        if (this.element !== this._container)
            this.div.remove();
    }
}
RollingPinLegend.selectors = style;

export { RollingPinLegend };
//# sourceMappingURL=index.js.map
