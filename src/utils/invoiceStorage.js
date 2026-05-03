import { assertSupabaseConfigured, supabase } from './supabaseClient'

function toInvoice(row) {
  if (!row) return null

  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    amount: Number(row.amount),
    category: row.category,
    receiver: row.receiver,
    creator: row.creator || '',
    buyerWallet: row.buyer_wallet || row.paid_by || '',
    sellerId: row.seller_id,
    productId: row.product_id,
    status: row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    txSignature: row.transaction_signature || row.tx_signature,
    paidAt: row.paid_at,
    paidBy: row.paid_by || row.buyer_wallet,
    payerName: row.payer_name || '',
    payerId: row.payer_id || '',
    notes: row.notes || '',
    txError: row.tx_error,
  }
}

function toInvoiceRow(invoice) {
  return {
    id: invoice.id,
    title: invoice.title,
    description: invoice.description || '',
    amount: invoice.amount,
    category: invoice.category,
    receiver: invoice.receiver,
    creator: invoice.creator || null,
    buyer_wallet: invoice.buyerWallet || invoice.paidBy || null,
    seller_id: invoice.sellerId || null,
    product_id: invoice.productId || null,
    status: invoice.status,
    created_at: invoice.createdAt,
    expires_at: invoice.expiresAt || null,
    transaction_signature: invoice.txSignature || null,
    paid_at: invoice.paidAt || null,
    paid_by: invoice.paidBy || null,
    payer_name: invoice.payerName || '',
    payer_id: invoice.payerId || '',
    notes: invoice.notes || '',
    tx_error: invoice.txError || null,
  }
}

export async function getAllInvoices() {
  assertSupabaseConfigured()

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(toInvoice)
}

export async function saveInvoice(invoice) {
  assertSupabaseConfigured()

  const { data, error } = await supabase
    .from('invoices')
    .insert(toInvoiceRow(invoice))
    .select()
    .single()

  if (error) throw error
  return toInvoice(data)
}

export async function getInvoiceById(id) {
  assertSupabaseConfigured()

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return toInvoice(data)
}

export async function replaceInvoice(id, nextInvoice) {
  assertSupabaseConfigured()

  const { data, error } = await supabase
    .from('invoices')
    .update(toInvoiceRow(nextInvoice))
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return toInvoice(data)
}

export function generateInvoiceId() {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `KP-${timestamp}-${random}`
}

function escapeCsv(value) {
  const text = String(value ?? '')
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replaceAll('"', '""')}"`
  }
  return text
}

export async function exportInvoicesAsJson() {
  return JSON.stringify(await getAllInvoices(), null, 2)
}

export async function exportInvoicesAsCsv() {
  const invoices = await getAllInvoices()
  const headers = [
    'id',
    'title',
    'description',
    'amount',
    'category',
    'receiver',
    'creator',
    'buyerWallet',
    'sellerId',
    'productId',
    'status',
    'createdAt',
    'expiresAt',
    'txSignature',
    'paidAt',
    'paidBy',
    'payerName',
    'payerId',
    'notes',
  ]

  const rows = invoices.map((invoice) =>
    headers.map((header) => escapeCsv(invoice[header])).join(',')
  )

  return [headers.join(','), ...rows].join('\n')
}
