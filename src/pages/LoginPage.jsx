import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import { useAuth } from '../components/authContext'
import { useToast } from '../components/toastContext'
import WalletModal from '../components/WalletModal'
import { shortenAddress } from '../hooks/useWallet'
import { getProfileByWalletAddress } from '../utils/profileStorage'
import './AuthPages.css'

export default function LoginPage() {
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
          toast.info(`Wallet terhubung ke akun ${profile.email}. Masukkan password untuk login.`)
        } else {
          toast.info('Wallet ini belum terhubung ke akun email/password.')
        }
      })
      .catch((err) => {
        if (!ignore) toast.error(err.message || 'Gagal mencari akun dari wallet.')
      })
      .finally(() => {
        if (!ignore) setWalletLookupLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [connectedWallet, toast])

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

      toast.success(walletConnected ? 'Login berhasil, wallet ikut terkoneksi.' : 'Login berhasil.')
      if (profile?.wallet_address && !walletConnected && !wallet?.adapter) {
        toast.info('Wallet akun tersimpan. Pilih wallet sekali dari navbar agar login berikutnya bisa auto-connect.')
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
          <span className="section-tag">KampusPay Account</span>
          <h1>Masuk untuk membeli atau mengelola lapak kampus.</h1>
          <p>Connect wallet untuk mengambil email akun yang terhubung, lalu login dengan password akun tersebut.</p>
        </section>

        <form className="card auth-card" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Wallet Linked Account</label>
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
                    {connectedWallet ? shortenAddress(connectedWallet) : 'Connect Wallet'}
                  </div>
                  <div className="auth-wallet-address">
                    {walletLookupLoading
                      ? 'Mencari akun dari wallet...'
                      : walletProfile?.email
                        ? `Terhubung ke ${walletProfile.email}`
                        : connectedWallet
                          ? 'Wallet belum terhubung ke akun.'
                          : 'Cari email akun dari wallet yang terdaftar.'}
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
                  {connectedWallet ? 'Change' : 'Connect'}
                </button>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              required
            />
          </div>

          {error && <div className="alert alert-error mb-6">{error}</div>}

          <button className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
          <div className="auth-switch">
            <span>Belum punya akun?</span>
            <Link to="/register">Register</Link>
          </div>
        </form>
      </div>
      <WalletModal isOpen={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
    </div>
  )
}
