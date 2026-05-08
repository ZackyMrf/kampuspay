import { assertSupabaseConfigured, supabase } from './supabaseClient'

const PROFILE_AVATARS_BUCKET = 'profile-avatars'

function getFileExtension(file) {
  const fromName = file.name?.split('.').pop()?.toLowerCase()
  if (fromName && fromName !== file.name) return fromName
  return file.type?.split('/').pop() || 'jpg'
}

export async function updateUserProfile(userId, updates) {
  assertSupabaseConfigured()
  const row = {}
  if ('fullName' in updates) row.full_name = updates.fullName
  if ('walletAddress' in updates) row.wallet_address = updates.walletAddress
  if ('avatarUrl' in updates) row.avatar_url = updates.avatarUrl

  const { data, error } = await supabase
    .from('profiles')
    .update(row)
    .eq('id', userId)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function getProfileByWalletAddress(walletAddress) {
  assertSupabaseConfigured()
  if (!walletAddress) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, wallet_address')
    .eq('wallet_address', walletAddress)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function uploadProfileAvatar(file, userId) {
  assertSupabaseConfigured()
  if (!file) return ''

  const extension = getFileExtension(file).replace(/[^a-z0-9]/g, '') || 'jpg'
  const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const path = `${userId}/${uniqueId}.${extension}`

  const { error } = await supabase.storage
    .from(PROFILE_AVATARS_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      contentType: file.type || 'image/jpeg',
      upsert: false,
    })

  if (error) throw error

  const { data } = supabase.storage.from(PROFILE_AVATARS_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
