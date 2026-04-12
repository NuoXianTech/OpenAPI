import { css } from '@emotion/css';
import { getCssVarNames, injectGlobalCssVariables } from '../../utils/style.js';

const cssVarDefaults = {
    '--vis-treemap-tile-stroke-color': '#fff',
    '--vis-treemap-tile-stroke-width': '2px',
    '--vis-treemap-tile-hover-stroke-color': '#fff',
    '--vis-treemap-tile-hover-stroke-opacity': 0,
    /* Labels */
    '--vis-treemap-label-opacity': 0.8,
    '--vis-treemap-label-font-weight': 'normal',
    '--vis-treemap-label-text-color': '#000',
    '--vis-treemap-label-text-color-light': '#fff',
    '--vis-treemap-label-font-size': '12px',
};
const root = css `
  label: treemap-component;
`;
const variables = getCssVarNames(cssVarDefaults);
injectGlobalCssVariables(cssVarDefaults, root);
const tiles = css `
  label: g-tiles;
`;
const tileGroup = css `
  label: tile-group;
`;
const tile = css `
  label: tile;
  stroke: var(${variables.treemapTileHoverStrokeColor});
  stroke-opacity: 0;

  &:hover {
    stroke-opacity: var(${variables.treemapTileHoverStrokeOpacity})
  }
`;
const tileExiting = css `
  label: tile-exiting;
  pointer-events: none;
`;
// The leaf tiles are clickable
const clickableTile = css `
  label: clickable-tile;
  cursor: pointer;
`;
const tileForeground = css `
  label: tile-foreground;
`;
const label = css `
  label: label;
  text-anchor: start;
  dominant-baseline: hanging;
  user-select: none;
  pointer-events: none;
  font-size: var(${variables.treemapLabelFontSize});
  opacity: var(${variables.treemapLabelOpacity});
  fill: var(${variables.treemapLabelTextColor});
  font-weight: var(${variables.treemapLabelFontWeight});
`;
const internalLabel = css `
  label: internal-label;
  font-weight: 500;
`;
const labelGroup = css `
  label: label-group;
`;

export { clickableTile, internalLabel, label, labelGroup, root, tile, tileExiting, tileForeground, tileGroup, tiles, variables };
//# sourceMappingURL=style.js.map
