import { assertSupabaseConfigured, supabase } from './supabaseClient'
import { generateInvoiceId, getInvoiceById, saveInvoice } from './invoiceStorage'
import { generatePickupCode } from './pickupCode'
import { buildSellerTrust } from './sellerBadge'
import { CANCELLABLE_ORDER_STATUSES, PAID_ORDER_STATUSES } from './paymentMethods'

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
const PAYMENT_PROOFS_BUCKET = 'payment-proofs'

export function getMarketplaceCategoryLabel(value) {
  return MARKETPLACE_CATEGORIES.includes(value) ? value : 'Other'
}

function getFileExtension(file) {
  const fromName = file.name?.split('.').pop()?.toLowerCase()
  if (fromName && fromName !== file.name) return fromName
  return file.type?.split('/').pop() || 'jpg'
}

function toSeller(row, trust = buildSellerTrust()) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
    storeName: row.store_name,
    storeDescription: row.store_description || '',
    storeCategory: row.store_category || 'Other',
    walletAddress: row.wallet_address || '',
    verificationStatus: row.verification_status || 'new',
    verifiedAt: row.verified_at,
    trust,
    createdAt: row.created_at,
  }
}

function toProduct(row, sellerTrustMap = new Map()) {
  if (!row) return null
  const sellerTrust = sellerTrustMap.get(row.seller_id) || buildSellerTrust()
  return {
    id: row.id,
    sellerId: row.seller_id,
    seller: toSeller(row.sellers, sellerTrust),
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
  const invoice = row.invoices || row.invoice || null
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
    pickupCode: row.pickup_code || '',
    pickupStatus: row.pickup_status || 'waiting_pickup',
    createdAt: row.created_at,
    paidAt: row.paid_at,
    product: row.products ? toProduct(row.products) : null,
    invoice,
    transactionSignature: invoice?.transaction_signature || invoice?.txSignature || '',
    paymentMethod: row.payment_method || invoice?.payment_method || 'solana',
    paymentProofUrl: row.payment_proof_url || invoice?.payment_proof_url || '',
    fiatAmount: row.fiat_amount === null || row.fiat_amount === undefined
      ? (invoice?.fiat_amount === null || invoice?.fiat_amount === undefined ? null : Number(invoice.fiat_amount))
      : Number(row.fiat_amount),
    fiatCurrency: row.fiat_currency || invoice?.fiat_currency || 'IDR',
    paymentNote: row.payment_note || invoice?.payment_note || '',
  }
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))]
}

