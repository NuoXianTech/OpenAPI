import { EventHandler } from 'h3';
import { HTTPMethod } from 'h3-next';
import { SetupContext, RenderFunction, ComputedOptions, MethodOptions, ComponentOptionsMixin, EmitsOptions, ComponentInjectOptions, ComponentOptionsWithoutProps, ComponentOptionsWithArrayProps, ComponentPropsOptions, ComponentOptionsWithObjectProps } from 'vue';
import { mount } from '@vue/test-utils';
import { RouteLocationRaw } from 'vue-router';
import { render } from '@testing-library/vue';

type Awaitable<T> = T | Promise<T>;
type OptionalFunction<T> = T | (() => Awaitable<T>);
/**
 * `registerEndpoint` allows you create Nitro endpoint that returns mocked data. It can come in handy if you want to test a component that makes requests to API to display some data.
 * @param url - endpoint name (e.g. `/test/`).
 * @param options - factory function that returns the mocked data or an object containing the `handler`, `method`, and `once` properties.
 * - `handler`: the event handler function
 * - `method`: (optional) HTTP method to match (e.g., 'GET', 'POST')
 * - `once`: (optional) if true, the handler will only be used for the first matching request and then automatically removed
 * @example
 * ```ts
 * import { registerEndpoint } from '@nuxt/test-utils/runtime'
 *
 * registerEndpoint("/test/", () => ({
 *  test: "test-field"
 * }))
 *
 * // With once option
 * registerEndpoint("/api/user", {
 *   handler: () => ({ name: "Alice" }),
 *   once: true
 * })
 * ```
 * @see https://nuxt.com/docs/getting-started/testing#registerendpoint
 */
declare function registerEndpoint(url: string, options: EventHandler | {
    handler: EventHandler;
    method?: HTTPMethod;
    once?: boolean;
}): () => void;
/**
 * `mockNuxtImport` allows you to mock Nuxt's auto import functionality.
 * @param _target - name of an import to mock or mocked target.
 * @param _factory - factory function that returns mocked import.
 * @example
 * ```ts
 * import { mockNuxtImport } from '@nuxt/test-utils/runtime'
 *
 * mockNuxtImport('useStorage', () => {
 *  return () => {
 *    return { value: 'mocked storage' }
 *  }
 * })
 *
 * // With mocked target
 * mockNuxtImport(useStorage, () => {
 *  return () => {
 *    return { value: 'mocked storage' }
 *  }
 * })
 * ```
 * @see https://nuxt.com/docs/getting-started/testing#mocknuxtimport
 */
declare function mockNuxtImport<T = unknown>(_target: string | T, _factory: (original: T) => T | Promise<T>): void;
/**
 * `mockComponent` allows you to mock Nuxt's component.
 * @param path - component name in PascalCase, or the relative path of the component.
 * @param setup - factory function that returns the mocked component.
 * @example
 * ```ts
 * import { mockComponent } from '@nuxt/test-utils/runtime'
 *
 * mockComponent('MyComponent', {
 *  props: {
 *    value: String
 *  },
 *  setup(props) {
 *    // ...
 *  }
 * })
 *
 * // relative path or alias also works
 * mockComponent('~/components/my-component.vue', async () => {
 *  // or a factory function
 *  return {
 *    setup(props) {
 *      // ...
 *    }
 *  }
 * })
 *
 * // or you can use SFC for redirecting to a mock component
 * mockComponent('MyComponent', () => import('./MockComponent.vue'))
 * ```
 * @see https://nuxt.com/docs/getting-started/testing#mockcomponent
 */
declare function mockComponent<Props, RawBindings = object>(path: string, setup: OptionalFunction<(props: Readonly<Props>, ctx: SetupContext) => RawBindings | RenderFunction>): void;
declare function mockComponent<Props = {}, RawBindings = {}, D = {}, C extends ComputedOptions = {}, M extends MethodOptions = {}, Mixin extends ComponentOptionsMixin = ComponentOptionsMixin, Extends extends ComponentOptionsMixin = ComponentOptionsMixin, E extends EmitsOptions = {}, EE extends string = string, I extends ComponentInjectOptions = {}, II extends string = string>(path: string, options: OptionalFunction<ComponentOptionsWithoutProps<Props, RawBindings, D, C, M, Mixin, Extends, E, EE, I, II>>): void;
declare function mockComponent<PropNames extends string, RawBindings, D, C extends ComputedOptions = {}, M extends MethodOptions = {}, Mixin extends ComponentOptionsMixin = ComponentOptionsMixin, Extends extends ComponentOptionsMixin = ComponentOptionsMixin, E extends EmitsOptions = {}, EE extends string = string, I extends ComponentInjectOptions = {}, II extends string = string>(path: string, options: OptionalFunction<ComponentOptionsWithArrayProps<PropNames, RawBindings, D, C, M, Mixin, Extends, E, EE, I, II>>): void;
declare function mockComponent<PropsOptions extends Readonly<ComponentPropsOptions>, RawBindings, D, C extends ComputedOptions = {}, M extends MethodOptions = {}, Mixin extends ComponentOptionsMixin = ComponentOptionsMixin, Extends extends ComponentOptionsMixin = ComponentOptionsMixin, E extends EmitsOptions = {}, EE extends string = string, I extends ComponentInjectOptions = {}, II extends string = string>(path: string, options: OptionalFunction<ComponentOptionsWithObjectProps<PropsOptions, RawBindings, D, C, M, Mixin, Extends, E, EE, I, II>>): void;

