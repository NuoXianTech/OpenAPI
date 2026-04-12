import { css } from '@emotion/css';
import { getCssVarNames, injectGlobalCssVariables } from '../../utils/style.js';

const root = css `
  display: flex;
`;
const cssVarDefaults = {
    '--vis-rolling-pin-legend-label-color': '#6c778c',
    '--vis-rolling-pin-legend-label-max-width': '300px',
    '--vis-rolling-pin-legend-label-font-size': '12px',
    '--vis-rolling-pin-legend-spacing': '4px',
    '--vis-rolling-pin-legend-item-width': '8px',
    '--vis-dark-rolling-pin-legend-label-color': '#eee',
};
const variables = getCssVarNames(cssVarDefaults);
injectGlobalCssVariables(cssVarDefaults, root);
const rectsContainer = css `
  display: flex;
`;
const label = css `
  font-family: var(--vis-rolling-pin-legend-font-family, var(--vis-font-family));
  font-size: var(${variables.rollingPinLegendLabelFontSize});
  max-width: var(${variables.rollingPinLegendLabelMaxWidth});
  color: var(${variables.rollingPinLegendLabelColor});
`;
const leftLabel = css `
  margin-right: var(${variables.rollingPinLegendSpacing});
`;
const rightLabel = css `
  margin-left: var(${variables.rollingPinLegendSpacing});
`;
const rect = css `
  display: inline-block;
  flex: 1;
  width: var(${variables.rollingPinLegendItemWidth});
`;

export { cssVarDefaults, label, leftLabel, rect, rectsContainer, rightLabel, root, variables };
//# sourceMappingURL=style.js.map
