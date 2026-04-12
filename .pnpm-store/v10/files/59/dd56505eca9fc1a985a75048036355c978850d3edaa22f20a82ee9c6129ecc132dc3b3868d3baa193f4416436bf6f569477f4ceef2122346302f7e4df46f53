import { XYComponentCore } from "../../core/xy-component";
import { Spacing } from "../../types/spacing";
import { AreaDatum } from './types';
import { AreaConfigInterface } from './config';
import * as s from './style';
export declare class Area<Datum> extends XYComponentCore<Datum, AreaConfigInterface<Datum>> {
    static selectors: typeof s;
    protected _defaultConfig: AreaConfigInterface<Datum>;
    config: AreaConfigInterface<Datum>;
    stacked: boolean;
    private _areaGen;
    private _lineGen;
    private _prevNegative;
    events: {
        [x: string]: {};
    };
    constructor(config?: AreaConfigInterface<Datum>);
    get bleed(): Spacing;
    _render(customDuration?: number): void;
    _renderLines(duration: number, stackedData: AreaDatum[][]): void;
    getYDataExtent(scaleByVisibleData: boolean): number[];
    _emptyPath(): string;
    _emptyLinePath(): string;
}
