import { Selection } from 'd3-selection';
import { XYComponentCore } from "../../core/xy-component";
import { Position } from "../../types/position";
import { Spacing } from "../../types/spacing";
import { AxisConfigInterface } from './config';
import * as s from './style';
export declare class Axis<Datum> extends XYComponentCore<Datum, AxisConfigInterface<Datum>> {
    static selectors: typeof s;
    protected _defaultConfig: AxisConfigInterface<Datum>;
    config: AxisConfigInterface<Datum>;
    private axisGroup;
    private gridGroup;
    private _axisRawBBox;
    private _axisSizeBBox;
    private _requiredMargin;
    private _defaultNumTicks;
    private _collideTickLabelsAnimFrameId;
    private _tickTextStyleCached;
    protected events: {};
    constructor(config?: AxisConfigInterface<Datum>);
    /** Renders axis to an invisible grouped to calculate automatic chart margins */
    preRender(): void;
    getPosition(): Position;
    private _getAxisSize;
    private _getRequiredMargin;
    getRequiredMargin(): Spacing;
    /** Calculates axis transform:translate offset based on passed container margins */
    getOffset(containerMargin: Spacing): {
        left: number;
        top: number;
    };
    _render(duration?: number, selection?: Selection<SVGGElement, unknown, SVGGElement, unknown>): void;
    private _buildAxis;
    private _buildGrid;
    private _renderAxis;
    private _resolveTickLabelOverlap;
    private _collideTickLabels;
    private _getNumTicks;
    private _getConfiguredTickValues;
    private _shouldRenderMinMaxTicksOnly;
    private _getFullDomainPath;
    private _renderAxisLabel;
    private _getLabelDY;
    private _getTickTextOffset;
    private _alignTickLabels;
    private _getYTickTextTranslate;
}
