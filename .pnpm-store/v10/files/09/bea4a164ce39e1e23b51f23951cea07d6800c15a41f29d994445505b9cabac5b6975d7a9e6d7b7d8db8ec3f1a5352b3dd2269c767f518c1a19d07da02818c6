import * as vue0 from "vue";
import { CSSProperties, Component, Plugin, Ref } from "vue";

//#region src/packages/types.d.ts
type ToastTypes = 'normal' | 'action' | 'success' | 'info' | 'warning' | 'error' | 'loading' | 'default';
type PromiseT<Data = any> = Promise<Data> | (() => Promise<Data>);
interface PromiseIExtendedResult extends ExternalToast {
  message: string | Component;
}
type PromiseTExtendedResult<Data = any> = PromiseIExtendedResult | ((data: Data) => PromiseIExtendedResult | Promise<PromiseIExtendedResult>);
type PromiseTResult<Data = any> = string | Component | ((data: Data) => Component | string | Promise<Component | string>);
type PromiseExternalToast = Omit<ExternalToast, 'description'>;
type PromiseData<ToastData = any> = PromiseExternalToast & {
  loading?: string | Component;
  success?: PromiseTResult<ToastData> | PromiseTExtendedResult<ToastData>;
  error?: PromiseTResult | PromiseTExtendedResult;
  description?: PromiseTResult;
  finally?: () => void | Promise<void>;
};
interface ToastClasses {
  toast?: string;
  title?: string;
  description?: string;
  loader?: string;
  closeButton?: string;
  cancelButton?: string;
  actionButton?: string;
  success?: string;
  error?: string;
  info?: string;
  warning?: string;
  loading?: string;
  default?: string;
  content?: string;
  icon?: string;
}
interface ToastIcons {
  success?: Component;
  info?: Component;
  warning?: Component;
  error?: Component;
  loading?: Component;
  close?: Component;
}
interface Action {
  label: Component | string;
  onClick: (event: MouseEvent) => void;
  actionButtonStyle?: CSSProperties;
}
interface ToastT<T extends Component = Component> {
  id: number | string;
  toasterId?: string;
  title?: (() => string | Component) | string | Component;
  type?: ToastTypes;
  icon?: Component;
  component?: T;
  componentProps?: any;
  richColors?: boolean;
  invert?: boolean;
  closeButton?: boolean;
  dismissible?: boolean;
  description?: (() => string | Component) | string | Component;
  duration?: number;
  delete?: boolean;
  important?: boolean;
  action?: Action | Component;
  cancel?: Action | Component;
  onDismiss?: (toast: ToastT) => void;
  onAutoClose?: (toast: ToastT) => void;
  promise?: PromiseT;
  cancelButtonStyle?: CSSProperties;
  actionButtonStyle?: CSSProperties;
  style?: CSSProperties;
  unstyled?: boolean;
  class?: string;
  classes?: ToastClasses;
  descriptionClass?: string;
  position?: Position;
  closeButtonPosition?: CloseButtonPosition;
  testId?: string;
}
type Position = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
type CloseButtonPosition = Exclude<Position, 'top-center' | 'bottom-center'>;
interface ToastOptions {
  class?: string;
  closeButton?: boolean;
  descriptionClass?: string;
  style?: CSSProperties;
  cancelButtonStyle?: CSSProperties;
  actionButtonStyle?: CSSProperties;
  duration?: number;
  unstyled?: boolean;
  classes?: ToastClasses;
  closeButtonAriaLabel?: string;
  toasterId?: string;
  closeButtonPosition?: CloseButtonPosition;
}
type Offset = {
  top?: string | number;
  right?: string | number;
  bottom?: string | number;
  left?: string | number;
} | string | number;
interface ToasterProps {
  id?: string;
  invert?: boolean;
  theme?: Theme;
  position?: Position;
  closeButtonPosition?: CloseButtonPosition;
  hotkey?: string[];
  richColors?: boolean;
  expand?: boolean;
  duration?: number;
  gap?: number;
  visibleToasts?: number;
  closeButton?: boolean;
  toastOptions?: ToastOptions;
  class?: string;
  style?: CSSProperties;
  offset?: Offset;
  mobileOffset?: Offset;
  dir?: 'rtl' | 'ltr' | 'auto';
  swipeDirections?: SwipeDirection[];
  icons?: ToastIcons;
  containerAriaLabel?: string;
}
type SwipeDirection = 'top' | 'right' | 'bottom' | 'left';
type Theme = 'light' | 'dark' | 'system';
interface ToastToDismiss {
  id: number | string;
  dismiss: boolean;
}
type ExternalToast<T extends Component = Component> = Omit<ToastT<T>, 'id' | 'type' | 'title' | 'promise' | 'delete'> & {
  id?: number | string;
  toasterId?: string;
};
//#endregion
//#region src/packages/Toaster.vue.d.ts
declare const _default: __VLS_WithSlots<vue0.DefineComponent<ToasterProps, {}, {}, {}, {}, vue0.ComponentOptionsMixin, vue0.ComponentOptionsMixin, {}, string, vue0.PublicProps, Readonly<ToasterProps> & Readonly<{}>, {
  richColors: boolean;
  invert: boolean;
  closeButton: boolean;
  class: string;
  position: Position;
  closeButtonPosition: CloseButtonPosition;
  theme: Theme;
  hotkey: string[];
  expand: boolean;
  gap: number;
  visibleToasts: number;
  toastOptions: ToastOptions;
  offset: string | number | {
    top?: string | number;
    right?: string | number;
    bottom?: string | number;
    left?: string | number;
  };
  mobileOffset: string | number | {
    top?: string | number;
    right?: string | number;
    bottom?: string | number;
    left?: string | number;
  };
  dir: "rtl" | "ltr" | "auto";
  containerAriaLabel: string;
}, {}, {}, {}, string, vue0.ComponentProvideOptions, false, {}, any>, {
  'close-icon'?: (props: {}) => any;
} & {
  'loading-icon'?: (props: {}) => any;
} & {
  'success-icon'?: (props: {}) => any;
} & {
  'error-icon'?: (props: {}) => any;
} & {
  'warning-icon'?: (props: {}) => any;
} & {
  'info-icon'?: (props: {}) => any;
}>;
type __VLS_WithSlots<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//#endregion
//#region src/packages/state.d.ts
type titleT = (() => string | Component) | string | Component;
declare function toastFunction(message: titleT, data?: ExternalToast): string | number;
declare const toast: typeof toastFunction & {
  success: (message: titleT, data?: ExternalToast) => string | number;
  info: (message: titleT, data?: ExternalToast) => string | number;
  warning: (message: titleT, data?: ExternalToast) => string | number;
  error: (message: titleT, data?: ExternalToast) => string | number;
  custom: (component: Component, data?: ExternalToast) => string | number;
  message: (message: titleT, data?: ExternalToast) => string | number;
  promise: <ToastData>(promise: PromiseT<ToastData>, data?: PromiseData<ToastData> | undefined) => (string & {
    unwrap: () => Promise<ToastData>;
  }) | (number & {
    unwrap: () => Promise<ToastData>;
  }) | {
    unwrap: () => Promise<ToastData>;
  } | undefined;
  dismiss: (id?: number | string) => string | number | undefined;
  loading: (message: titleT, data?: ExternalToast) => string | number;
} & {
  getHistory: () => (ToastT<Component> | ToastToDismiss)[];
  getToasts: () => (ToastT<Component> | ToastToDismiss)[];
};
//#endregion
//#region src/packages/hooks.d.ts
declare function useVueSonner(): {
  activeToasts: Ref<ToastT[]>;
};
//#endregion
//#region src/packages/index.d.ts
declare const plugin: Plugin;
//#endregion
export { type Action, type ExternalToast, type PromiseIExtendedResult, type ToastClasses, type ToastT, type ToastToDismiss, _default as Toaster, type ToasterProps, plugin as default, toast, useVueSonner };