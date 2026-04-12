import { Path } from 'd3-path';
export declare type RoundedRectPathOptions = {
    x: number;
    y: number;
    w: number;
    h: number;
    r: number;
    tl: boolean;
    tr: boolean;
    bl: boolean;
    br: boolean;
};
export declare function roundedRectPath({ x, y, w, h, tl, tr, bl, br, r, }: RoundedRectPathOptions): string;
export declare function polygon(size: number, n?: number, endAngle?: number, open?: boolean): string;
export declare function circlePath(cx: number, cy: number, r: number): string;
export declare type ScoreRectPathOptions = {
    x: number;
    y: number;
    w: number;
    h: number;
    r: number;
    score: number;
};
export declare function scoreRectPath({ x, y, w, h, r, score }: ScoreRectPathOptions): string;
export declare function convertLineToArc(path: Path | string, r: number): string;
/**
 * Generate an SVG path string for an arrow that follows a polyline path.
 * The arrow is composed of line segments between points and a triangular arrowhead at the end.
 *
 * @param opts - ArrowPolylinePathOptions object containing array of points and optional head dimensions.
 * @returns SVG path string for the arrow.
 */
export declare function arrowPolylinePath(points: [number, number][], arrowHeadLength?: number, arrowHeadWidth?: number, smoothing?: number): string;
