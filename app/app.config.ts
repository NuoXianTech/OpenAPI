export default defineAppConfig({
  ui: {
    colors: {
      primary: 'zinc',
      secondary: 'cyan',
      neutral: 'zinc'
    },
    card: {
      slots: {
        root: 'rounded-lg overflow-hidden shadow-none',
        header: 'p-4 sm:px-5',
        title: 'text-highlighted font-semibold',
        description: 'mt-1 text-muted text-sm',
        body: 'p-4 sm:p-5',
        footer: 'p-4 sm:px-5'
      },
      variants: {
        variant: {
          outline: {
            root: 'border border-default bg-elevated divide-y divide-default ring-0 shadow-[0_1px_2px_color-mix(in_oklab,var(--ui-text)_4%,transparent)]'
          },
          soft: {
            root: 'border border-default bg-elevated divide-y divide-default ring-0'
          },
          subtle: {
            root: 'border border-default bg-elevated divide-y divide-default ring-0'
          }
        }
      },
      defaultVariants: {
        variant: 'outline'
      }
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
