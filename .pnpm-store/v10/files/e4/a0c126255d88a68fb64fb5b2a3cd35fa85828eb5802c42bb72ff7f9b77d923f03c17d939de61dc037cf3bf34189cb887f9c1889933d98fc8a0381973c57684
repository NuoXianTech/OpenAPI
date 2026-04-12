import { defineNuxtModule, createResolver, addComponent, addPlugin } from '@nuxt/kit';

const module = defineNuxtModule({
  meta: {
    name: "vue-sonner",
    configKey: "vueSonner",
    compatibility: {
      nuxt: ">=3.0.0"
    }
  },
  defaults: {
    css: true
  },
  setup(moduleOptions, nuxt) {
    const { resolve } = createResolver(import.meta.url);
    addComponent({
      name: "Toaster",
      export: "Toaster",
      filePath: "vue-sonner",
      mode: "client"
    });
    addPlugin({
      src: resolve("./runtime/plugin"),
      mode: "client"
    });
    if (moduleOptions.css) {
      nuxt.options.css.push("vue-sonner/style.css");
    }
  }
});

export { module as default };
