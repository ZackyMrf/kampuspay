import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../components/authContext'
import { useToast } from '../components/toastContext'
import {
  exportOrdersAsCsv,
  exportOrdersAsJson,
  getSellerOrders,
  getSellerProducts,
} from '../utils/marketplaceStorage'
import { buildSellerTrust, getSellerBadgeTone } from '../utils/sellerBadge'
import { formatIdr, formatPaymentMethod, formatPaymentStatus, getPaymentStatusTone, PAID_ORDER_STATUSES } from '../utils/paymentMethods'
import './DashboardRole.css'

function downloadTextFile(filename, content, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function SellerDashboardPage() {
  const { profile, seller } = useAuth()
  const toast = useToast()
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!seller?.id) return
    let ignore = false
    Promise.all([getSellerProducts(seller.id), getSellerOrders(seller.id)])
      .then(([nextProducts, nextOrders]) => {
        if (!ignore) {
          setProducts(nextProducts)
          setOrders(nextOrders)
        }
      })
      .catch((error) => toast.error(error.message || 'Failed to load seller dashboard.'))
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [seller?.id, toast])

  const stats = useMemo(() => ({
    products: products.length,
    activeProducts: products.filter((product) => product.isActive).length,
    totalOrders: orders.length,
    paidOrders: orders.filter((order) => PAID_ORDER_STATUSES.has(order.status)).length,
    solanaPaidOrders: orders.filter((order) => order.status === 'paid' && order.paymentMethod === 'solana').length,
    qrisDemoOrders: orders.filter((order) => order.paymentMethod === 'qris' && order.status === 'paid_demo').length,
    cashPendingOrders: orders.filter((order) => order.status === 'cash_pending').length,
    paymentReviewOrders: orders.filter((order) => order.status === 'payment_review').length,
    pendingOrders: orders.filter((order) => !PAID_ORDER_STATUSES.has(order.status)).length,
    revenue: orders.filter((order) => order.status === 'paid' && order.paymentMethod === 'solana').reduce((sum, order) => sum + order.totalAmount, 0),
    idrRevenue: orders
      .filter((order) => ['qris', 'bank_transfer', 'cash_on_pickup'].includes(order.paymentMethod) && PAID_ORDER_STATUSES.has(order.status))
      .reduce((sum, order) => sum + Number(order.fiatAmount || order.totalAmount * 1000000), 0),
  }), [orders, products])
  const sellerTrust = useMemo(() => buildSellerTrust({
    activeProducts: stats.activeProducts,
    paidOrders: stats.paidOrders,
    totalOrders: stats.totalOrders,
  }), [stats.activeProducts, stats.paidOrders, stats.totalOrders])

  return (
    <div className="page">
      <div className="container">
        <header className="role-header">
          <div className="role-title-with-avatar">
            <div className="role-avatar">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt={profile?.full_name || 'Seller'} /> : <span>{(profile?.full_name || seller?.storeName || 'S').charAt(0).toUpperCase()}</span>}
            </div>
            <div>
              <span className="section-tag">Seller Dashboard</span>
              <h1>{seller?.storeName || 'Seller Store'}</h1>
              <p className="text-secondary">{seller?.walletAddress || profile?.wallet_address || 'Wallet penerima belum diisi.'}</p>
            </div>
          </div>
          <div className="role-actions">
            <button className="btn btn-outline" onClick={() => downloadTextFile('seller-orders.csv', exportOrdersAsCsv(orders), 'text/csv')}>Export CSV</button>
            <button className="btn btn-ghost" onClick={() => downloadTextFile('seller-orders.json', exportOrdersAsJson(orders), 'application/json')}>Export JSON</button>
            <Link to="/seller/products/create" className="btn btn-primary">Create Product</Link>
          </div>
        </header>

        <div className="dashboard-grid">
          <div className="card stat-card"><div className="stat-number">{stats.products}</div><div className="stat-label">Products</div></div>
          <div className="card stat-card"><div className="stat-number">{stats.totalOrders}</div><div className="stat-label">Orders</div></div>
          <div className="card stat-card"><div className="stat-number">{stats.solanaPaidOrders}</div><div className="stat-label">Solana paid</div></div>
          <div className="card stat-card"><div className="stat-number">{stats.revenue.toFixed(3)}</div><div className="stat-label">SOL Revenue</div></div>
        </div>

        <div className="dashboard-grid">
          <div className="card stat-card"><div className="stat-number">{stats.qrisDemoOrders}</div><div className="stat-label">QRIS demo paid</div></div>
          <div className="card stat-card"><div className="stat-number">{stats.cashPendingOrders}</div><div className="stat-label">Cash pending</div></div>
          <div className="card stat-card"><div className="stat-number">{stats.paymentReviewOrders}</div><div className="stat-label">Payment review</div></div>
          <div className="card stat-card"><div className="stat-number">{formatIdr(stats.idrRevenue)}</div><div className="stat-label">Estimated IDR revenue</div></div>
        </div>

        <section className="seller-badge-panel">
          <div>
            <span className="section-tag">Seller Trust</span>
            <h2>{sellerTrust.badge}</h2>
            <p className="text-secondary">Badge dihitung dari produk aktif dan order yang sudah dibayar.</p>
          </div>
          <span className={`badge badge-${getSellerBadgeTone(sellerTrust.badge)}`}>{sellerTrust.badge}</span>
          <div className="seller-badge-metrics">
            <div><strong>{sellerTrust.activeProducts}</strong><span>Active Products</span></div>
            <div><strong>{sellerTrust.totalOrders}</strong><span>Total Orders</span></div>
            <div><strong>{sellerTrust.paidOrders}</strong><span>Paid Orders</span></div>
            <div><strong>{sellerTrust.trustScore}%</strong><span>Trust Score</span></div>
          </div>
        </section>

        <section className="dashboard-section">
          <h2 className="mb-6">Recent orders</h2>
          {loading ? (
            <div className="card empty-state"><span className="spinner" /></div>
          ) : orders.length === 0 ? (
            <div className="card empty-state"><h3>No orders yet</h3><p className="text-secondary">Orders will appear after students checkout.</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Product</th><th>Buyer Wallet</th><th>Total</th><th>Payment</th><th>Status</th><th>Pickup</th><th>Invoice</th></tr></thead>
                <tbody>
                  {orders.slice(0, 8).map((order) => (
                    <tr key={order.id}>
                      <td>{order.product?.name || 'Product'}</td>
                      <td className="font-mono">{order.buyerWallet || '-'}</td>
                      <td>
                        {order.totalAmount.toFixed(3)} SOL
                        {order.fiatAmount ? <div className="text-muted text-sm">{formatIdr(order.fiatAmount)}</div> : null}
                      </td>
                      <td><span className="badge badge-muted">{formatPaymentMethod(order.paymentMethod)}</span></td>
                      <td><span className={`badge badge-${getPaymentStatusTone(order.status)}`}>{formatPaymentStatus(order.status, order.paymentMethod)}</span></td>
                      <td className="font-mono">{order.pickupCode || '-'}</td>
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
