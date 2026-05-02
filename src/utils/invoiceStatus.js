export function getInvoiceLifecycleStatus(invoice, now = Date.now()) {
  if (!invoice) return 'unknown'

  if (invoice.status === 'failed') return 'failed'
  if (invoice.status === 'confirmed' || invoice.status === 'paid') return 'confirmed'
  if (invoice.status === 'pending') return 'pending'

  if (invoice.expiresAt && new Date(invoice.expiresAt).getTime() < now) {
    return 'expired'
  }

  return 'unpaid'
}

export function isInvoiceExpired(invoice, now = Date.now()) {
  return getInvoiceLifecycleStatus(invoice, now) === 'expired'
}

export function formatInvoiceStatusLabel(status) {
  switch (status) {
    case 'confirmed':
      return 'Confirmed'
    case 'pending':
      return 'Pending'
    case 'failed':
      return 'Failed'
    case 'expired':
      return 'Expired'
    case 'unpaid':
      return 'Unpaid'
    default:
      return 'Unknown'
  }
}

export function getInvoiceStatusTone(status) {
  switch (status) {
    case 'confirmed':
      return 'success'
    case 'pending':
      return 'purple'
    case 'failed':
      return 'danger'
    case 'expired':
      return 'muted'
    default:
      return 'warning'
  }
}

export function formatDeadline(deadline) {
  if (!deadline) return 'No deadline'
  return new Date(deadline).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
