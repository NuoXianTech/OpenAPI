import { defineComponent as p, computed as u, ref as s, onMounted as f, nextTick as m, onUnmounted as v, watch as g, createElementBlock as x, openBlock as _ } from "vue";
import { RollingPinLegend as i } from "@unovis/ts";
import { useForwardProps as P, arePropsEqual as b } from "../../utils/props.js";
const h = i.selectors, w = /* @__PURE__ */ p({
  __name: "index",
  props: {
    rects: {},
    leftLabelText: {},
    rightLabelText: {},
    labelClassName: {},
    labelFontSize: {},
    renderIntoProvidedDomNode: { type: Boolean },
    data: {}
  },
  setup(c, { expose: d }) {
    const l = c;
    u(() => l.data);
    const n = P(l), o = s(), t = s();
    return f(() => {
      m(() => {
        t.value && (o.value = new i(t.value, n.value));
      });
    }), v(() => {
      var e;
      (e = o.value) == null || e.destroy();
    }), g(n, (e, r) => {
      var a;
      b(e, r) || (a = o.value) == null || a.setConfig(n.value);
    }), d({
      component: o
    }), (e, r) => (_(), x("div", {
      "data-vis-rolling-pin-legend": "",
      ref_key: "elRef",
      ref: t
    }, null, 512));
  }
});
export {
  h as VisRollingPinLegendSelectors,
  w as default
};
//# sourceMappingURL=index.js.map
