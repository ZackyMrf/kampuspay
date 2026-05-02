/**
 * invoiceStorage.js
 * LocalStorage utilities for invoice CRUD operations.
 * Each invoice is stored with a unique ID as a JSON object.
 */

const STORAGE_KEY = 'kampuspay_invoices'

function saveInvoices(invoices) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices))
}

/** Load all invoices from localStorage */
export function getAllInvoices() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/** Save a new invoice. Returns the saved invoice object. */
export function saveInvoice(invoice) {
  const invoices = getAllInvoices()
  invoices.unshift(invoice) // newest first
  saveInvoices(invoices)
  return invoice
}

/** Get a single invoice by ID */
export function getInvoiceById(id) {
  const invoices = getAllInvoices()
  return invoices.find((inv) => inv.id === id) || null
}

/** Update an existing invoice by ID (partial update) */
export function updateInvoice(id, updates) {
  const invoices = getAllInvoices()
  const idx = invoices.findIndex((inv) => inv.id === id)
  if (idx === -1) return null
  invoices[idx] = { ...invoices[idx], ...updates }
  saveInvoices(invoices)
  return invoices[idx]
}

/** Replace an existing invoice by ID with a fully prepared object */
export function replaceInvoice(id, nextInvoice) {
  const invoices = getAllInvoices()
  const idx = invoices.findIndex((inv) => inv.id === id)
  if (idx === -1) return null
  invoices[idx] = nextInvoice
  saveInvoices(invoices)
  return nextInvoice
}

/** Generate a unique invoice ID */
export function generateInvoiceId() {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `KP-${timestamp}-${random}`
}

/** Get invoice stats summary */
export function getInvoiceStats() {
  const invoices = getAllInvoices()
  const total = invoices.length
  const paid = invoices.filter((i) => i.status === 'paid' || i.status === 'confirmed').length
  const unpaid = invoices.filter(
    (i) => !['paid', 'confirmed', 'expired', 'failed'].includes(i.status)
  ).length
  const expired = invoices.filter((i) => i.status === 'expired').length
  const totalSOL = invoices
    .filter((i) => i.status === 'paid' || i.status === 'confirmed')
    .reduce((sum, i) => sum + Number(i.amount), 0)
  return { total, paid, unpaid, expired, totalSOL }
}

export function exportInvoicesAsJson() {
  return JSON.stringify(getAllInvoices(), null, 2)
}

function escapeCsv(value) {
  const text = String(value ?? '')
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replaceAll('"', '""')}"`
  }
  return text
}

export function exportInvoicesAsCsv() {
  const invoices = getAllInvoices()
  const headers = [
    'id',
    'title',
    'description',
    'amount',
    'category',
    'receiver',
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
