import { Link } from 'react-router-dom'
import ProfileSettings from '../components/ProfileSettings'
import { useAuth } from '../components/authContext'
import { useI18n } from '../i18n/LanguageProvider'
import './DashboardRole.css'

export default function ProfileSettingsPage() {
  const { t } = useI18n()
  const { profile } = useAuth()
  const dashboardPath = profile?.role === 'seller' ? '/seller/dashboard' : '/student/dashboard'

  return (
    <div className="page">
      <div className="container profile-settings-page">
        <header className="role-header">
          <div>
            <span className="section-tag">{t('profile.accountSettings')}</span>
            <h1>{t('profile.pageTitle')}</h1>
            <p className="text-secondary">{t('profile.pageSub')}</p>
          </div>
          <div className="role-actions">
            <Link to={dashboardPath} className="btn btn-outline">{t('profile.backDashboard')}</Link>
          </div>
        </header>

        <ProfileSettings />
      </div>
    </div>
  )
}
