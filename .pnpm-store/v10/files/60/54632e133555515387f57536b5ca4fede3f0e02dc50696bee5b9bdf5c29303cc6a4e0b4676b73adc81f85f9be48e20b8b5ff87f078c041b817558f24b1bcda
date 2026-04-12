export declare enum PlotlineLineStylePresets {
    Solid = "solid",
    Dash = "dash",
    DashDot = "dashDot",
    Dot = "dot",
    LongDash = "longDash",
    LongDashDot = "longDashDot",
    LongDashDotDot = "longDashDotDot",
    ShortDash = "shortDash",
    ShortDashDot = "shortDashDot",
    ShortDashDotDot = "shortDashDotDot",
    ShortDot = "shortDot"
}
export declare enum PlotlineLabelPosition {
    TopLeft = "top-left",
    Top = "top",
    TopRight = "top-right",
    Right = "right",
    BottomRight = "bottom-right",
    Bottom = "bottom",
    BottomLeft = "bottom-left",
    Left = "left"
}
export declare enum PlotlineLabelOrientation {
    Horizontal = "horizontal",
    Vertical = "vertical"
}
export interface PlotlineLabelOptions {
    labelText?: string;
    labelPosition: PlotlineLabelPosition;
    labelOffsetX: number;
    labelOffsetY: number;
    labelOrientation: PlotlineLabelOrientation;
    labelColor?: string;
    labelSize?: number;
}
export declare type PlotlineLayoutValue = {
    x: number;
    y: number;
    textAnchor: string;
    dominantBaseline: string;
};
export declare type PlotlineLabelLayout = {
    rotation: number;
    transform: string;
} & PlotlineLayoutValue;
export declare type LineStyleValue = `${number}` | `${number},${number}` | `${number},${number},${number}` | `${number},${number},${number},${number}` | `${number},${number},${number},${number},${number}` | `${number},${number},${number},${number},${number},${number}`;
export declare type PlotlineLayoutMap = Record<PlotlineLabelPosition, (params: {
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
}) => PlotlineLayoutValue>;
