import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/authContext'
import { useToast } from '../components/toastContext'
import './AuthPages.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    try {
      setLoading(true)
      const profile = await login(form)
      toast.success('Login berhasil.')
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
          <p>Student masuk ke dashboard pembelian. Seller masuk ke dashboard toko, produk, dan pesanan.</p>
        </section>

        <form className="card auth-card" onSubmit={handleSubmit}>
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
    </div>
  )
}
