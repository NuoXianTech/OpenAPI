import { css } from '@emotion/css';
import { getCssVarNames, injectGlobalCssVariables } from '../../utils/style.js';
import { UNOVIS_ICON_FONT_FAMILY_DEFAULT } from '../../styles/index.js';

const SANKEY_ICON_SIZE = 22;
const root = css `
  label: sankey-component;
`;
const cssVarDefaults = {
    /* Links */
    '--vis-sankey-link-cursor': 'default',
    '--vis-sankey-link-color': 'var(--vis-color-main-light)',
    '--vis-sankey-link-opacity': '0.5',
    '--vis-sankey-link-hover-opacity': '1.0',
    /* Nodes */
    '--vis-sankey-node-cursor': 'default',
    '--vis-sankey-node-color': 'var(--vis-color-main)',
    '--vis-sankey-node-label-color': '#575c65',
    '--vis-sankey-node-opacity': '0.9',
    '--vis-sankey-node-hover-opacity': '1.0',
    /* Node Selection */
    '--vis-sankey-node-selection-stroke-width': '1.5px',
    '--vis-sankey-node-selection-stroke-opacity': '0.6',
    '--vis-sankey-node-selection-border-radius': '2px',
    /* Node Labels */
    '--vis-sankey-node-label-background-fill-color': '#ffffff',
    '--vis-sankey-node-label-background-stroke-color': '#eaeaea',
    '--vis-sankey-node-label-background-opacity': '0.9',
    '--vis-sankey-node-label-cursor': 'default',
    '--vis-sankey-node-label-font-weight': '600',
    '--vis-sankey-node-label-font-size': '12px',
    '--vis-sankey-node-label-text-decoration': 'none',
    '--vis-sankey-node-sublabel-font-size': '10px',
    '--vis-sankey-node-sublabel-font-weight': '500',
    /* Icons */
    '--vis-sankey-icon-size': `${SANKEY_ICON_SIZE}px`,
    '--vis-sankey-icon-color': '#ffffff',
    '--vis-sankey-icon-stroke-opacity': '0.6',
    '--vis-sankey-icon-font-family': UNOVIS_ICON_FONT_FAMILY_DEFAULT,
    // Undefined by default to allow proper fallback to var(--vis-font-family)
    /* --vis-sankey-label-font-family: */
    /* Dark Theme */
    '--vis-dark-sankey-link-color': 'var(--vis-color-main-dark)',
    '--vis-dark-sankey-node-color': 'var(--vis-color-main)',
    '--vis-dark-sankey-node-label-color': '#eaeaea',
    '--vis-dark-sankey-node-label-background-fill-color': '#292b34',
    '--vis-dark-sankey-node-label-background-stroke-color': '#575c65',
    '--vis-dark-sankey-icon-color': '#292b34',
};
const variables = getCssVarNames(cssVarDefaults);
injectGlobalCssVariables(cssVarDefaults, root);
const links = css `
  label: links;
`;
const nodes = css `
  label: nodes;
`;
const link = css `
  label: link;

  path {
    cursor: var(${variables.sankeyLinkCursor});
    fill: var(${variables.sankeyLinkColor});
    fill-opacity: var(${variables.sankeyLinkOpacity});
  }

  &:hover {
    path {
      fill-opacity: var(${variables.sankeyLinkHoverOpacity});
    }
  }
`;
const linkPath = css `
  label: visible;
`;
const linkSelectionHelper = css `
  label: transparent;
  opacity: 0;
`;
const labelGroup = css `
  label: label-group;
  cursor: var(${variables.sankeyNodeLabelCursor});
`;
const labelTrimmed = css `
  label: label-trimmed;
`;
const label = css `
  label: label;
  dominant-baseline: hanging;

  fill: var(${variables.sankeyNodeLabelColor});
  text-decoration: var(${variables.sankeyNodeLabelTextDecoration});
  font-weight: var(${variables.sankeyNodeLabelFontWeight});
  user-select: none;

  &, tspan {
    font-family: var(--vis-sankey-label-font-family, var(--vis-font-family));
    dominant-baseline: hanging;
  }
`;
const sublabel = css `
  label: sub-label;
  dominant-baseline: hanging;

  fill: var(${variables.sankeyNodeLabelColor});
  user-select: none;

  &, tspan {
    font-family: var(--vis-sankey-label-font-family, var(--vis-font-family));
    font-weight: var(${variables.sankeyNodeSublabelFontWeight});
    dominant-baseline: hanging;
  }
`;
const labelBackground = css `
  label: label-background;
  stroke: var(${variables.sankeyNodeLabelBackgroundStrokeColor});
  fill: var(${variables.sankeyNodeLabelBackgroundFillColor});
  opacity: var(${variables.sankeyNodeLabelBackgroundOpacity});
`;
const hidden = css `
  label: hidden;
  visibility: hidden;
`;
const forceShow = css `
  label: forceShow;
  visibility: visible;
`;
const nodeGroup = css `
  label: node-group;
`;
const node = css `
  label: node;

  cursor: var(${variables.sankeyNodeCursor});
  fill: var(${variables.sankeyNodeColor});
  opacity: var(${variables.sankeyNodeOpacity});

  &:hover {
    opacity: var(${variables.sankeyNodeHoverOpacity});
  }
`;
const nodeIcon = css `
  label: icon;

  font-family: var(${variables.sankeyIconFontFamily});
  text-anchor: middle;
  font-size: var(${variables.sankeyIconSize});
  fill: var(${variables.sankeyIconColor});
  stroke: var(${variables.sankeyNodeColor});
  stroke-opacity: var(${variables.sankeyIconStrokeOpacity});
  user-select: none;
  pointer-events: none;
  dominant-baseline: central;
`;
const nodeExit = css `
  label: node-exit;
`;
const nodeSelectionRect = css `
  label: node-selection-rect;
  fill: none;
  stroke: var(${variables.sankeyNodeColor});
  stroke-width: var(${variables.sankeyNodeSelectionStrokeWidth});
  stroke-opacity: var(${variables.sankeyNodeSelectionStrokeOpacity});
  rx: var(${variables.sankeyNodeSelectionBorderRadius});
  ry: var(${variables.sankeyNodeSelectionBorderRadius});
`;
const background = css `
  label: background;
`;

export { SANKEY_ICON_SIZE, background, cssVarDefaults, forceShow, hidden, label, labelBackground, labelGroup, labelTrimmed, link, linkPath, linkSelectionHelper, links, node, nodeExit, nodeGroup, nodeIcon, nodeSelectionRect, nodes, root, sublabel, variables };
//# sourceMappingURL=style.js.map
