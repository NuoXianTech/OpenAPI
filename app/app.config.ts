export default defineAppConfig({
  ui: {
    // 黑白主题：primary/secondary/info 映射到 zinc 色板（提供 subtle/soft variant 用的灰色阶），
    // 实际主色由 tailwind.css 里 --ui-primary/--ui-secondary/--ui-info 直接覆盖为纯黑(light)/纯白(dark)。
    // 见 https://ui.nuxt.com/docs/getting-started/theme/css-variables 的 Colors 段官方推荐做法。
    colors: {
      primary: 'zinc',
      secondary: 'zinc',
      info: 'zinc',
      neutral: 'zinc'
    },
    table: {
      slots: {
        root: 'relative overflow-auto',
        base: 'min-w-full overflow-clip',
        caption: 'sr-only',
        thead: 'relative',
        tbody: 'isolate [&>tr]:data-[selectable=true]:hover:bg-elevated/50 [&>tr]:data-[selectable=true]:focus-visible:outline-primary divide-y divide-default',
        tfoot: 'relative',
        tr: 'data-[selected=true]:bg-elevated/50',
        th: 'px-4 py-3.5 text-sm text-highlighted text-left rtl:text-right font-semibold [&:has([role=checkbox])]:pe-0',
        td: 'p-4 text-sm text-muted whitespace-nowrap [&:has([role=checkbox])]:pe-0',
        separator: 'absolute z-1 left-0 w-full h-px bg-(--ui-border-accented)',
        empty: 'py-6 text-center text-sm text-muted',
        loading: 'py-6 text-center'
      }
    }
  }
})
