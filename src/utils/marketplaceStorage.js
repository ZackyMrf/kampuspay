import { assertSupabaseConfigured, supabase } from './supabaseClient'
import { generateInvoiceId, saveInvoice } from './invoiceStorage'

export const MARKETPLACE_CATEGORIES = [
  'Food',
  'Drink',
  'Campus Event',
  'Merchandise',
  'Service',
  'Donation',
  'Other',
]

const PRODUCT_IMAGES_BUCKET = 'product-images'

export function getMarketplaceCategoryLabel(value) {
  return MARKETPLACE_CATEGORIES.includes(value) ? value : 'Other'
}

function getFileExtension(file) {
  const fromName = file.name?.split('.').pop()?.toLowerCase()
  if (fromName && fromName !== file.name) return fromName
  return file.type?.split('/').pop() || 'jpg'
}

function toSeller(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
    storeName: row.store_name,
    storeDescription: row.store_description || '',
    storeCategory: row.store_category || 'Other',
    walletAddress: row.wallet_address || '',
    createdAt: row.created_at,
  }
}

function toProduct(row) {
  if (!row) return null
  return {
    id: row.id,
    sellerId: row.seller_id,
    seller: toSeller(row.sellers),
    name: row.name,
    description: row.description || '',
    priceSol: Number(row.price_sol),
    category: row.category || 'Other',
    imageUrl: row.image_url || '',
    stock: Number(row.stock || 0),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
  }
}

function toOrder(row) {
  if (!row) return null
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    productId: row.product_id,
    sellerId: row.seller_id,
    buyerUserId: row.buyer_user_id,
    buyerWallet: row.buyer_wallet || '',
    quantity: Number(row.quantity || 1),
    totalAmount: Number(row.total_amount || 0),
    status: row.status,
    createdAt: row.created_at,
    paidAt: row.paid_at,
    product: row.products ? toProduct(row.products) : null,
    invoice: row.invoices || null,
  }
}

export async function getSellerByUserId(userId) {
  assertSupabaseConfigured()
  const { data, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return toSeller(data)
}

export async function updateSellerProfile(sellerId, updates) {
  assertSupabaseConfigured()
  const row = {}
  if ('storeName' in updates) row.store_name = updates.storeName
  if ('storeDescription' in updates) row.store_description = updates.storeDescription
  if ('storeCategory' in updates) row.store_category = updates.storeCategory
  if ('walletAddress' in updates) row.wallet_address = updates.walletAddress

  const { data, error } = await supabase
    .from('sellers')
    .update(row)
    .eq('id', sellerId)
    .select('*')
    .single()

  if (error) throw error
  return toSeller(data)
}

export async function getActiveProducts() {
  assertSupabaseConfigured()
  const { data, error } = await supabase
    .from('products')
    .select('*, sellers(*)')
    .eq('is_active', true)
    .gt('stock', 0)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(toProduct)
}

export async function getProductById(id) {
  assertSupabaseConfigured()
  const { data, error } = await supabase
    .from('products')
    .select('*, sellers(*)')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return toProduct(data)
}

export async function getSellerProducts(sellerId) {
  assertSupabaseConfigured()
  const { data, error } = await supabase
    .from('products')
    .select('*, sellers(*)')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(toProduct)
}

export async function createProduct(product) {
  assertSupabaseConfigured()
  const { data, error } = await supabase
    .from('products')
    .insert({
      seller_id: product.sellerId,
      name: product.name,
      description: product.description || '',
      price_sol: product.priceSol,
      category: product.category || 'Other',
      image_url: product.imageUrl || '',
      stock: product.stock || 0,
      is_active: Boolean(product.isActive),
    })
    .select('*, sellers(*)')
    .single()

  if (error) throw error
  return toProduct(data)
}

export async function uploadProductImage(file, sellerId) {
  assertSupabaseConfigured()
  if (!file) return ''

  const extension = getFileExtension(file).replace(/[^a-z0-9]/g, '') || 'jpg'
  const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const path = `${sellerId}/${uniqueId}.${extension}`

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      contentType: file.type || 'image/jpeg',
      upsert: false,
    })

  if (error) throw error

  const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function updateProduct(productId, updates) {
  assertSupabaseConfigured()
  const row = {}
  if ('name' in updates) row.name = updates.name
  if ('description' in updates) row.description = updates.description
  if ('priceSol' in updates) row.price_sol = updates.priceSol
  if ('category' in updates) row.category = updates.category
  if ('imageUrl' in updates) row.image_url = updates.imageUrl
  if ('stock' in updates) row.stock = updates.stock
  if ('isActive' in updates) row.is_active = updates.isActive

  const { data, error } = await supabase
    .from('products')
    .update(row)
    .eq('id', productId)
    .select('*, sellers(*)')
    .single()

  if (error) throw error
  return toProduct(data)
}

