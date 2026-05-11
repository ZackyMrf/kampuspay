import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/LanguageProvider'
import './StudentHomePage.css'

export default function StudentHomePage() {
  const { t } = useI18n()

  return (
    <div className="page student-page">
      <div className="container">
        <section className="student-hero">
          <div>
            <span className="section-tag">{t('studentHome.tag')}</span>
            <h1>{t('studentHome.title')}</h1>
            <p>{t('studentHome.sub')}</p>
            <div className="student-actions">
              <Link to="/marketplace" className="btn btn-primary btn-lg">{t('dashboard.openMarketplace')}</Link>
            </div>
          </div>

          <div className="student-info">
            <div className="student-info-row">
              <span>Role</span>
              <strong>{t('auth.student')}</strong>
            </div>
            <div className="student-info-row">
              <span>{t('studentHome.access')}</span>
              <strong>Marketplace & Payment</strong>
            </div>
            <div className="student-info-row muted">
              <span>Dashboard Admin</span>
              <strong>{t('studentHome.inactive')}</strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
