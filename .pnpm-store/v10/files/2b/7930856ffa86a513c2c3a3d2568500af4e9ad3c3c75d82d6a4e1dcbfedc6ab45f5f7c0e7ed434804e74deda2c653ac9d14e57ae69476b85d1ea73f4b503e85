import { Selection } from 'd3-selection';
import { RollingPinLegendConfigInterface } from './config';
import * as s from './style';
export declare class RollingPinLegend {
    static selectors: typeof s;
    protected _defaultConfig: RollingPinLegendConfigInterface;
    config: RollingPinLegendConfigInterface;
    div: Selection<HTMLElement, unknown, null, undefined>;
    element: HTMLElement;
    prevConfig: RollingPinLegendConfigInterface;
    protected _container: HTMLElement;
    constructor(element: HTMLElement, config?: RollingPinLegendConfigInterface);
    setConfig(config: RollingPinLegendConfigInterface): void;
    render(): void;
    destroy(): void;
}