type SetupState = Record<string, any>;
type WrapperFnComponent<Fn> = Fn extends (c: infer C, o: infer _) => infer _ ? C : never;
type WrapperFnOption<Fn> = Fn extends (c: WrapperFnComponent<Fn>, o: infer O) => infer _ ? O : never;
type WrapperFnResult<Fn> = Fn extends (c: WrapperFnComponent<Fn>, o: WrapperFnOption<Fn>) => infer R ? R : never;
type WrapperSuspendedOptions<Fn> = WrapperFnOption<Fn> & {
    route?: RouteLocationRaw | false;
    scoped?: boolean;
};
type WrapperSuspendedResult<Fn> = WrapperFnResult<Fn> & {
    setupState: SetupState;
};
declare global {
    interface Window {
        __cleanup?: Array<() => void>;
    }
}

type WrapperFn$1<C> = typeof mount<C>;
type WrapperOptions$1<C> = WrapperSuspendedOptions<WrapperFn$1<C>>;
type WrapperResult$1<C> = WrapperSuspendedResult<WrapperFn$1<C>>;
/**
 * `mountSuspended` allows you to mount any vue component within the Nuxt environment, allowing async setup and access to injections from your Nuxt plugins. For example:
 *
 * ```ts
 * // tests/components/SomeComponents.nuxt.spec.ts
 * it('can mount some component', async () => {
 * const component = await mountSuspended(SomeComponent)
 * expect(component.text()).toMatchInlineSnapshot(
 * 'This is an auto-imported component'
 * )
 * })
 *
 * // tests/App.nuxt.spec.ts
 * it('can also mount an app', async () => {
 * const component = await mountSuspended(App, { route: '/test' })
 * expect(component.html()).toMatchInlineSnapshot(`
 * "<div>This is an auto-imported component</div>
 * <div> I am a global component </div>
 * <div>/</div>
 * <a href=\\"/test\\"> Test link </a>"
 * `)
 * })
 * ```
 * @param component the component to be tested
 * @param options optional options to set up your component
 */
declare function mountSuspended<T>(component: T, options?: WrapperOptions$1<T>): Promise<WrapperResult$1<T>>;

type WrapperFn<C> = typeof render<C>;
type WrapperOptions<C> = WrapperSuspendedOptions<WrapperFn<C>>;
type WrapperResult<C> = WrapperSuspendedResult<WrapperFn<C>>;
/**
 * `renderSuspended` allows you to mount any vue component within the Nuxt environment, allowing async setup and access to injections from your Nuxt plugins.
 *
 * This is a wrapper around the `render` function from @testing-libary/vue, and should be used together with
 * utilities from that package.
 *
 * ```ts
 * // tests/components/SomeComponents.nuxt.spec.ts
 * import { renderSuspended } from '@nuxt/test-utils/runtime'
 *
 * it('can render some component', async () => {
 * const { html } = await renderSuspended(SomeComponent)
 * expect(html()).toMatchInlineSnapshot(
 * 'This is an auto-imported component'
 * )
 *
 * })
 *
 * // tests/App.nuxt.spec.ts
 * import { renderSuspended } from '@nuxt/test-utils/runtime'
 * import { screen } from '@testing-library/vue'
 *
 * it('can also mount an app', async () => {
 * const { html } = await renderSuspended(App, { route: '/test' })
 * expect(screen.getByRole('link', { name: 'Test Link' })).toBeVisible()
 * })
 * ```
 * @param component the component to be tested
 * @param options optional options to set up your component
 */
declare function renderSuspended<T>(component: T, options?: WrapperOptions<T>): Promise<WrapperResult<T>>;

export { mockComponent, mockNuxtImport, mountSuspended, registerEndpoint, renderSuspended };
