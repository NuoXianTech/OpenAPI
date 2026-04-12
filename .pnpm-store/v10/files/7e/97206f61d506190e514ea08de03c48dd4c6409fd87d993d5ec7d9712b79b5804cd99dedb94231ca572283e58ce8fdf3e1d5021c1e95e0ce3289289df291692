import { defineComponent as p, inject as u, ref as m, onMounted as d, nextTick as l, onUnmounted as f, watch as v, createElementBlock as _, openBlock as x } from "vue";
import { Annotations as a } from "@unovis/ts";
import { useForwardProps as h, arePropsEqual as k } from "../../utils/props.js";
import { annotationsAccessorKey as w } from "../../utils/context.js";
const y = { "data-vis-annotations": "" }, P = a.selectors, b = /* @__PURE__ */ p({
  __name: "index",
  props: {
    items: {},
    duration: {},
    events: {},
    attributes: {},
    data: {}
  },
  setup(c, { expose: i }) {
    const n = u(w), t = h(c), o = m();
    return d(() => {
      l(() => {
        o.value = new a(t.value), n.update(o.value);
      });
    }), f(() => {
      var e;
      (e = o.value) == null || e.destroy(), n.destroy();
    }), v(t, (e, s) => {
      var r;
      k(e, s) || (r = o.value) == null || r.setConfig(t.value);
    }), i({
      component: o
    }), (e, s) => (x(), _("div", y));
  }
});
export {
  P as VisAnnotationsSelectors,
  b as default
};
//# sourceMappingURL=index.js.map
