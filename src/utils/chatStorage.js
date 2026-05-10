import { assertSupabaseConfigured, supabase } from './supabaseClient'

function toProfile(row) {
  if (!row) return null
  return {
    id: row.id,
    email: row.email || '',
    fullName: row.full_name || '',
    role: row.role || '',
    avatarUrl: row.avatar_url || '',
  }
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
  }
}

function toProduct(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    imageUrl: row.image_url || '',
    category: row.category || 'Other',
    priceSol: Number(row.price_sol || 0),
  }
}

function toOrder(row) {
  if (!row) return null
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    quantity: Number(row.quantity || 1),
    status: row.status,
    pickupCode: row.pickup_code || '',
  }
}

function toThread(row, latestMessage = null) {
  if (!row) return null
  return {
    id: row.id,
    productId: row.product_id,
    orderId: row.order_id,
    studentId: row.student_id,
    sellerId: row.seller_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    product: toProduct(row.products),
    order: toOrder(row.orders),
    seller: toSeller(row.sellers),
    student: toProfile(row.profiles),
    latestMessage,
  }
}

function toMessage(row) {
  if (!row) return null
  return {
    id: row.id,
    threadId: row.thread_id,
    senderId: row.sender_id,
    senderRole: row.sender_role,
    message: row.message,
    createdAt: row.created_at,
    readAt: row.read_at,
  }
}

async function attachLatestMessages(threads) {
  if (threads.length === 0) return threads
  const ids = threads.map((thread) => thread.id)
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .in('thread_id', ids)
    .order('created_at', { ascending: false })

  if (error) throw error

  const latestByThread = new Map()
  data.forEach((message) => {
    if (!latestByThread.has(message.thread_id)) {
      latestByThread.set(message.thread_id, toMessage(message))
    }
  })

  return threads.map((thread) => ({
    ...thread,
    latestMessage: latestByThread.get(thread.id) || null,
  }))
}

export async function getOrCreateChatThread({
  productId,
  orderId = null,
  studentId,
  sellerId,
}) {
  assertSupabaseConfigured()
  if (!studentId) throw new Error('Student account is required to start a chat.')
  if (!sellerId) throw new Error('Seller is required to start a chat.')

  let query = supabase
    .from('chat_threads')
    .select('*, products(*), orders(*), sellers(*), profiles(*)')
    .eq('student_id', studentId)
    .eq('seller_id', sellerId)

  if (orderId) {
    query = query.eq('order_id', orderId)
  } else {
    query = query.eq('product_id', productId).is('order_id', null)
  }

  const { data: existing, error: existingError } = await query.maybeSingle()
  if (existingError) throw existingError
  if (existing) return toThread(existing)

  const { data, error } = await supabase
    .from('chat_threads')
    .insert({
      product_id: productId || null,
      order_id: orderId,
      student_id: studentId,
      seller_id: sellerId,
    })
    .select('*, products(*), orders(*), sellers(*), profiles(*)')
    .single()

  if (error) throw error
  return toThread(data)
}

export async function getChatThread(threadId) {
  assertSupabaseConfigured()
  const { data, error } = await supabase
    .from('chat_threads')
    .select('*, products(*), orders(*), sellers(*), profiles(*)')
    .eq('id', threadId)
    .maybeSingle()

  if (error) throw error
  return toThread(data)
}

export async function getStudentChatThreads(studentId) {
  assertSupabaseConfigured()
  const { data, error } = await supabase
    .from('chat_threads')
    .select('*, products(*), orders(*), sellers(*), profiles(*)')
    .eq('student_id', studentId)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return attachLatestMessages(data.map((thread) => toThread(thread)))
}

export async function getSellerChatThreads(sellerId) {
  assertSupabaseConfigured()
  const { data, error } = await supabase
    .from('chat_threads')
    .select('*, products(*), orders(*), sellers(*), profiles(*)')
    .eq('seller_id', sellerId)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return attachLatestMessages(data.map((thread) => toThread(thread)))
}

export async function getChatMessages(threadId) {
  assertSupabaseConfigured()
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data.map(toMessage)
}

export async function sendChatMessage({ threadId, senderId, senderRole, message }) {
  assertSupabaseConfigured()
  const cleanMessage = message.trim()
  if (!cleanMessage) throw new Error('Message cannot be empty.')

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      thread_id: threadId,
      sender_id: senderId,
      sender_role: senderRole,
      message: cleanMessage,
    })
    .select('*')
    .single()

  if (error) throw error

  await supabase
    .from('chat_threads')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', threadId)

  return toMessage(data)
}
