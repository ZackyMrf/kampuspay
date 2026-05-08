import {
  getActiveProducts,
  getAllMarketplaceOrders,
  getStudentOrders,
} from './marketplaceStorage'
import { PAID_ORDER_STATUSES, PICKUP_READY_STATUSES } from './paymentMethods'

const FOOD_WORDS = ['makanan', 'food', 'lapar', 'nasi', 'kantin', 'snack', 'minum', 'drink']
const CHEAP_WORDS = ['murah', 'cheap', 'termurah', 'budget', 'hemat']
const POPULAR_WORDS = ['populer', 'popular', 'ramai', 'best', 'laris']
const TRUSTED_WORDS = ['seller terpercaya', 'trusted', 'verified', 'terpercaya', 'badge']
const ORDER_WORDS = ['order', 'pesanan', 'riwayat pembelian', 'belanjaan']
const PICKUP_WORDS = ['pickup', 'kode', 'ambil', 'pengambilan']
const PENDING_PICKUP_WORDS = ['belum diambil', 'pending pickup', 'waiting pickup']
const PAYMENT_WORDS = ['bayar', 'payment', 'wallet', 'invoice', 'solana', 'phantom', 'qris', 'cash', 'tunai', 'transfer', 'metode']

function includesAny(text, words) {
  return words.some((word) => text.includes(word))
}

