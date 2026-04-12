import { Selection } from 'd3-selection';
import { ComponentCore } from "../../core/component";
import { SeriesDataModel } from "../../data-models/series";
import { TreemapConfigInterface } from './config';
import * as s from './style';
export declare class Treemap<Datum> extends ComponentCore<Datum[], TreemapConfigInterface<Datum>> {
    static selectors: typeof s;
    protected _defaultConfig: TreemapConfigInterface<Datum>;
    config: TreemapConfigInterface<Datum>;
    datamodel: SeriesDataModel<Datum>;
    tiles: Selection<SVGGElement, unknown, SVGGElement, unknown>;
    constructor(config?: TreemapConfigInterface<Datum>);
    _render(customDuration?: number): void;
    private _isTileLargeEnough;
    private _getTopLevelParent;
    private _getTileLightness;
    private _getTileBorderRadius;
    private _getTileHeight;
    private _getTileWidth;
}
