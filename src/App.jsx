import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import Navbar from './components/Navbar'
import LandingPage from './pages/LandingPage'
import CreateInvoicePage from './pages/CreateInvoicePage'
import PaymentPage from './pages/PaymentPage'
import DashboardPage from './pages/DashboardPage'
import './App.css'

function PaymentRoute() {
  const { invoiceId } = useParams()
  return <PaymentPage key={invoiceId} />
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-wrapper">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/create" element={<CreateInvoicePage />} />
            <Route path="/pay/:invoiceId" element={<PaymentRoute />} />
            <Route path="/dashboard" element={<DashboardPage />} />
          </Routes>
        </main>
        <footer className="app-footer">
          <div className="container">
            <div className="footer-inner">
              <span className="footer-brand">
                KampusPay<span style={{ color: 'var(--text-muted)' }}>Lite</span>
              </span>
              <span className="footer-sep">·</span>
              <span className="text-muted text-sm">On-Chain Payment Links for Campus Life</span>
              <span className="footer-sep">·</span>
              <span className="text-muted text-sm">Solana Devnet</span>
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  )
}
