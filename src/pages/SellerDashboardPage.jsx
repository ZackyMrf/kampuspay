import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import { useAuth } from '../components/authContext'
import { useToast } from '../components/toastContext'
import {
  exportOrdersAsCsv,
  exportOrdersAsJson,
  getSellerOrders,
  getSellerProducts,
  updateSellerProfile,
} from '../utils/marketplaceStorage'
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
  const { seller, refreshProfile } = useAuth()
  const { publicKey } = useWallet()
  const toast = useToast()
  const walletInputRef = useRef(null)
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingWallet, setSavingWallet] = useState(false)

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

  const saveWallet = async () => {
    if (!seller?.id) return
    try {
      setSavingWallet(true)
      await updateSellerProfile(seller.id, { walletAddress: walletInputRef.current?.value.trim() || '' })
      await refreshProfile()
      toast.success('Seller wallet saved.')
    } catch (error) {
      toast.error(error.message || 'Failed to save seller wallet.')
    } finally {
      setSavingWallet(false)
    }
  }

  const stats = useMemo(() => ({
    products: products.length,
    totalOrders: orders.length,
    paidOrders: orders.filter((order) => order.status === 'paid').length,
    pendingOrders: orders.filter((order) => order.status !== 'paid').length,
    revenue: orders.filter((order) => order.status === 'paid').reduce((sum, order) => sum + order.totalAmount, 0),
  }), [orders, products])

  return (
    <div className="page">
      <div className="container">
        <header className="role-header">
          <div>
            <span className="section-tag">Seller Dashboard</span>
            <h1>{seller?.storeName || 'Seller Store'}</h1>
            <p className="text-secondary">{seller?.walletAddress || 'Wallet penerima belum diisi.'}</p>
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
          <div className="card stat-card"><div className="stat-number">{stats.paidOrders}</div><div className="stat-label">Paid</div></div>
          <div className="card stat-card"><div className="stat-number">{stats.revenue.toFixed(3)}</div><div className="stat-label">SOL Revenue</div></div>
        </div>

        <section className="card dashboard-section">
          <div className="flex-between gap-4" style={{ alignItems: 'end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 360px' }}>
              <label className="form-label">Wallet Penerima Seller</label>
              <input
                key={seller?.id}
                ref={walletInputRef}
                className="form-input font-mono"
                defaultValue={seller?.walletAddress || ''}
                placeholder="Solana wallet address untuk menerima pembayaran"
              />
            </div>
            <div className="role-actions">
              {publicKey && (
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    if (walletInputRef.current) walletInputRef.current.value = publicKey.toString()
                  }}
                >
                  Use connected wallet
                </button>
              )}
              <button className="btn btn-primary" onClick={saveWallet} disabled={savingWallet}>
                {savingWallet ? 'Saving...' : 'Save Wallet'}
              </button>
            </div>
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
                <thead><tr><th>Product</th><th>Buyer Wallet</th><th>Total</th><th>Status</th><th>Invoice</th></tr></thead>
                <tbody>
                  {orders.slice(0, 8).map((order) => (
                    <tr key={order.id}>
                      <td>{order.product?.name || 'Product'}</td>
                      <td className="font-mono">{order.buyerWallet || '-'}</td>
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
