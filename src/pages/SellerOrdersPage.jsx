import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../components/authContext'
import { useToast } from '../components/toastContext'
import { getSellerOrders } from '../utils/marketplaceStorage'
import { shortenAddress } from '../hooks/useWallet'
import { getExplorerUrl } from '../utils/solana'
import './DashboardRole.css'

export default function SellerOrdersPage() {
  const { seller } = useAuth()
  const toast = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!seller?.id) return
    let ignore = false
    getSellerOrders(seller.id)
      .then((data) => {
        if (!ignore) setOrders(data)
      })
      .catch((error) => toast.error(error.message || 'Failed to load orders.'))
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [seller?.id, toast])

  return (
    <div className="page">
      <div className="container">
        <header className="role-header">
          <div>
            <span className="section-tag">Seller Orders</span>
            <h1>Pesanan lapak.</h1>
          </div>
        </header>

        {loading ? (
          <div className="card empty-state"><span className="spinner" /></div>
        ) : orders.length === 0 ? (
          <div className="card empty-state"><h3>No orders yet</h3><p className="text-secondary">Checkout dari student akan muncul di sini.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Product</th><th>Buyer Wallet</th><th>Qty</th><th>Total</th><th>Status</th><th>Transaction</th><th>Date</th></tr></thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td><Link to={`/product/${order.productId}`}>{order.product?.name || 'Product'}</Link></td>
                    <td className="font-mono">{order.buyerWallet ? shortenAddress(order.buyerWallet) : '-'}</td>
                    <td>{order.quantity}</td>
                    <td>{order.totalAmount.toFixed(3)} SOL</td>
                    <td><span className={`badge ${order.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>{order.status}</span></td>
                    <td>
                      {order.invoice?.transaction_signature ? (
                        <a href={getExplorerUrl(order.invoice.transaction_signature)} target="_blank" rel="noopener noreferrer" className="tx-link">
                          {shortenAddress(order.invoice.transaction_signature)}
                        </a>
                      ) : '-'}
                    </td>
                    <td>{new Date(order.createdAt).toLocaleDateString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
