import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import { useAuth } from '../components/authContext'
import { useToast } from '../components/toastContext'
import { shortenAddress } from '../hooks/useWallet'
import { getStudentOrders } from '../utils/marketplaceStorage'
import './DashboardRole.css'

export default function StudentDashboardPage() {
  const { profile, user } = useAuth()
  const { publicKey } = useWallet()
  const toast = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    getStudentOrders(user.id)
      .then((data) => {
        if (!ignore) setOrders(data)
      })
      .catch((error) => toast.error(error.message || 'Failed to load student dashboard.'))
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [toast, user.id])

  const stats = useMemo(() => ({
    total: orders.length,
    paid: orders.filter((order) => order.status === 'paid').length,
    pending: orders.filter((order) => order.status !== 'paid').length,
    amount: orders.filter((order) => order.status === 'paid').reduce((sum, order) => sum + order.totalAmount, 0),
  }), [orders])

  return (
    <div className="page">
      <div className="container">
        <header className="role-header">
          <div>
            <span className="section-tag">Student Dashboard</span>
            <h1>Halo, {profile?.full_name || 'Student'}.</h1>
            <p className="text-secondary">
              Wallet: {publicKey ? shortenAddress(publicKey.toString()) : profile?.wallet_address || 'Not connected'}
            </p>
          </div>
          <div className="role-actions">
            <Link to="/marketplace" className="btn btn-primary">Open Marketplace</Link>
          </div>
        </header>

        <div className="dashboard-grid">
          <div className="card stat-card"><div className="stat-number">{stats.total}</div><div className="stat-label">Total payments</div></div>
          <div className="card stat-card"><div className="stat-number">{stats.paid}</div><div className="stat-label">Paid invoices</div></div>
          <div className="card stat-card"><div className="stat-number">{stats.pending}</div><div className="stat-label">Pending invoices</div></div>
          <div className="card stat-card"><div className="stat-number">{stats.amount.toFixed(3)}</div><div className="stat-label">SOL spent</div></div>
        </div>

        <section className="dashboard-section">
          <h2 className="mb-6">Recent payments</h2>
          {loading ? (
            <div className="card empty-state"><span className="spinner" /></div>
          ) : orders.length === 0 ? (
            <div className="card empty-state">
              <h3>No purchases yet</h3>
              <p className="text-secondary">Browse marketplace and buy your first campus item.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Product</th><th>Quantity</th><th>Total</th><th>Status</th><th>Invoice</th></tr></thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.product?.name || 'Product'}</td>
                      <td>{order.quantity}</td>
                      <td>{order.totalAmount.toFixed(3)} SOL</td>
                      <td><span className={`badge ${order.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>{order.status}</span></td>
                      <td><Link to={`/pay/${order.invoiceId}`} className="btn btn-outline btn-sm">Open</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
