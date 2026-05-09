import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import { useAuth } from '../components/authContext'
import { useToast } from '../components/toastContext'
import WalletModal from '../components/WalletModal'
import PasswordInput from '../components/PasswordInput'
import { shortenAddress } from '../hooks/useWallet'
import { useI18n } from '../i18n/LanguageProvider'
import './AuthPages.css'

export default function RegisterPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const toast = useToast()
  const { publicKey, wallet, disconnect } = useWallet()
  const { register } = useAuth()
  const connectedWallet = publicKey?.toString() || ''
  const [walletModalOpen, setWalletModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'student',
    storeName: '',
    storeDescription: '',
    storeCategory: 'Food',
  })

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!connectedWallet) {
      const message = 'Connect wallet dulu sebelum register.'
      setError(message)
      toast.error(message)
      setWalletModalOpen(true)
      return
    }

    try {
      setLoading(true)
      await register({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        walletAddress: connectedWallet,
        sellerProfile: {
          storeName: form.storeName.trim(),
          storeDescription: form.storeDescription.trim(),
          storeCategory: form.storeCategory,
          walletAddress: connectedWallet,
        },
      })
      toast.success('Register berhasil.')
      navigate(form.role === 'seller' ? '/seller/dashboard' : '/student/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Registration failed.')
      toast.error(err.message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="container auth-shell">
        <section className="auth-copy">
          <span className="section-tag">{t('auth.registerTag')}</span>
          <h1>{t('auth.registerTitle')}</h1>
          <p>{t('auth.registerSub')}</p>
        </section>

        <form className="card auth-card" onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">{t('auth.fullName')}</label>
              <input className="form-input" name="fullName" value={form.fullName} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">{t('auth.role')}</label>
              <select className="form-select" name="role" value={form.role} onChange={handleChange}>
                <option value="student">{t('auth.student')}</option>
                <option value="seller">{t('auth.seller')}</option>
              </select>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">{t('auth.email')}</label>
              <input className="form-input" type="email" name="email" value={form.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">{t('auth.password')}</label>
              <PasswordInput
                name="password"
                value={form.password}
                onChange={handleChange}
                showLabel={t('auth.showPassword')}
                hideLabel={t('auth.hidePassword')}
                minLength={6}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('auth.wallet')}</label>
            <div className={`auth-wallet-panel ${connectedWallet ? 'connected' : ''}`}>
              <div className="auth-wallet-main">
                {wallet?.adapter?.icon && (
                  <img
                    src={wallet.adapter.icon}
                    alt={wallet.adapter.name}
                    className="auth-wallet-icon"
                  />
                )}
                <div>
                  <div className="auth-wallet-title">
                    {connectedWallet ? wallet?.adapter?.name || t('auth.walletConnected') : t('wallet.connect')}
                  </div>
                  <div className="auth-wallet-address">
                    {connectedWallet ? shortenAddress(connectedWallet) : t('auth.walletRegisterHint')}
                  </div>
                </div>
              </div>
              <div className="auth-wallet-actions">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setWalletModalOpen(true)}
                >
                  {connectedWallet ? t('wallet.change') : t('wallet.connectShort')}
                </button>
                {connectedWallet && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => disconnect()}
                  >
                    {t('wallet.disconnect')}
                  </button>
                )}
              </div>
            </div>
          </div>

          {form.role === 'seller' && (
            <div className="seller-fields">
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">{t('auth.storeName')}</label>
                  <input className="form-input" name="storeName" value={form.storeName} onChange={handleChange} placeholder="Kantin Teknik" />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('auth.storeCategory')}</label>
                  <select className="form-select" name="storeCategory" value={form.storeCategory} onChange={handleChange}>
                    <option>Food</option>
                    <option>Drink</option>
                    <option>Campus Event</option>
                    <option>Merchandise</option>
                    <option>Service</option>
                    <option>Donation</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{t('auth.sellerWallet')}</label>
                <div className="auth-wallet-note">
                  {t('auth.sellerWalletNote')}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{t('auth.storeDescription')}</label>
                <textarea className="form-textarea" name="storeDescription" value={form.storeDescription} onChange={handleChange} rows={3} />
              </div>
            </div>
          )}

          {error && <div className="alert alert-error mb-6">{error}</div>}

          <button className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? t('auth.creatingAccount') : t('auth.registerButton')}
          </button>
          <div className="auth-switch">
            <span>{t('auth.haveAccount')}</span>
            <Link to="/login">{t('auth.loginButton')}</Link>
          </div>
        </form>
      </div>
      <WalletModal isOpen={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
    </div>
  )
}
