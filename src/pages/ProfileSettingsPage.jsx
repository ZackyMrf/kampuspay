import { Link } from 'react-router-dom'
import ProfileSettings from '../components/ProfileSettings'
import { useAuth } from '../components/authContext'
import './DashboardRole.css'

export default function ProfileSettingsPage() {
  const { profile } = useAuth()
  const dashboardPath = profile?.role === 'seller' ? '/seller/dashboard' : '/student/dashboard'

  return (
    <div className="page">
      <div className="container profile-settings-page">
        <header className="role-header">
          <div>
            <span className="section-tag">Account Settings</span>
            <h1>Setting profil</h1>
            <p className="text-secondary">Kelola nama, wallet, dan foto profil akun KampusPay.</p>
          </div>
          <div className="role-actions">
            <Link to={dashboardPath} className="btn btn-outline">Back to Dashboard</Link>
          </div>
        </header>

        <ProfileSettings />
      </div>
    </div>
  )
}
