import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import { useAuth } from '../components/authContext'
import { useToast } from '../components/toastContext'
import WalletModal from '../components/WalletModal'
import PasswordInput from '../components/PasswordInput'
import { shortenAddress } from '../hooks/useWallet'
import { getProfileByWalletAddress } from '../utils/profileStorage'
import { useI18n } from '../i18n/LanguageProvider'
import './AuthPages.css'

export default function LoginPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const toast = useToast()
  const { login } = useAuth()
  const { connect, connected, connecting, publicKey, wallet } = useWallet()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [walletModalOpen, setWalletModalOpen] = useState(false)
  const [walletLookupLoading, setWalletLookupLoading] = useState(false)
  const [walletProfile, setWalletProfile] = useState(null)
  const [error, setError] = useState('')
  const lastLookupWallet = useRef('')

  const connectedWallet = publicKey?.toString() || ''

  useEffect(() => {
    if (!connectedWallet || lastLookupWallet.current === connectedWallet) return undefined

    let ignore = false
    lastLookupWallet.current = connectedWallet
    setWalletLookupLoading(true)

    getProfileByWalletAddress(connectedWallet)
      .then((profile) => {
        if (ignore) return
        setWalletProfile(profile)
        if (profile?.email) {
          setForm((current) => ({ ...current, email: profile.email || current.email }))
          toast.info(t('auth.walletLinkedLoginHint', { email: profile.email }))
        } else {
          toast.info(t('auth.walletNoPasswordAccount'))
        }
      })
      .catch((err) => {
        if (!ignore) toast.error(err.message || t('auth.walletLookupFailed'))
      })
      .finally(() => {
        if (!ignore) setWalletLookupLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [connectedWallet, t, toast])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    try {
      setLoading(true)
      const profile = await login(form)
      let walletConnected = connected

      if (profile?.wallet_address && !connected && !connecting && wallet?.adapter) {
        try {
          await connect()
          walletConnected = true
        } catch {
          walletConnected = false
        }
      }

      toast.success(walletConnected ? t('auth.loginSuccessWallet') : t('auth.loginSuccess'))
      if (profile?.wallet_address && !walletConnected && !wallet?.adapter) {
        toast.info(t('auth.savedWalletHint'))
      }
      navigate(profile?.role === 'seller' ? '/seller/dashboard' : '/student/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Login failed.')
      toast.error(err.message || 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="container auth-shell">
        <section className="auth-copy">
          <span className="section-tag">{t('auth.loginTag')}</span>
          <h1>{t('auth.loginTitle')}</h1>
          <p>{t('auth.loginSub')}</p>
        </section>

        <form className="card auth-card" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('auth.walletLinkedAccount')}</label>
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
                    {connectedWallet ? shortenAddress(connectedWallet) : t('wallet.connect')}
                  </div>
                  <div className="auth-wallet-address">
                    {walletLookupLoading
                      ? t('auth.searchingWallet')
                      : walletProfile?.email
                        ? t('auth.walletLinkedTo', { email: walletProfile.email })
                        : connectedWallet
                          ? t('auth.walletNotLinked')
                          : t('auth.findWalletAccount')}
                  </div>
                </div>
              </div>
              <div className="auth-wallet-actions">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setWalletModalOpen(true)}
                  disabled={connecting || walletLookupLoading}
                >
                  {connectedWallet ? t('wallet.change') : t('wallet.connectShort')}
                </button>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('auth.email')}</label>
            <input
              className="form-input"
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('auth.password')}</label>
            <PasswordInput
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              showLabel={t('auth.showPassword')}
              hideLabel={t('auth.hidePassword')}
              required
            />
            <Link className="auth-forgot-link" to="/forgot-password">
              {t('auth.forgotPassword')}
            </Link>
          </div>

          {error && <div className="alert alert-error mb-6">{error}</div>}

          <button className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? t('auth.loggingIn') : t('auth.loginButton')}
          </button>
          <div className="auth-switch">
            <span>{t('auth.noAccount')}</span>
            <Link to="/register">{t('auth.registerButton')}</Link>
          </div>
        </form>
      </div>
      <WalletModal isOpen={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
    </div>
  )
}
