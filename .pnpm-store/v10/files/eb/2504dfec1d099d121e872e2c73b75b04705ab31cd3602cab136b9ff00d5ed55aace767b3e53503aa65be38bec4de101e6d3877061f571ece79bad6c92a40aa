import { injectGlobal, css } from '@emotion/css';

const globalStyles = injectGlobal `
  :root {
    --vis-plotline-color: rgb(226, 32, 58);
    --vis-plotline-width: 2;
    --vis-plotline-dasharray: none;
    --vis-plotline-stroke-dashoffset: 0;
    --vis-plotline-label-font-size: 12px;
    --vis-plotline-label-color: #000;

    --vis-dark-plotline-label-color: #e5e9f7;
  }

  body.theme-dark {
    --vis-plotline-label-color: var(--vis-dark-tooltip-text-color);
  }
`;
const root = css `
  label: plotline-component;
`;
const plotline = css `
  label: plotline;
  transition: opacity 200ms;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke: var(--vis-plotline-color);
  stroke-width: var(--vis-plotline-width);
  stroke-dasharray: var(--vis-plotline-dasharray);
  stroke-dashoffset: var(--vis-plotline-stroke-dashoffset);
`;
const label = css `
  label: plotline-label;
  text-anchor: middle;
  /* dominant-baseline: middle; */
  pointer-events: none;
  font-size: var(--vis-plotline-label-font-size);
  fill: var(--vis-plotline-label-color);
`;

export { globalStyles, label, plotline, root };
//# sourceMappingURL=style.js.map
