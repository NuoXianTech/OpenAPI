import { defineComponent as i, inject as p, ref as m, onMounted as u, nextTick as d, onUnmounted as f, watch as v, createElementBlock as h, openBlock as _ } from "vue";
import { Tooltip as s } from "@unovis/ts";
import { useForwardProps as y, arePropsEqual as w } from "../../utils/props.js";
import { tooltipAccessorKey as x } from "../../utils/context.js";
const g = { "data-vis-tooltip": "" }, T = s.selectors, z = /* @__PURE__ */ i({
  __name: "index",
  props: {
    components: {},
    container: {},
    followCursor: { type: Boolean },
    allowHover: { type: Boolean },
    horizontalPlacement: {},
    horizontalShift: {},
    verticalPlacement: {},
    verticalShift: {},
    triggers: {},
    attributes: {},
    className: {},
    hideDelay: {},
    showDelay: {},
    data: {}
  },
  setup(c, { expose: l }) {
    const r = p(x), t = y(c), o = m();
    return u(() => {
      d(() => {
        o.value = new s(t.value), r.update(o.value);
      });
    }), f(() => {
      var e;
      (e = o.value) == null || e.destroy(), r.destroy();
    }), v(t, (e, n) => {
      var a;
      w(e, n) || (a = o.value) == null || a.setConfig(t.value);
    }), l({
      component: o
    }), (e, n) => (_(), h("div", g));
  }
});
export {
  T as VisTooltipSelectors,
  z as default
};
//# sourceMappingURL=index.js.map