export async function deleteProduct(productId) {
  assertSupabaseConfigured()
  const { error } = await supabase.from('products').delete().eq('id', productId)
  if (error) throw error
}

export async function createProductCheckout({ product, buyerUserId, buyerWallet, quantity }) {
  assertSupabaseConfigured()
  const totalAmount = Number((product.priceSol * quantity).toFixed(9))
  const invoiceId = generateInvoiceId()
  const now = new Date().toISOString()

  const invoice = await saveInvoice({
    id: invoiceId,
    title: product.name,
    description: `${quantity} x ${product.name} from ${product.seller?.storeName || 'Campus seller'}`,
    amount: totalAmount,
    category: product.category,
    receiver: product.seller?.walletAddress || '',
    creator: product.sellerId,
    buyerWallet,
    sellerId: product.sellerId,
    productId: product.id,
    status: 'unpaid',
    createdAt: now,
    expiresAt: null,
    txSignature: null,
    paidAt: null,
    paidBy: null,
    payerName: '',
    payerId: '',
    notes: 'Marketplace checkout',
  })

  const { data, error } = await supabase
    .from('orders')
    .insert({
      invoice_id: invoice.id,
      product_id: product.id,
      seller_id: product.sellerId,
      buyer_user_id: buyerUserId,
      buyer_wallet: buyerWallet,
      quantity,
      total_amount: totalAmount,
      status: 'pending',
    })
    .select('*, products(*), invoices(*)')
    .single()

  if (error) throw error
  return { invoice, order: toOrder(data) }
}

export async function getSellerOrders(sellerId) {
  assertSupabaseConfigured()
  const { data, error } = await supabase
    .from('orders')
    .select('*, products(*), invoices(*)')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(toOrder)
}

export async function getStudentOrders(userId) {
  assertSupabaseConfigured()
  const { data, error } = await supabase
    .from('orders')
    .select('*, products(*), invoices(*)')
    .eq('buyer_user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(toOrder)
}

export async function markOrderPaidByInvoice(invoiceId, paidAt) {
  assertSupabaseConfigured()
  const { data, error } = await supabase
    .from('orders')
    .update({ status: 'paid', paid_at: paidAt })
    .eq('invoice_id', invoiceId)
    .select('*, products(*), invoices(*)')
    .maybeSingle()

  if (error) throw error
  return toOrder(data)
}

function escapeCsv(value) {
  const text = String(value ?? '')
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replaceAll('"', '""')}"`
  }
  return text
}

export function exportOrdersAsJson(orders) {
  return JSON.stringify(orders, null, 2)
}

export function exportOrdersAsCsv(orders) {
  const headers = ['id', 'invoiceId', 'product', 'buyerWallet', 'quantity', 'totalAmount', 'status', 'createdAt', 'paidAt']
  const rows = orders.map((order) => [
    order.id,
    order.invoiceId,
    order.product?.name || '',
    order.buyerWallet,
    order.quantity,
    order.totalAmount,
    order.status,
    order.createdAt,
    order.paidAt,
  ].map(escapeCsv).join(','))

  return [headers.join(','), ...rows].join('\n')
}
