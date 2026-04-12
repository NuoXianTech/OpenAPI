import { mount } from '@vue/test-utils';
import { reactive, h as h$1, Suspense, nextTick, getCurrentInstance, onErrorCaptured, effectScope } from 'vue';
import { defu } from 'defu';
import { defineComponent, useRouter, h, tryUseNuxtApp } from '#imports';
import NuxtRoot from '#build/root-component.mjs';

function getEndpointRegistry() {
  const app = window.__app ?? {};
  return app._registeredEndpointRegistry ||= {};
}
function findEndpointRegistryHandlers(url) {
  const endpointRegistry = getEndpointRegistry();
  const pathname = url.replace(/[?#].*$/, "");
  for (const [key, handlers] of Object.entries(endpointRegistry)) {
    if (key === url || key === pathname) {
      if (handlers?.length) {
        return handlers;
      }
    }
  }
}
function registerEndpoint(url, options) {
  const app = window.__app;
  if (!app) {
    throw new Error("registerEndpoint() can only be used in a `@nuxt/test-utils` runtime environment");
  }
  const config = typeof options === "function" ? { url, handler: options, method: void 0, once: false } : { ...options, url };
  config.handler = Object.assign(config.handler, { __is_handler__: true });
  const endpointRegistry = getEndpointRegistry();
  endpointRegistry[url] ||= [];
  endpointRegistry[url].push(config);
  window.__registry.add(url);
  app._registered ||= registerGlobalHandler(app);
  return () => {
    endpointRegistry[url]?.splice(endpointRegistry[url].indexOf(config), 1);
    if (endpointRegistry[url]?.length === 0) {
      window.__registry.delete(url);
    }
  };
}
function mockNuxtImport(_target, _factory) {
  throw new Error(
    "mockNuxtImport() is a macro and it did not get transpiled. This may be an internal bug of @nuxt/test-utils."
  );
}
function mockComponent(_path, _component) {
  throw new Error(
    "mockComponent() is a macro and it did not get transpiled. This may be an internal bug of @nuxt/test-utils."
  );
}
const handler = Object.assign(async (event) => {
  const url = "url" in event && event.url ? (event.url.pathname + event.url.search).replace(/^\/_/, "") : event.path.replace(/^\/_/, "");
  const registeredHandlers = findEndpointRegistryHandlers(url);
  const latestHandler = [...registeredHandlers || []].reverse().find((config) => config.method ? event.method === config.method : true);
  if (!latestHandler) return;
  const result = await latestHandler.handler(event);
  if (!latestHandler.once) return result;
  const index = registeredHandlers?.indexOf(latestHandler);
  if (index === void 0 || index === -1) return result;
  registeredHandlers?.splice(index, 1);
  if (registeredHandlers?.length === 0) {
    window.__registry.delete(latestHandler.url);
  }
  return result;
}, { __is_handler__: true });
function registerGlobalHandler(app) {
  app.use(handler, {
    match: (...args) => {
      const [eventOrPath, _event = eventOrPath] = args;
      const url = typeof eventOrPath === "string" ? eventOrPath.replace(/^\/_/, "") : (eventOrPath.url.pathname + eventOrPath.url.search).replace(/^\/_/, "");
      const event = _event;
      const registeredHandlers = findEndpointRegistryHandlers(url);
      return registeredHandlers?.some((config) => config.method ? event?.method === config.method : true) ?? false;
    }
  });
  return true;
}

const RouterLink = defineComponent({
  functional: true,
  props: {
    to: {
      type: [String, Object],
      required: true
    },
    custom: Boolean,
    replace: Boolean,
    // Not implemented
    activeClass: String,
    exactActiveClass: String,
    ariaCurrentValue: String
  },
  setup: (props, { slots }) => {
    const navigate = () => {
    };
    return () => {
      const route = useRouter().resolve(props.to);
      return props.custom ? slots.default?.({ href: route.href, navigate, route }) : h(
        "a",
        {
          href: route.href,
          onClick: (e) => {
            e.preventDefault();
            return navigate();
          }
        },
        slots
      );
    };
  }
});

function cleanupAll() {
  for (const fn of (window.__cleanup || []).splice(0)) {
    fn();
  }
}
function addCleanup(fn) {
  window.__cleanup ||= [];
  window.__cleanup.push(fn);
}
function runEffectScope(fn) {
  const scope = effectScope();
  addCleanup(() => scope.stop());
  return scope.run(fn);
}
function wrapperSuspended(component, options, {
  wrapperFn,
  wrappedRender = (fn) => fn,
  suspendedHelperName,
  clonedComponentName
}) {
  const { props = {}, attrs = {} } = options;
  const { route = "/", scoped = false, ...wrapperFnOptions } = options;
  const vueApp = tryUseNuxtApp()?.vueApp || globalThis.__unctx__.get("nuxt-app").tryUse().vueApp;
  const {
    render: componentRender,
    setup: componentSetup,
    ...componentRest
  } = component;
  let wrappedInstance = null;
  let setupContext;
  let setupState;
  const setProps = reactive({});
  function patchInstanceAppContext() {
    const app = getCurrentInstance()?.appContext.app;
    if (!app) return;
    for (const [key, value] of Object.entries(vueApp)) {
      if (key in app) continue;
      app[key] = value;
    }
  }
  const ClonedComponent = {
    components: {},
    ...component,
    name: clonedComponentName,
    async setup(props2, instanceContext) {
      const currentInstance = getCurrentInstance();
      if (currentInstance) {
        currentInstance.emit = (event, ...args) => {
          setupContext.emit(event, ...args);
        };
      }
      if (!componentSetup) return;
      const result = scoped ? await runEffectScope(() => componentSetup(props2, setupContext)) : await componentSetup(props2, setupContext);
      if (wrappedInstance?.exposed) {
        instanceContext.expose(wrappedInstance.exposed);
      }
      setupState = result && typeof result === "object" ? result : {};
      return result;
    }
  };
  const SuspendedHelper = {
    name: suspendedHelperName,
    render: () => "",
    async setup() {
      if (route) {
        const router = useRouter();
        await router.replace(route);
      }
      return () => h$1(ClonedComponent, { ...props, ...setProps, ...attrs }, setupContext.slots);
    }
  };
  return new Promise((resolve, reject) => {
    let isMountSettled = false;
    const wrapper = wrapperFn(
      {
        inheritAttrs: false,
        __cssModules: componentRest.__cssModules,
        setup: (props2, ctx) => {
          patchInstanceAppContext();
          wrappedInstance = getCurrentInstance();
          setupContext = ctx;
          const nuxtRootSetupResult = runEffectScope(
            () => NuxtRoot.setup(props2, {
              ...ctx,
              expose: () => {
              }
            })
          );
          onErrorCaptured((error, ...args) => {
            if (isMountSettled) return;
            isMountSettled = true;
            try {
              wrappedInstance?.appContext.config.errorHandler?.(error, ...args);
              reject(error);
            } catch (error2) {
              reject(error2);
            }
            return false;
          });
          return nuxtRootSetupResult;
        },
        render: wrappedRender(() => h$1(
          Suspense,
          {
            onResolve: () => nextTick().then(() => {
              if (isMountSettled) return;
              isMountSettled = true;
              wrapper.setupState = setupState;
              resolve({
                wrapper,
                setProps: (props2) => {
                  Object.assign(setProps, props2);
                }
              });
            })
          },
          {
            default: () => h$1(SuspendedHelper)
          }
        ))
      },
      defu(wrapperFnOptions, {
        global: {
          config: {
            globalProperties: makeAllPropertiesEnumerable(
              vueApp.config.globalProperties
            )
          },
          directives: vueApp._context.directives,
          provide: vueApp._context.provides,
          stubs: {
            Suspense: false,
            [SuspendedHelper.name]: false,
            [ClonedComponent.name]: false
          },
          components: { ...vueApp._context.components, RouterLink }
        }
      })
    );
  });
}
function makeAllPropertiesEnumerable(target) {
  return {
    ...target,
    ...Object.fromEntries(
      Object.getOwnPropertyNames(target).map((key) => [key, target[key]])
    )
  };
}

async function mountSuspended(component, options = {}) {
  const suspendedHelperName = "MountSuspendedHelper";
  const clonedComponentName = "MountSuspendedComponent";
  cleanupAll();
  const { wrapper, setProps } = await wrapperSuspended(component, options, {
    wrapperFn: mount,
    suspendedHelperName,
    clonedComponentName
  });
  Object.assign(wrapper, { __setProps: setProps });
  const clonedComponent = wrapper.findComponent({ name: clonedComponentName });
  return wrappedMountedWrapper(wrapper, clonedComponent);
}
function wrappedMountedWrapper(wrapper, component) {
  const wrapperProps = [
    "setProps",
    "emitted",
    "setupState",
    "unmount"
  ];
  return new Proxy(wrapper, {
    get: (_, prop, receiver) => {
      if (prop === "getCurrentComponent") return getCurrentComponentPatchedProxy;
      const target = wrapperProps.includes(prop) ? wrapper : Reflect.has(component, prop) ? component : wrapper;
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    }
  });
  function getCurrentComponentPatchedProxy() {
    const currentComponent = component.getCurrentComponent();
    return new Proxy(currentComponent, {
      get: (target, prop, receiver) => {
        const value = Reflect.get(target, prop, receiver);
        if (prop === "proxy" && value) {
          return new Proxy(value, {
            get(o, p, r) {
              if (!Reflect.has(currentComponent.props, p)) {
                const setupState = wrapper.setupState;
                if (setupState && typeof setupState === "object") {
                  if (Reflect.has(setupState, p)) {
                    return Reflect.get(setupState, p, r);
                  }
                }
              }
              return Reflect.get(o, p, r);
            }
          });
        }
        return value;
      }
    });
  }
}

async function renderSuspended(component, options = {}) {
  const wrapperId = "test-wrapper";
  const suspendedHelperName = "RenderHelper";
  const clonedComponentName = "RenderSuspendedComponent";
  const { render: wrapperFn } = await import('@testing-library/vue');
  cleanupAll();
  document.getElementById(wrapperId)?.remove();
  const { wrapper, setProps } = await wrapperSuspended(component, options, {
    wrapperFn,
    wrappedRender: (render) => () => h$1({
      inheritAttrs: false,
      render: () => h$1("div", { id: wrapperId }, render())
    }),
    suspendedHelperName,
    clonedComponentName
  });
  wrapper.rerender = async (props) => {
    setProps(props);
    await nextTick();
  };
  return wrapper;
}

export { mockComponent, mockNuxtImport, mountSuspended, registerEndpoint, renderSuspended };
