import { config } from "@vue/test-utils";
const PLUGIN_NAME = "nuxt-test-utils";
export function getVueWrapperPlugin() {
  const installed = config.plugins.VueWrapper.installedPlugins.find(({ options: options2 }) => options2?._name === PLUGIN_NAME);
  if (installed) return installed.options;
  const options = createPluginOptions();
  config.plugins.VueWrapper.install((instance, options2) => {
    options2.addInstance(instance);
    return {};
  }, options);
  return options;
}
function createPluginOptions() {
  const options = {
    _name: PLUGIN_NAME,
    _instances: [],
    get instances() {
      const instances = [];
      options._instances = options._instances.filter((ref) => {
        const instance = ref.deref();
        if (!instance) return false;
        instances.push(instance);
        return true;
      });
      return instances;
    },
    addInstance(instance) {
      if (options.instances.includes(instance)) return;
      options._instances.push(new WeakRef(instance));
    },
    hasNuxtPage() {
      return options._hasComponent("NuxtPage");
    },
    _hasComponent(componentName) {
      return options.instances.some(
        (v) => v.exists() && v.findComponent({ name: componentName }).exists()
      );
    }
  };
  return options;
}
