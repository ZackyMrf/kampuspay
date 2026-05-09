import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../components/authContext'
import { useToast } from '../components/toastContext'
import { useI18n } from '../i18n/LanguageProvider'
import './AuthPages.css'

export default function ForgotPasswordPage() {
  const { t } = useI18n()
  const toast = useToast()
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    try {
      setLoading(true)
      await requestPasswordReset(email.trim())
      setSent(true)
      toast.success(t('auth.forgotSentToast'))
    } catch (err) {
      const message = err.message || t('auth.forgotError')
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="container auth-shell">
        <section className="auth-copy">
          <span className="section-tag">{t('auth.forgotTag')}</span>
          <h1>{t('auth.forgotTitle')}</h1>
          <p>{t('auth.forgotSub')}</p>
        </section>

        <form className="card auth-card" onSubmit={handleSubmit}>
          {sent ? (
            <div className="alert alert-success mb-6">
              <span>{t('auth.forgotSentTitle')}</span>
              <span>{t('auth.forgotSentSub')}</span>
            </div>
          ) : null}

          <div className="form-group">
            <label className="form-label">{t('auth.email')}</label>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@campus.ac.id"
              required
            />
          </div>

          {error && <div className="alert alert-error mb-6">{error}</div>}

          <button className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? t('auth.sendingReset') : t('auth.sendResetLink')}
          </button>

          <div className="auth-switch">
            <span>{t('auth.rememberPassword')}</span>
            <Link to="/login">{t('auth.loginButton')}</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
