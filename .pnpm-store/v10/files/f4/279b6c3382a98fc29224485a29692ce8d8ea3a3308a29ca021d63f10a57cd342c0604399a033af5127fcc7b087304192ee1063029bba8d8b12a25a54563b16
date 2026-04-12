import { Selection } from 'd3-selection';
import { XYComponentCore } from "../../core/xy-component";
import { PlotbandConfigInterface } from './config';
import * as s from './style';
export declare class Plotband<Datum> extends XYComponentCore<Datum, PlotbandConfigInterface<Datum>> {
    static selectors: typeof s;
    protected _defaultConfig: PlotbandConfigInterface<Datum>;
    from: number | null | undefined;
    to: number | null | undefined;
    plotband: Selection<SVGRectElement, unknown, null, undefined>;
    label: Selection<SVGTextElement, unknown, null, undefined>;
    constructor(config: PlotbandConfigInterface<Datum>);
    _render(customDuration?: number): void;
    private computeLabel;
}