function sortByTrustThenRecent(products) {
  return [...products].sort((a, b) => {
    const trustDiff = (b.seller?.trust?.trustScore || 0) - (a.seller?.trust?.trustScore || 0)
    if (trustDiff !== 0) return trustDiff
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

function getFrequentCategory(orders) {
  const counts = new Map()
  orders
    .filter((order) => PAID_ORDER_STATUSES.has(order.status) && order.product?.category)
    .forEach((order) => counts.set(order.product.category, (counts.get(order.product.category) || 0) + 1))

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || ''
}

export function detectIntent(message) {
  const text = message.toLowerCase()

  if (includesAny(text, PENDING_PICKUP_WORDS)) return 'show_pending_pickups'
  if (includesAny(text, PICKUP_WORDS)) return 'show_pickup_code'
  if (includesAny(text, ORDER_WORDS)) return 'show_my_orders'
  if (includesAny(text, FOOD_WORDS)) return 'recommend_food'
  if (includesAny(text, CHEAP_WORDS)) return 'recommend_cheap_product'
  if (includesAny(text, POPULAR_WORDS)) return 'recommend_popular_products'
  if (includesAny(text, TRUSTED_WORDS)) return 'recommend_trusted_sellers'
  if (includesAny(text, PAYMENT_WORDS)) return 'payment_help'
  if (text.includes('rekomendasi') || text.includes('recommend')) return 'recommend_product'
  return 'fallback'
}

export async function getRecommendedProducts(userId) {
  const products = await getActiveProducts()
  if (!userId) return sortByTrustThenRecent(products).slice(0, 5)

  const orders = await getStudentOrders(userId)
  const frequentCategory = getFrequentCategory(orders)
  const personalized = frequentCategory
    ? products.filter((product) => product.category === frequentCategory)
    : []

  return sortByTrustThenRecent(personalized.length > 0 ? personalized : products).slice(0, 5)
}

export async function getFoodProducts() {
  const products = await getActiveProducts()
  return sortByTrustThenRecent(
    products.filter((product) => ['Food', 'Drink'].includes(product.category))
  ).slice(0, 5)
}

export async function getCheapProducts() {
  const products = await getActiveProducts()
  return [...products].sort((a, b) => a.priceSol - b.priceSol).slice(0, 5)
}

export async function getPopularProducts() {
  const [products, orders] = await Promise.all([getActiveProducts(), getAllMarketplaceOrders()])
  const paidCounts = new Map()

  orders
    .filter((order) => PAID_ORDER_STATUSES.has(order.status))
    .forEach((order) => paidCounts.set(order.productId, (paidCounts.get(order.productId) || 0) + 1))

  if (paidCounts.size === 0) return products.slice(0, 5)

  return [...products]
    .sort((a, b) => (paidCounts.get(b.id) || 0) - (paidCounts.get(a.id) || 0))
    .slice(0, 5)
}

export async function getTrustedSellerProducts() {
  const products = await getActiveProducts()
  const trustedProducts = products.filter((product) => (
    product.seller?.trust?.badge === 'Verified Campus Seller'
    || product.seller?.trust?.badge === 'Trusted Seller'
  ))
  const fallbackProducts = products.filter((product) => product.seller?.trust?.badge === 'Campus Seller')

  return sortByTrustThenRecent(trustedProducts.length > 0 ? trustedProducts : fallbackProducts).slice(0, 5)
}

export async function getLatestPickupCode(userId) {
  const orders = await getStudentOrders(userId)
  return orders.find((order) => PICKUP_READY_STATUSES.has(order.status) && order.pickupCode) || null
}

export async function getPendingPickups(userId) {
  const orders = await getStudentOrders(userId)
  return orders.filter((order) => PICKUP_READY_STATUSES.has(order.status) && order.pickupStatus === 'waiting_pickup').slice(0, 5)
}

export async function handleAssistantMessage({ message, user, profile }) {
  if (!user) {
    return {
      text: 'Login sebagai student dulu supaya Kampus AI Assistant bisa melihat order, pickup code, dan rekomendasi yang relevan.',
    }
  }

  if (profile?.role === 'seller') {
    return {
      text: 'Kampus AI Assistant is currently optimized for student shopping assistance.',
    }
  }

  const intent = detectIntent(message)

  if (intent === 'recommend_food') {
    const products = await getFoodProducts()
    return { text: products.length ? 'Ini rekomendasi makanan dan minuman kampus yang bisa kamu cek.' : 'Belum ada produk makanan aktif saat ini.', products }
  }

  if (intent === 'recommend_cheap_product') {
    const products = await getCheapProducts()
    return { text: products.length ? 'Aku urutkan dari harga SOL paling hemat.' : 'Belum ada produk aktif untuk direkomendasikan.', products }
  }

  if (intent === 'recommend_popular_products') {
    const products = await getPopularProducts()
    return { text: products.length ? 'Ini produk yang paling ramai dibeli, atau produk terbaru kalau belum ada histori paid order.' : 'Belum ada produk populer saat ini.', products }
  }

  if (intent === 'recommend_trusted_sellers') {
    const products = await getTrustedSellerProducts()
    return { text: products.length ? 'Ini produk dari seller dengan sinyal trust paling kuat saat ini.' : 'Belum ada seller verified, jadi aku belum punya rekomendasi terpercaya.', products }
  }

  if (intent === 'show_my_orders') {
    const orders = (await getStudentOrders(user.id)).slice(0, 5)
    return { text: orders.length ? 'Ini riwayat order terbaru kamu.' : 'Kamu belum punya order marketplace.', orders }
  }

  if (intent === 'show_pickup_code') {
    const order = await getLatestPickupCode(user.id)
    return {
      text: order ? `Pickup code terbaru kamu: ${order.pickupCode}. Tunjukkan kode ini ke seller saat mengambil barang.` : 'Pickup code akan muncul setelah pembayaran marketplace berhasil.',
      orders: order ? [order] : [],
    }
  }

  if (intent === 'show_pending_pickups') {
    const orders = await getPendingPickups(user.id)
    return { text: orders.length ? 'Ini order yang sudah dibayar dan masih menunggu pickup.' : 'Tidak ada pickup yang sedang menunggu.', orders }
  }

  if (intent === 'payment_help' || intent === 'invoice_help') {
    return {
      text: 'KampusPay mendukung 4 metode: Solana Devnet Wallet untuk on-chain demo payment yang bisa dicek di Explorer, QRIS Simulation untuk demo pembayaran lokal Indonesia, Cash on Pickup untuk bayar langsung ke seller saat ambil barang, dan Bank Transfer Simulation kalau tersedia. Untuk Solana, connect wallet, pastikan ada Devnet SOL, lalu klik Pay Now. Untuk QRIS dan bank, ini demo only dan seller harus konfirmasi sebelum status jadi Paid Demo. Untuk cash, order di-reserve dan pickup code muncul untuk dibawa ke seller.',
    }
  }

  if (intent === 'recommend_product') {
    const products = await getRecommendedProducts(user.id)
    return { text: products.length ? 'Aku pilihkan rekomendasi berdasarkan produk aktif dan histori belanja kamu.' : 'Belum ada produk aktif untuk direkomendasikan.', products }
  }

  return {
    text: 'Sorry, I could not fully understand that. You can ask me about product recommendations, trusted sellers, your orders, pickup codes, or payment help.',
  }
}
