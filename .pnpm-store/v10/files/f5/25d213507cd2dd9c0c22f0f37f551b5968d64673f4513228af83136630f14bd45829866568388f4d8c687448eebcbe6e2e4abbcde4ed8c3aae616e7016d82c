import { Selection } from 'd3-selection';
import { XYComponentCore } from "../../core/xy-component";
import { PlotlineConfigInterface } from './config';
import * as s from './style';
export declare class Plotline<Datum> extends XYComponentCore<Datum, PlotlineConfigInterface<Datum>> {
    static selectors: typeof s;
    protected _defaultConfig: PlotlineConfigInterface<Datum>;
    value: number | null | undefined;
    plotline: Selection<SVGLineElement, unknown, null, undefined>;
    label: Selection<SVGTextElement, unknown, null, undefined>;
    constructor(config: PlotlineConfigInterface<Datum>);
    _render(customDuration?: number): void;
    private computeLabel;
}
