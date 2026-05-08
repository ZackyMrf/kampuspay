export const DEMO_IDR_PER_SOL = 1000000

export const PAYMENT_METHODS = [
  {
    id: 'solana',
    title: 'Solana Devnet Wallet',
    shortLabel: 'Solana',
    description: 'Pay with your Solana wallet on Devnet. Transaction will be verifiable on Solana Explorer.',
  },
  {
    id: 'qris',
    title: 'QRIS Simulation',
    shortLabel: 'QRIS',
    description: 'Scan QRIS demo code and confirm your payment. For MVP/demo only.',
  },
  {
    id: 'cash_on_pickup',
    title: 'Cash on Pickup',
    shortLabel: 'Cash',
    description: 'Reserve your order and pay directly to the seller when picking up the item.',
  },
  {
    id: 'bank_transfer',
    title: 'Bank Transfer Simulation',
    shortLabel: 'Bank',
    description: 'Use demo bank transfer instructions and confirm manually.',
  },
]

export const REVIEW_PAYMENT_METHODS = new Set(['qris', 'bank_transfer'])
export const PAID_ORDER_STATUSES = new Set(['paid', 'paid_demo'])
export const CANCELLABLE_ORDER_STATUSES = new Set(['pending', 'payment_review', 'cash_pending', 'unpaid'])
export const PICKUP_READY_STATUSES = new Set(['paid', 'paid_demo', 'cash_pending'])

export function calculateDemoFiatAmount(amountSol) {
  return Math.round(Number(amountSol || 0) * DEMO_IDR_PER_SOL)
}

export function formatIdr(amount) {
  const value = Number(amount || 0)
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

export function getPaymentMethodMeta(method) {
  return PAYMENT_METHODS.find((item) => item.id === method) || PAYMENT_METHODS[0]
}

export function formatPaymentMethod(method) {
  return getPaymentMethodMeta(method).shortLabel
}

export function formatPaymentStatus(status, method = 'solana') {
  if (status === 'paid' && method === 'solana') return 'Solana Paid'
  if (status === 'payment_review' && method === 'qris') return 'QRIS Review'
  if (status === 'payment_review' && method === 'bank_transfer') return 'Bank Review'
  if (status === 'paid_demo' && method === 'qris') return 'QRIS Confirmed'
  if (status === 'paid_demo' && method === 'bank_transfer') return 'Bank Confirmed'
  if (status === 'paid_demo') return 'Paid Demo'
  if (status === 'cash_pending') return 'Cash Pending'
  if (status === 'cancelled') return 'Cancelled'
  if (status === 'pending') return 'Pending'
  if (status === 'paid') return 'Paid'
  return 'Unpaid'
}

export function getPaymentStatusTone(status) {
  switch (status) {
    case 'paid':
    case 'paid_demo':
      return 'success'
    case 'payment_review':
      return 'purple'
    case 'cash_pending':
      return 'cyan'
    case 'cancelled':
    case 'failed':
      return 'danger'
    case 'expired':
      return 'muted'
    default:
      return 'warning'
  }
}

export function buildQrisDemoContent({ invoiceId, fiatAmount, merchant }) {
  const safeMerchant = String(merchant || 'KampusPay Demo').replaceAll('|', ' ')
  return `KAMPUSPAY-QRIS-DEMO|invoiceId=${invoiceId}|amount=IDR${Number(fiatAmount || 0)}|merchant=${safeMerchant}`
}
