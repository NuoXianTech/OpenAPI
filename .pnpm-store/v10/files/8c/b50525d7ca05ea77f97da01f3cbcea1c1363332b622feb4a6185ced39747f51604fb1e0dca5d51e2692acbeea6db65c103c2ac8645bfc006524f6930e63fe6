import { css } from '@emotion/css';
import { getCssVarNames, injectGlobalCssVariables } from '../../utils/style.js';

const root = css `
  label: brush-component;
`;
const cssVarDefaults = {
    '--vis-brush-selection-fill-color': 'none',
    '--vis-brush-selection-stroke-color': 'none',
    '--vis-brush-selection-stroke-width': '0',
    '--vis-brush-selection-opacity': '0',
    '--vis-brush-unselected-fill-color': '#0b1640',
    '--vis-brush-unselected-stroke-color': '#acb2b9',
    '--vis-brush-unselected-stroke-width': '0',
    '--vis-brush-unselected-opacity': '0.4',
    '--vis-brush-handle-fill-color': '#6d778c',
    '--vis-brush-handle-stroke-color': '#eee',
    /* Dark Theme */
    '--vis-dark-brush-selection-fill-color': 'none',
    '--vis-dark-brush-selection-stroke-color': 'none',
    '--vis-dark-brush-selection-stroke-width': '0',
    '--vis-dark-brush-selection-opacity': '0',
    '--vis-dark-brush-unselected-fill-color': '#acb2b9',
    '--vis-dark-brush-unselected-stroke-color': '#0b1640',
    '--vis-dark-brush-unselected-stroke-width': '0',
    '--vis-dark-brush-unselected-opacity': '0.4',
    '--vis-dark-brush-handle-fill-color': '#acb2b9',
    '--vis-dark-brush-handle-stroke-color': 'var(--vis-color-grey)',
};
const variables = getCssVarNames(cssVarDefaults);
injectGlobalCssVariables(cssVarDefaults, root);
const brush = css `
  label: brush;

  .selection {
    fill: var(${variables.brushSelectionFillColor});
    stroke: var(${variables.brushSelectionStrokeColor});
    stroke-width: var(${variables.brushSelectionStrokeWidth});
    opacity: var(${variables.brushSelectionOpacity});
  }

  .handle {
    fill: var(${variables.brushHandleFillColor});
  }

  &.non-draggable {
    .selection, .overlay {
      pointer-events: none;
    }
  }
`;
const unselected = css `
  label: unselected;
  fill: var(${variables.brushUnselectedFillColor});
  stroke: var(${variables.brushUnselectedStrokeColor});
  stroke-width: var(${variables.brushUnselectedStrokeWidth});
  stroke-opacity: var(${variables.brushUnselectedOpacity});
  opacity: var(${variables.brushUnselectedOpacity});
  pointer-events: none;
`;
const handleLine = css `
  label: handle-line;
  stroke: var(${variables.brushHandleStrokeColor});
  stroke-width: 1;
  fill: none;
  pointer-events: none;
`;

export { brush, cssVarDefaults, handleLine, root, unselected, variables };
//# sourceMappingURL=style.js.map
