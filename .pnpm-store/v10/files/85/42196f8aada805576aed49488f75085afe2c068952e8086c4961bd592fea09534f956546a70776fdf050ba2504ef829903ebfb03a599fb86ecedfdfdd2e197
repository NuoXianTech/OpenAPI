import { Selection } from 'd3-selection';
import { ComponentCore } from "../../core/component";
import { Position } from "../../types/position";
import { TooltipConfigInterface } from './config';
import * as s from './style';
export declare class Tooltip {
    element: HTMLElement;
    div: Selection<HTMLElement, unknown, null, undefined>;
    protected _defaultConfig: TooltipConfigInterface;
    config: TooltipConfigInterface;
    prevConfig: TooltipConfigInterface;
    components: ComponentCore<unknown>[];
    static selectors: typeof s;
    private _setUpEventsThrottled;
    private _setContainerPositionThrottled;
    private _isShown;
    private _container;
    private _mutationObserver;
    private _hoveredElement;
    private _position;
    private _overriddenHorizontalPlacement;
    private _hideDelayTimeoutId;
    private _showDelayTimeoutId;
    constructor(config?: TooltipConfigInterface);
    setConfig(config: TooltipConfigInterface): void;
    setContainer(container: HTMLElement): void;
    getContainer(): HTMLElement;
    hasContainer(): boolean;
    setComponents(components: ComponentCore<unknown>[]): void;
    update(): void;
    /** Show the tooltip immediately by providing content and position */
    show(html: string | HTMLElement | null | void, pos: {
        x: number;
        y: number;
    }): void;
    private _hide;
    /** Hides the tooltip after `hideDelay` */
    hide(): void;
    private _display;
    /** Simply display the tooltip with its previous content on position, taking into account `showDelay` */
    display(): void;
    place(pos: {
        x: number;
        y: number;
    }): void;
    placeByElement(hoveredElement: SVGElement | HTMLElement): void;
    isContainerBody(): boolean;
    /** Allows to override the horizontal placement of the tooltip which is useful when you want to define custom positioning behavior.
     * This method has been added for Crosshair to allow it position tooltip left or right of the crosshair line
     * (see the `_showTooltip` method of the Crosshair component).
     */
    overrideHorizontalPlacement(placement: Position.Left | Position.Right | string | undefined): void;
    render(html: string | HTMLElement | null | void): void;
    private _applyPosition;
    private _constraintPosToContainer;
    private _setContainerPosition;
    private _setUpEvents;
    private _setUpAttributes;
    destroy(): void;
}
