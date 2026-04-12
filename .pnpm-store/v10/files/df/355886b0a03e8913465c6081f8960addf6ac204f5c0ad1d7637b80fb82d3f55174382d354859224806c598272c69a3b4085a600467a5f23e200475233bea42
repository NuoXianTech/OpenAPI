import { Selection } from 'd3-selection';
import { FlowLegendConfigInterface } from './config';
import { FlowLegendItem } from './types';
import * as s from './style';
export declare class FlowLegend {
    static selectors: typeof s;
    div: Selection<HTMLElement, unknown, null, undefined>;
    element: HTMLElement;
    labels: Selection<HTMLDivElement, unknown, null, undefined>;
    protected _defaultConfig: FlowLegendConfigInterface;
    config: FlowLegendConfigInterface;
    prevConfig: FlowLegendConfigInterface;
    protected _container: HTMLElement;
    constructor(element: HTMLElement, config?: FlowLegendConfigInterface);
    setConfig(config: FlowLegendConfigInterface): void;
    /** @deprecated Use setConfig instead */
    update(config: FlowLegendConfigInterface): void;
    render(): void;
    _onItemClick(event: MouseEvent, d: FlowLegendItem): void;
    destroy(): void;
}
