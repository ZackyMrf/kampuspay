import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/authContext'
import { useToast } from '../components/toastContext'
import PasswordInput from '../components/PasswordInput'
import { useI18n } from '../i18n/LanguageProvider'
import { supabase } from '../utils/supabaseClient'
import './AuthPages.css'

export default function ResetPasswordPage() {
  const { t } = useI18n()
  const toast = useToast()
  const navigate = useNavigate()
  const { updatePassword } = useAuth()
  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [preparingSession, setPreparingSession] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false

    async function prepareRecoverySession() {
      try {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const code = new URLSearchParams(window.location.search).get('code')

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (sessionError) throw sessionError
          window.history.replaceState(null, '', window.location.pathname)
        } else if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) throw exchangeError
          window.history.replaceState(null, '', window.location.pathname)
        } else {
          const { data, error: getSessionError } = await supabase.auth.getSession()
          if (getSessionError) throw getSessionError
          if (!data.session) throw new Error(t('auth.resetMissingSession'))
        }
      } catch (err) {
        if (!ignore) setError(err.message || t('auth.resetMissingSession'))
      } finally {
        if (!ignore) setPreparingSession(false)
      }
    }

    prepareRecoverySession()

    return () => {
      ignore = true
    }
  }, [t])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (form.password.length < 6) {
      setError(t('auth.passwordMinError'))
      return
    }

    if (form.password !== form.confirmPassword) {
      setError(t('auth.passwordMatchError'))
      return
    }

    try {
      setLoading(true)
      await updatePassword(form.password)
      toast.success(t('auth.resetSuccessToast'))
      navigate('/login', { replace: true })
    } catch (err) {
      const message = err.message || t('auth.resetError')
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
          <span className="section-tag">{t('auth.resetTag')}</span>
          <h1>{t('auth.resetTitle')}</h1>
          <p>{t('auth.resetSub')}</p>
        </section>

        <form className="card auth-card" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('auth.newPassword')}</label>
            <PasswordInput
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              showLabel={t('auth.showPassword')}
              hideLabel={t('auth.hidePassword')}
              minLength={6}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('auth.confirmPassword')}</label>
            <PasswordInput
              value={form.confirmPassword}
              onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
              showLabel={t('auth.showPassword')}
              hideLabel={t('auth.hidePassword')}
              minLength={6}
              required
            />
          </div>

          {error && <div className="alert alert-error mb-6">{error}</div>}

          <button className="btn btn-primary btn-full btn-lg" disabled={loading || preparingSession}>
            {preparingSession
              ? t('auth.preparingReset')
              : loading
                ? t('auth.updatingPassword')
                : t('auth.updatePassword')}
          </button>

          <div className="auth-switch">
            <span>{t('auth.needNewLink')}</span>
            <Link to="/forgot-password">{t('auth.sendAgain')}</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
