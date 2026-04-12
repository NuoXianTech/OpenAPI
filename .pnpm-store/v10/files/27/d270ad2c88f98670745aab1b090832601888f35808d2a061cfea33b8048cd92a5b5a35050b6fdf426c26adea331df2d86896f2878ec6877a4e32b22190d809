import { XYComponentCore } from "../../core/xy-component";
import { Spacing } from "../../types";
import { TimelineConfigInterface } from './config';
import * as s from './style';
export declare class Timeline<Datum> extends XYComponentCore<Datum, TimelineConfigInterface<Datum>> {
    static selectors: typeof s;
    protected _defaultConfig: TimelineConfigInterface<Datum>;
    config: TimelineConfigInterface<Datum>;
    events: {
        [x: string]: {
            wheel: (d: unknown, event: WheelEvent) => void;
        };
    };
    private _background;
    private _rowsGroup;
    private _arrowsGroup;
    private _linesGroup;
    private _labelsGroup;
    private _rowIconsGroup;
    private _scrollBarGroup;
    private _scrollBarBackground;
    private _scrollBarHandle;
    private _scrollBarWidth;
    private _scrollDistance;
    private _scrollBarMargin;
    private _maxScroll;
    private _scrollbarHeight;
    private _labelMargin;
    private _labelWidth;
    private _rowIconBleed;
    private _lineBleed;
    /** We define a dedicated clipping path for this component because it needs to behave
     * differently than the regular XYContainer's clipPath */
    private _clipPathId;
    private _clipPath;
    constructor(config?: TimelineConfigInterface<Datum>);
    setConfig(config: TimelineConfigInterface<Datum>): void;
    setData(data: Datum[]): void;
    get bleed(): Spacing;
    _render(customDuration?: number): void;
    private _getLineLength;
    private _getLineWidth;
    private _getLineDuration;
    private _prepareLinesData;
    private _prepareArrowsData;
    private _renderLines;
    private _onScrollbarDrag;
    private _onMouseWheel;
    private _updateScrollPosition;
    private _getRecordKey;
    private _getRowLabels;
    getXDataExtent(): number[];
}
