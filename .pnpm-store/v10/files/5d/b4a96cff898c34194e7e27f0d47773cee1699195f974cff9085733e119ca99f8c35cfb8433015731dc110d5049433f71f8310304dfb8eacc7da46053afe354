import { select } from 'd3-selection';
import { smartTransition } from '../../utils/d3.js';
import { merge } from '../../utils/data.js';
import { FlowLegendDefaultConfig } from './config.js';
import { FlowLegendItemType } from './types.js';
import * as style from './style.js';
import { root, labels, item, arrow, label, clickable } from './style.js';

class FlowLegend {
    constructor(element, config) {
        this._defaultConfig = FlowLegendDefaultConfig;
        this.config = this._defaultConfig;
        this._container = element;
        this.div = (config === null || config === void 0 ? void 0 : config.renderIntoProvidedDomNode)
            ? select(this._container)
            : select(this._container).append('div');
        this.div.classed(root, true);
        this.element = this.div.node();
        this.labels = this.div.append('div');
        if (config)
            this.setConfig(config);
    }
    setConfig(config) {
        this.prevConfig = this.config;
        this.config = merge(this._defaultConfig, config);
        this.render();
    }
    /** @deprecated Use setConfig instead */
    update(config) {
        this.setConfig(config);
    }
    render() {
        var _a, _b, _c, _d;
        const { config } = this;
        if (!config.items.length)
            return;
        if (config.customWidth)
            this.div.style('width', `${config.customWidth}px`);
        // Prepare Data
        const legendData = config.items.reduce((acc, label, i) => {
            acc.push({
                text: label,
                index: i,
                type: FlowLegendItemType.Label,
            });
            if (config.arrowSymbol && (acc.length !== config.items.length * 2 - 1)) {
                acc.push({
                    text: config.arrowSymbol,
                    index: i,
                    type: FlowLegendItemType.Symbol,
                });
            }
            return acc;
        }, []);
        // Draw
        this.div
            .style('margin-left', ((_a = config.margin) === null || _a === void 0 ? void 0 : _a.left) ? `${config.margin.left}px` : null)
            .style('margin-right', ((_b = config.margin) === null || _b === void 0 ? void 0 : _b.right) ? `${config.margin.right}px` : null)
            .style('margin-top', ((_c = config.margin) === null || _c === void 0 ? void 0 : _c.top) ? `${config.margin.top}px` : null)
            .style('margin-bottom', ((_d = config.margin) === null || _d === void 0 ? void 0 : _d.bottom) ? `${config.margin.bottom}px` : null);
        this.labels.attr('class', labels(config.spacing, config.lineColor, legendData));
        const legendItems = this.labels.selectAll(`.${item}`)
            .data(legendData);
        const legendItemsEnter = legendItems.enter()
            .append('div')
            .attr('class', item)
            .attr('opacity', 0);
        legendItemsEnter.filter(d => d.type === FlowLegendItemType.Label)
            .on('click', this._onItemClick.bind(this));
        legendItemsEnter.append('span');
        const legendItemsMerged = legendItemsEnter.merge(legendItems);
        smartTransition(legendItemsMerged, 500)
            .attr('opacity', 1);
        legendItemsMerged.select('span')
            .attr('class', d => d.type === FlowLegendItemType.Symbol
            ? arrow(config.arrowColor, config.arrowSymbolYOffset)
            : label(config.labelFontSize, config.labelColor))
            .classed(clickable, d => d.type === FlowLegendItemType.Label && !!config.onLegendItemClick)
            .html(d => d.text);
        legendItems.exit().remove();
    }
    _onItemClick(event, d) {
        const { config } = this;
        if (config.onLegendItemClick)
            config.onLegendItemClick(d.text, d.index);
    }
    destroy() {
        this.labels.remove();
        if (this.element !== this._container)
            this.div.remove();
    }
}
FlowLegend.selectors = style;

export { FlowLegend };
//# sourceMappingURL=index.js.map
