interface AdminModalUiOptions {
  content?: string
  body?: string
  footer?: string
}

interface AdminModalUi {
  overlay: string
  content: string
  header: string
  body: string
  footer: string
  title: string
  description: string
  close: string
}

const baseAdminModalUi: AdminModalUi = {
  overlay: 'admin-modal-overlay',
  content: 'admin-modal-content divide-y-0',
  header: 'admin-modal-header',
  body: 'admin-modal-body',
  footer: 'admin-modal-footer',
  title: 'admin-modal-title',
  description: 'admin-modal-description',
  close: 'admin-modal-close'
}

export function adminModalUi(options: AdminModalUiOptions = {}): AdminModalUi {
  return {
    ...baseAdminModalUi,
    content: joinUiClasses(baseAdminModalUi.content, options.content),
    body: joinUiClasses(baseAdminModalUi.body, options.body),
    footer: joinUiClasses(baseAdminModalUi.footer, options.footer)
  }
}

function joinUiClasses(...classes: Array<string | undefined>): string {
  return classes.filter(Boolean).join(' ')
}
