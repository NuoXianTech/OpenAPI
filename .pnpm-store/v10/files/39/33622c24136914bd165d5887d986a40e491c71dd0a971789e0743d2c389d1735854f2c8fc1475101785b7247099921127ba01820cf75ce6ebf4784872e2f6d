import { getVueWrapperPlugin } from "./vue-wrapper-plugin.mjs";
export async function setupNuxt() {
  const { useRouter } = await import("#app/composables/router");
  await import("#app/nuxt-vitest-app-entry").then((r) => r.default());
  const nuxtApp = useNuxtApp();
  function sync() {
    return nuxtApp._route.sync ? nuxtApp._route.sync() : nuxtApp.callHook("page:finish");
  }
  const { hasNuxtPage } = getVueWrapperPlugin();
  useRouter().afterEach(() => {
    if (hasNuxtPage()) return;
    return sync();
  });
  return sync();
}
