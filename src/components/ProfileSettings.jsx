import { useEffect, useMemo, useRef, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useAuth } from './authContext'
import { useToast } from './toastContext'
import { shortenAddress } from '../hooks/useWallet'
import { updateSellerProfile } from '../utils/marketplaceStorage'
import { updateUserProfile, uploadProfileAvatar } from '../utils/profileStorage'
import WalletModal from './WalletModal'

function getInitials(name, fallback = 'KP') {
  const parts = name?.trim().split(/\s+/).filter(Boolean) || []
  if (parts.length === 0) return fallback
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
}

export default function ProfileSettings() {
  const { user, profile, seller, refreshProfile } = useAuth()
  const { publicKey, wallet } = useWallet()
  const toast = useToast()
  const previewUrlRef = useRef('')
  const [walletModalOpen, setWalletModalOpen] = useState(false)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    fullName: profile?.full_name || '',
    walletAddress: profile?.wallet_address || seller?.walletAddress || '',
    storeName: seller?.storeName || '',
  })

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  const displayName = form.fullName || profile?.email || 'KampusPay User'
  const avatarUrl = avatarPreview || profile?.avatar_url || ''
  const connectedWallet = publicKey?.toString() || ''
  const walletSummary = useMemo(() => {
    if (connectedWallet) return `${wallet?.adapter?.name || 'Connected'}: ${shortenAddress(connectedWallet)}`
    if (form.walletAddress) return `Saved: ${shortenAddress(form.walletAddress)}`
    return 'No wallet saved'
  }, [connectedWallet, form.walletAddress, wallet?.adapter?.name])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Pilih file gambar untuk foto profil.')
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error('Ukuran foto maksimal 3 MB.')
      return
    }
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = URL.createObjectURL(file)
    setAvatarPreview(previewUrlRef.current)
    setAvatarFile(file)
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    if (!user?.id) return

    const fullName = form.fullName.trim()
    const walletAddress = form.walletAddress.trim()
    const storeName = form.storeName.trim()

    if (!fullName) {
      toast.error('Nama tidak boleh kosong.')
      return
    }

    try {
      setSaving(true)
      const avatarUrl = avatarFile
        ? await uploadProfileAvatar(avatarFile, user.id)
        : profile?.avatar_url || ''

      await updateUserProfile(user.id, {
        fullName,
        walletAddress,
        avatarUrl,
      })

      if (profile?.role === 'seller' && seller?.id) {
        await updateSellerProfile(seller.id, {
          storeName: storeName || seller.storeName,
          walletAddress,
        })
      }

      setAvatarFile(null)
      setAvatarPreview('')
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current = ''
      }
      await refreshProfile()
      toast.success('Profil berhasil diperbarui.')
    } catch (error) {
      toast.error(error.message || 'Gagal menyimpan profil.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="card profile-settings-card">
      <div className="profile-settings-head">
        <div className="profile-avatar-preview">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} />
          ) : (
            <span>{getInitials(displayName)}</span>
          )}
        </div>
        <div>
          <span className="section-tag">Profile Settings</span>
          <h2>Atur profil</h2>
          <p className="text-secondary">{walletSummary}</p>
        </div>
      </div>

      <form className="profile-settings-form" onSubmit={saveProfile}>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Nama</label>
            <input
              className="form-input"
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              placeholder="Nama lengkap"
            />
          </div>

          {profile?.role === 'seller' && (
            <div className="form-group">
              <label className="form-label">Nama Toko</label>
              <input
                className="form-input"
                name="storeName"
                value={form.storeName}
                onChange={handleChange}
                placeholder="Nama toko"
              />
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Wallet</label>
          <div className="profile-wallet-row">
            <input
              className="form-input font-mono"
              name="walletAddress"
              value={form.walletAddress}
              onChange={handleChange}
              placeholder="Solana wallet address"
            />
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setWalletModalOpen(true)}
            >
              Connect
            </button>
            {connectedWallet && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setForm((current) => ({ ...current, walletAddress: connectedWallet }))}
              >
                Use Connected
              </button>
            )}
          </div>
          <span className="form-hint">Untuk seller, wallet ini juga menjadi wallet penerima pembayaran.</span>
        </div>

        <div className="form-group">
          <label className="form-label">Foto Profil</label>
          <label className="btn btn-outline profile-upload-button">
            Pilih Foto
            <input type="file" accept="image/*" onChange={handleAvatarChange} />
          </label>
          <span className="form-hint">JPG, PNG, WebP, atau GIF. Maksimal 3 MB.</span>
        </div>

        <div className="profile-settings-actions">
          <button className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>

      <WalletModal isOpen={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
    </section>
  )
}
