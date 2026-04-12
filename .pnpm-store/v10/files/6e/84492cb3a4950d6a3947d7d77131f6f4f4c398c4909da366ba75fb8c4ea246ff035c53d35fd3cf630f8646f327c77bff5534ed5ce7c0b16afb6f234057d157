import { Selection } from 'd3-selection';
import { XYComponentCore } from "../../core/xy-component";
import { Tooltip } from "../tooltip";
import { CrosshairAccessors } from './types';
import { CrosshairConfigInterface } from './config';
import * as s from './style';
export declare class Crosshair<Datum> extends XYComponentCore<Datum, CrosshairConfigInterface<Datum>> {
    static selectors: typeof s;
    clippable: boolean;
    protected _defaultConfig: CrosshairConfigInterface<Datum>;
    config: CrosshairConfigInterface<Datum>;
    container: Selection<SVGSVGElement, any, SVGSVGElement, any>;
    line: Selection<SVGLineElement, any, SVGElement, any>;
    private _xPx;
    private _yPx;
    private _mouseEvent;
    private _animFrameId;
    /** Tooltip component to be used by Crosshair if not provided by the config.
     * This property is supposed to be set externally by a container component like XYContainer. */
    tooltip: Tooltip;
    /** Accessors passed externally (e.g. from XYContainer) */
    private _accessors;
    set accessors(accessors: CrosshairAccessors<Datum>);
    get accessors(): CrosshairAccessors<Datum>;
    private _isContainerInViewport;
    constructor(config?: CrosshairConfigInterface<Datum>);
    setContainer(containerSvg: Selection<SVGSVGElement, unknown, SVGSVGElement, unknown>): void;
    _render(customDuration?: number): void;
    hide(sourceEvent?: MouseEvent | WheelEvent): void;
    _onMouseMove(event: MouseEvent): void;
    _onMouseOut(event?: MouseEvent): void;
    _onWheel(event: WheelEvent): void;
    _showTooltip(datum: Datum | undefined, xValue: number, pos: [number, number], nearestDatumIndex: number | undefined): void;
    _hideTooltip(): void;
    getYDataExtent(): number[];
    private getCircleData;
}
