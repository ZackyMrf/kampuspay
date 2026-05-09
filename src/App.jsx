import { BrowserRouter, Navigate, Routes, Route, useParams } from 'react-router-dom'
import Navbar from './components/Navbar'
import KampusAIAssistant from './components/ai/KampusAIAssistant'
import { useAuth } from './components/authContext'
import LandingPage from './pages/LandingPage'
import CreateInvoicePage from './pages/CreateInvoicePage'
import PaymentPage from './pages/PaymentPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import MarketplacePage from './pages/MarketplacePage'
import ProductDetailPage from './pages/ProductDetailPage'
import StudentDashboardPage from './pages/StudentDashboardPage'
import SellerDashboardPage from './pages/SellerDashboardPage'
import SellerProductsPage from './pages/SellerProductsPage'
import CreateProductPage from './pages/CreateProductPage'
import SellerOrdersPage from './pages/SellerOrdersPage'
import ProfileSettingsPage from './pages/ProfileSettingsPage'
import { useI18n } from './i18n/LanguageProvider'
import './App.css'

function PaymentRoute() {
  const { invoiceId } = useParams()
  return <PaymentPage key={invoiceId} />
}

function dashboardForRole(role) {
  return role === 'seller' ? '/seller/dashboard' : '/student/dashboard'
}

function RoleGuard({ role, children }) {
  const { loading, isLoggedIn, profile } = useAuth()

  if (loading) {
    return (
      <div className="page flex-center">
        <span className="spinner" />
      </div>
    )
  }

  if (!isLoggedIn) return <Navigate to="/login" replace />
  if (profile?.role !== role) return <Navigate to={dashboardForRole(profile?.role)} replace />
  return children
}

function DashboardRedirect() {
  const { loading, isLoggedIn, profile } = useAuth()
  if (loading) return <div className="page flex-center"><span className="spinner" /></div>
  if (!isLoggedIn) return <Navigate to="/login" replace />
  return <Navigate to={dashboardForRole(profile?.role)} replace />
}

function AuthGuard({ children }) {
  const { loading, isLoggedIn } = useAuth()
  if (loading) return <div className="page flex-center"><span className="spinner" /></div>
  if (!isLoggedIn) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { t } = useI18n()

  return (
    <BrowserRouter>
      <div className="app-wrapper">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/product/:productId" element={<ProductDetailPage />} />
            <Route path="/create" element={<CreateInvoicePage />} />
            <Route path="/pay/:invoiceId" element={<PaymentRoute />} />
            <Route path="/student/dashboard" element={<RoleGuard role="student"><StudentDashboardPage /></RoleGuard>} />
            <Route path="/seller/dashboard" element={<RoleGuard role="seller"><SellerDashboardPage /></RoleGuard>} />
            <Route path="/seller/products" element={<RoleGuard role="seller"><SellerProductsPage /></RoleGuard>} />
            <Route path="/seller/products/create" element={<RoleGuard role="seller"><CreateProductPage /></RoleGuard>} />
            <Route path="/seller/products/:productId/edit" element={<RoleGuard role="seller"><CreateProductPage /></RoleGuard>} />
            <Route path="/seller/orders" element={<RoleGuard role="seller"><SellerOrdersPage /></RoleGuard>} />
            <Route path="/settings/profile" element={<AuthGuard><ProfileSettingsPage /></AuthGuard>} />
            <Route path="/dashboard" element={<DashboardRedirect />} />
            <Route path="/legacy/dashboard" element={<DashboardPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer className="app-footer">
          <div className="container">
            <div className="footer-inner">
              <span className="footer-brand">
                KampusPay<span style={{ color: 'var(--text-muted)' }}>Lite</span>
              </span>
              <span className="footer-sep">|</span>
              <span className="text-muted text-sm">{t('footer.tagline')}</span>
              <span className="footer-sep">|</span>
              <span className="text-muted text-sm">{t('footer.network')}</span>
            </div>
          </div>
        </footer>
        <KampusAIAssistant />
      </div>
    </BrowserRouter>
  )
}
