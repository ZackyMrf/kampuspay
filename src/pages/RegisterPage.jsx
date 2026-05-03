import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import { useAuth } from '../components/authContext'
import { useToast } from '../components/toastContext'
import './AuthPages.css'

export default function RegisterPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { publicKey } = useWallet()
  const { register } = useAuth()
  const connectedWallet = publicKey?.toString() || ''
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'student',
    walletAddress: connectedWallet,
    storeName: '',
    storeDescription: '',
    storeCategory: 'Food',
    sellerWalletAddress: connectedWallet,
  })

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    try {
      setLoading(true)
      await register({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        walletAddress: form.walletAddress.trim() || connectedWallet,
        sellerProfile: {
          storeName: form.storeName.trim(),
          storeDescription: form.storeDescription.trim(),
          storeCategory: form.storeCategory,
          walletAddress: form.sellerWalletAddress.trim() || connectedWallet,
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
          <span className="section-tag">Create Account</span>
          <h1>Buat akun student atau seller untuk marketplace kampus.</h1>
          <p>Seller akan langsung punya store profile sederhana. Wallet bisa dikosongkan dulu, tapi dibutuhkan saat menerima pembayaran.</p>
        </section>

        <form className="card auth-card" onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" name="fullName" value={form.fullName} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-select" name="role" value={form.role} onChange={handleChange}>
                <option value="student">Student</option>
                <option value="seller">Seller</option>
              </select>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" name="email" value={form.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" name="password" value={form.password} onChange={handleChange} minLength={6} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Wallet Address Optional</label>
            <input className="form-input font-mono" name="walletAddress" value={form.walletAddress} onChange={handleChange} placeholder="Solana wallet address" />
          </div>

          {form.role === 'seller' && (
            <div className="seller-fields">
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Store Name</label>
                  <input className="form-input" name="storeName" value={form.storeName} onChange={handleChange} placeholder="Kantin Teknik" />
                </div>
                <div className="form-group">
                  <label className="form-label">Store Category</label>
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
                <label className="form-label">Seller Wallet</label>
                <input className="form-input font-mono" name="sellerWalletAddress" value={form.sellerWalletAddress} onChange={handleChange} placeholder="Wallet penerima pembayaran" />
                {connectedWallet && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setForm((current) => ({ ...current, sellerWalletAddress: connectedWallet }))}
                  >
                    Use connected wallet
                  </button>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Store Description</label>
                <textarea className="form-textarea" name="storeDescription" value={form.storeDescription} onChange={handleChange} rows={3} />
              </div>
            </div>
          )}

          {error && <div className="alert alert-error mb-6">{error}</div>}

          <button className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? 'Creating account...' : 'Register'}
          </button>
          <div className="auth-switch">
            <span>Sudah punya akun?</span>
            <Link to="/login">Login</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