function realtimeChannelName(prefix) {
  const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${prefix}:${uniqueId}`
}

function sellerOrderReadStorageKey(sellerId) {
  return `kampuspay-seller-order-read:${sellerId}`
}

export function getLocalSellerOrderReadAt(sellerId) {
  if (!sellerId || typeof localStorage === 'undefined') return ''
  return localStorage.getItem(sellerOrderReadStorageKey(sellerId)) || ''
}

export function setLocalSellerOrderReadAt(sellerId, readAt = new Date().toISOString()) {
  if (!sellerId || typeof localStorage === 'undefined') return readAt
  localStorage.setItem(sellerOrderReadStorageKey(sellerId), readAt)
  window.dispatchEvent(new CustomEvent('kampuspay-seller-orders-read', {
    detail: { sellerId, readAt },
  }))
  return readAt
}

async function getSellerTrustMap(sellerIds) {
  const ids = uniqueValues(sellerIds)
  const emptyMap = new Map(ids.map((id) => [id, buildSellerTrust()]))
  if (ids.length === 0) return emptyMap

  const [productsResult, ordersResult] = await Promise.all([
    supabase
      .from('products')
      .select('seller_id, is_active')
      .in('seller_id', ids),
    supabase
      .from('orders')
      .select('seller_id, status')
      .in('seller_id', ids),
  ])

  if (productsResult.error) throw productsResult.error
  if (ordersResult.error) throw ordersResult.error

  const stats = new Map(ids.map((id) => [id, { activeProducts: 0, paidOrders: 0, totalOrders: 0 }]))

  productsResult.data.forEach((product) => {
    if (!product.is_active) return
    const sellerStats = stats.get(product.seller_id)
    if (sellerStats) sellerStats.activeProducts += 1
  })

  ordersResult.data.forEach((order) => {
    const sellerStats = stats.get(order.seller_id)
    if (!sellerStats) return
    sellerStats.totalOrders += 1
    if (PAID_ORDER_STATUSES.has(order.status)) sellerStats.paidOrders += 1
  })

  return new Map([...stats.entries()].map(([id, sellerStats]) => [id, buildSellerTrust(sellerStats)]))
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
  const sellerTrustMap = await getSellerTrustMap(data.map((product) => product.seller_id))
  return data.map((product) => toProduct(product, sellerTrustMap))
}

export async function getProductById(id) {
  assertSupabaseConfigured()
  const { data, error } = await supabase
    .from('products')
    .select('*, sellers(*)')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  const sellerTrustMap = await getSellerTrustMap([data.seller_id])
  return toProduct(data, sellerTrustMap)
}

export async function getSellerProducts(sellerId) {
  assertSupabaseConfigured()
  const { data, error } = await supabase
    .from('products')
    .select('*, sellers(*)')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  const sellerTrustMap = await getSellerTrustMap([sellerId])
  return data.map((product) => toProduct(product, sellerTrustMap))
}

export async function getSellerTrustSummary(sellerId) {
  assertSupabaseConfigured()
  const sellerTrustMap = await getSellerTrustMap([sellerId])
  return sellerTrustMap.get(sellerId) || buildSellerTrust()
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
    paymentMethod: 'solana',
    paymentProofUrl: '',
    fiatAmount: null,
    fiatCurrency: 'IDR',
    paymentNote: '',
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
      pickup_status: 'waiting_pickup',
      payment_method: 'solana',
      payment_proof_url: null,
      fiat_amount: null,
      fiat_currency: 'IDR',
      payment_note: null,
    })
    .select('*, products(*, sellers(*)), invoices(*)')
    .single()

  if (error) throw error
  return { invoice, order: toOrder(data) }
}

export async function getSellerOrders(sellerId) {
  assertSupabaseConfigured()
  const { data, error } = await supabase
    .from('orders')
    .select('*, products(*, sellers(*)), invoices(*)')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(toOrder)
}

export async function getUnreadSellerOrderCount({
  sellerId,
  localReadAt = getLocalSellerOrderReadAt(sellerId),
  excludeWhenViewingOrders = false,
}) {
  assertSupabaseConfigured()
  if (!sellerId || excludeWhenViewingOrders) return 0

  let query = supabase
    .from('orders')
    .select('id, created_at')
    .eq('seller_id', sellerId)

  if (localReadAt) query = query.gt('created_at', localReadAt)

  const { data, error } = await query
  if (error) throw error
  return data.length
}

export function subscribeToSellerOrderChanges(sellerId, onChange) {
  assertSupabaseConfigured()
  if (!sellerId) return () => {}

  const channel = supabase
    .channel(realtimeChannelName(`seller-orders:${sellerId}`))
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `seller_id=eq.${sellerId}`,
      },
      (payload) => onChange({
        eventType: payload.eventType,
        order: toOrder(payload.new),
        oldOrder: toOrder(payload.old),
      }),
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export async function getStudentOrders(userId) {
  assertSupabaseConfigured()
  const { data, error } = await supabase
    .from('orders')
    .select('*, products(*, sellers(*)), invoices(*)')
    .eq('buyer_user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(toOrder)
}

export async function getOrderByInvoiceId(invoiceId) {
  assertSupabaseConfigured()
  const { data, error } = await supabase
    .from('orders')
    .select('*, products(*, sellers(*)), invoices(*)')
    .eq('invoice_id', invoiceId)
    .maybeSingle()

  if (error) throw error
  return toOrder(data)
}

async function getOrderById(orderId) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, products(*, sellers(*)), invoices(*)')
    .eq('id', orderId)
    .maybeSingle()

  if (error) throw error
  return toOrder(data)
}

export async function getAllMarketplaceOrders() {
  assertSupabaseConfigured()
  const { data, error } = await supabase
    .from('orders')
    .select('*, products(*, sellers(*)), invoices(*)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(toOrder)
}

export async function cancelOrderByInvoice(invoiceId, note = 'Order cancelled by student before payment completion') {
  assertSupabaseConfigured()
  const existingOrder = await getOrderByInvoiceId(invoiceId)
  if (!existingOrder) throw new Error('Order not found.')
  if (PAID_ORDER_STATUSES.has(existingOrder.status)) {
    throw new Error('Order yang sudah dibayar tidak bisa dibatalkan.')
  }
  if (!CANCELLABLE_ORDER_STATUSES.has(existingOrder.status)) {
    throw new Error('Order ini tidak bisa dibatalkan dari status saat ini.')
  }

  const { error: invoiceError } = await supabase
    .from('invoices')
    .update({
      status: 'cancelled',
      payment_note: note,
    })
    .eq('id', invoiceId)
    .select('*')
    .single()

  if (invoiceError) throw invoiceError

  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      payment_note: note,
    })
    .eq('invoice_id', invoiceId)
    .select('*, products(*, sellers(*)), invoices(*)')
    .single()

  if (orderError) throw orderError
  const invoice = await getInvoiceById(invoiceId)
  return { invoice, order: toOrder(orderData) }
}

export async function markOrderPaidByInvoice(invoiceId, paidAt, { buyerWallet } = {}) {
  assertSupabaseConfigured()
  const existingOrder = await getOrderByInvoiceId(invoiceId)
  const pickupCode = existingOrder?.pickupCode || generatePickupCode()
  if (!pickupCode) throw new Error('Pickup code could not be generated. Please try again.')

  const updates = {
    status: 'paid',
    payment_method: 'solana',
    paid_at: paidAt,
    pickup_code: pickupCode,
    pickup_status: 'waiting_pickup',
  }

  if (buyerWallet) updates.buyer_wallet = buyerWallet

  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('invoice_id', invoiceId)
    .select('*, products(*, sellers(*)), invoices(*)')
    .maybeSingle()

  if (error) throw error
  return toOrder(data)
}

export async function uploadPaymentProof(file, invoiceId) {
  assertSupabaseConfigured()
  if (!file) return ''

  const extension = getFileExtension(file).replace(/[^a-z0-9]/g, '') || 'jpg'
  const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const path = `${invoiceId}/${uniqueId}.${extension}`

  const { error } = await supabase.storage
    .from(PAYMENT_PROOFS_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      contentType: file.type || 'image/jpeg',
      upsert: false,
    })

  if (error) throw error

  const { data } = supabase.storage.from(PAYMENT_PROOFS_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function submitReviewPaymentByInvoice(invoiceId, {
  paymentMethod,
  fiatAmount,
  fiatCurrency = 'IDR',
  paymentProofUrl = '',
  paymentNote,
} = {}) {
  assertSupabaseConfigured()

  const note = paymentNote || `${paymentMethod === 'qris' ? 'QRIS' : 'Bank transfer'} demo payment submitted for review`

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .update({
      status: 'payment_review',
      payment_method: paymentMethod,
      payment_proof_url: paymentProofUrl || null,
      fiat_amount: fiatAmount,
      fiat_currency: fiatCurrency,
      payment_note: note,
    })
    .eq('id', invoiceId)
    .select('*')
    .single()

  if (invoiceError) throw invoiceError

  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .update({
      status: 'payment_review',
      payment_method: paymentMethod,
      payment_proof_url: paymentProofUrl || null,
      fiat_amount: fiatAmount,
      fiat_currency: fiatCurrency,
      payment_note: note,
    })
    .eq('invoice_id', invoiceId)
    .select('*, products(*, sellers(*)), invoices(*)')
    .maybeSingle()

  if (orderError) throw orderError
  return { invoice, order: toOrder(orderData) }
}

export async function reserveCashPaymentByInvoice(invoiceId) {
  assertSupabaseConfigured()
  const existingOrder = await getOrderByInvoiceId(invoiceId)
  const pickupCode = existingOrder ? (existingOrder.pickupCode || generatePickupCode()) : ''
  if (existingOrder && !pickupCode) throw new Error('Pickup code could not be generated. Please try again.')

  const note = 'Cash payment will be completed on pickup'

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .update({
      status: 'cash_pending',
      payment_method: 'cash_on_pickup',
      payment_note: note,
    })
    .eq('id', invoiceId)
    .select('*')
    .single()

  if (invoiceError) throw invoiceError

  let order = null
  if (existingOrder) {
    const { data, error } = await supabase
      .from('orders')
      .update({
        status: 'cash_pending',
        payment_method: 'cash_on_pickup',
        payment_note: note,
        pickup_code: pickupCode,
        pickup_status: 'waiting_pickup',
      })
      .eq('invoice_id', invoiceId)
      .select('*, products(*, sellers(*)), invoices(*)')
      .single()

    if (error) throw error
    order = toOrder(data)
  }

  return { invoice, order }
}

export async function confirmReviewPaymentByOrder(orderId) {
  assertSupabaseConfigured()
  const existingOrder = await getOrderById(orderId)
  if (!existingOrder) throw new Error('Order not found.')

  const paidAt = new Date().toISOString()
  const pickupCode = existingOrder.pickupCode || generatePickupCode()
  if (!pickupCode) throw new Error('Pickup code could not be generated. Please try again.')

  const { data, error } = await supabase
    .from('orders')
    .update({
      status: 'paid_demo',
      paid_at: paidAt,
      pickup_code: pickupCode,
      pickup_status: 'waiting_pickup',
    })
    .eq('id', orderId)
    .select('*, products(*, sellers(*)), invoices(*)')
    .single()

  if (error) throw error

  const { error: invoiceError } = await supabase
    .from('invoices')
    .update({
      status: 'paid_demo',
      paid_at: paidAt,
      payment_method: existingOrder.paymentMethod,
    })
    .eq('id', existingOrder.invoiceId)

  if (invoiceError) throw invoiceError
  return toOrder(data)
}

export async function rejectReviewPaymentByOrder(orderId) {
  assertSupabaseConfigured()
  const existingOrder = await getOrderById(orderId)
  if (!existingOrder) throw new Error('Order not found.')

  const { data, error } = await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      payment_note: 'Payment rejected by seller',
    })
    .eq('id', orderId)
    .select('*, products(*, sellers(*)), invoices(*)')
    .single()

  if (error) throw error

  const { error: invoiceError } = await supabase
    .from('invoices')
    .update({
      status: 'cancelled',
      payment_note: 'Payment rejected by seller',
    })
    .eq('id', existingOrder.invoiceId)

  if (invoiceError) throw invoiceError
  return toOrder(data)
}

export async function markCashOrderPaidAndPickedUp(orderId) {
  assertSupabaseConfigured()
  const existingOrder = await getOrderById(orderId)
  if (!existingOrder) throw new Error('Order not found.')

  const paidAt = new Date().toISOString()

  const { data, error } = await supabase
    .from('orders')
    .update({
      status: 'paid_demo',
      paid_at: paidAt,
      pickup_status: 'picked_up',
    })
    .eq('id', orderId)
    .select('*, products(*, sellers(*)), invoices(*)')
    .single()

  if (error) throw error

  const { error: invoiceError } = await supabase
    .from('invoices')
    .update({
      status: 'paid_demo',
      paid_at: paidAt,
      payment_method: 'cash_on_pickup',
    })
    .eq('id', existingOrder.invoiceId)

  if (invoiceError) throw invoiceError
  return toOrder(data)
}

export async function updateOrderPickupStatus(orderId, pickupStatus) {
  assertSupabaseConfigured()
  const { data, error } = await supabase
    .from('orders')
    .update({ pickup_status: pickupStatus })
    .eq('id', orderId)
    .select('*, products(*, sellers(*)), invoices(*)')
    .single()

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
  const headers = ['id', 'invoiceId', 'product', 'buyerWallet', 'quantity', 'totalAmount', 'status', 'paymentMethod', 'fiatAmount', 'fiatCurrency', 'pickupCode', 'pickupStatus', 'transactionSignature', 'createdAt', 'paidAt']
  const rows = orders.map((order) => [
    order.id,
    order.invoiceId,
    order.product?.name || '',
    order.buyerWallet,
    order.quantity,
    order.totalAmount,
    order.status,
    order.paymentMethod,
    order.fiatAmount,
    order.fiatCurrency,
    order.pickupCode,
    order.pickupStatus,
    order.transactionSignature,
    order.createdAt,
    order.paidAt,
  ].map(escapeCsv).join(','))

  return [headers.join(','), ...rows].join('\n')
}
