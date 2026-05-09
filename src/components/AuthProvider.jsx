import { useEffect, useState } from 'react'
import { AuthContext } from './authContext'
import { assertSupabaseConfigured, supabase } from '../utils/supabaseClient'

function toSeller(row) {
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
    createdAt: row.created_at,
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [seller, setSeller] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (userId) => {
    if (!userId) {
      setProfile(null)
      setSeller(null)
      return null
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) throw error
    setProfile(data)

    if (data?.role === 'seller') {
      const { data: sellerData, error: sellerError } = await supabase
        .from('sellers')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (sellerError) throw sellerError
      setSeller(toSeller(sellerData))
    } else {
      setSeller(null)
    }

    return data
  }

  useEffect(() => {
    let mounted = true

    async function boot() {
      try {
        assertSupabaseConfigured()
        const { data } = await supabase.auth.getSession()
        if (!mounted) return
        setSession(data.session)
        await loadProfile(data.session?.user?.id)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    boot()

    const { data: listener } = supabase?.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      loadProfile(nextSession?.user?.id).finally(() => setLoading(false))
    }) || { data: null }

    return () => {
      mounted = false
      listener?.subscription?.unsubscribe()
    }
  }, [])

  const register = async ({ fullName, email, password, role, walletAddress, sellerProfile }) => {
    assertSupabaseConfigured()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    })

    if (error) throw error
    if (!data.user) throw new Error('Registration did not return a Supabase user.')

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        role,
        wallet_address: walletAddress || '',
      }, { onConflict: 'id' })

    if (profileError) throw profileError

    if (role === 'seller') {
      const { error: sellerError } = await supabase
        .from('sellers')
        .insert({
          user_id: data.user.id,
          store_name: sellerProfile?.storeName || `${fullName}'s Store`,
          store_description: sellerProfile?.storeDescription || 'Campus seller on KampusPay Lite.',
          store_category: sellerProfile?.storeCategory || 'Other',
          wallet_address: sellerProfile?.walletAddress || walletAddress || '',
        })

      if (sellerError) throw sellerError
    }

    setSession(data.session)
    await loadProfile(data.user.id)
    return data
  }

  const login = async ({ email, password }) => {
    assertSupabaseConfigured()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    setSession(data.session)
    return loadProfile(data.user.id)
  }

  const requestPasswordReset = async (email) => {
    assertSupabaseConfigured()
    const redirectTo = `${window.location.origin}/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) throw error
  }

  const updatePassword = async (password) => {
    assertSupabaseConfigured()
    const { data, error } = await supabase.auth.updateUser({ password })
    if (error) throw error
    if (data.user) await loadProfile(data.user.id)
    return data
  }

  const logout = async () => {
    assertSupabaseConfigured()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setSession(null)
    setProfile(null)
    setSeller(null)
  }

  const refreshProfile = async () => loadProfile(session?.user?.id)

  const value = {
    session,
    user: session?.user || null,
    profile,
    seller,
    loading,
    isLoggedIn: Boolean(session?.user),
    role: profile?.role || null,
    register,
    login,
    requestPasswordReset,
    updatePassword,
    logout,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
