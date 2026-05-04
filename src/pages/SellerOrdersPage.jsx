import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../components/authContext'
import { useToast } from '../components/toastContext'
import { getSellerOrders, getSellerTrustSummary, updateOrderPickupStatus } from '../utils/marketplaceStorage'
import { shortenAddress } from '../hooks/useWallet'
import { getExplorerUrl } from '../utils/solana'
import { formatPickupStatus, getPickupStatusTone } from '../utils/pickupCode'
import { getSellerBadgeTone } from '../utils/sellerBadge'
import './DashboardRole.css'

export default function SellerOrdersPage() {
  const { seller } = useAuth()
  const toast = useToast()
  const [orders, setOrders] = useState([])
  const [sellerTrust, setSellerTrust] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)

  useEffect(() => {
    if (!seller?.id) return
    let ignore = false
    Promise.all([getSellerOrders(seller.id), getSellerTrustSummary(seller.id)])
      .then(([nextOrders, nextTrust]) => {
        if (!ignore) {
          setOrders(nextOrders)
          setSellerTrust(nextTrust)
        }
      })
      .catch((error) => toast.error(error.message || 'Failed to load orders.'))
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [seller?.id, toast])

  const markPickedUp = async (orderId) => {
    try {
      setUpdatingId(orderId)
      const updatedOrder = await updateOrderPickupStatus(orderId, 'picked_up')
      setOrders((current) => current.map((order) => order.id === orderId ? updatedOrder : order))
      toast.success('Pickup status updated.')
    } catch (error) {
      toast.error(error.message || 'Failed to update pickup status.')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="page">
      <div className="container">
        <header className="role-header">
          <div>
            <span className="section-tag">Seller Orders</span>
            <h1>Pesanan lapak.</h1>
            {sellerTrust && (
              <p className="text-secondary">
                <span className={`badge badge-${getSellerBadgeTone(sellerTrust.badge)}`}>{sellerTrust.badge}</span>{' '}
                Trust Score: {sellerTrust.trustScore}%
              </p>
            )}
          </div>
        </header>

        {loading ? (
          <div className="card empty-state"><span className="spinner" /></div>
        ) : orders.length === 0 ? (
          <div className="card empty-state"><h3>No orders yet</h3><p className="text-secondary">Checkout dari student akan muncul di sini.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Order</th><th>Product</th><th>Buyer Wallet</th><th>Total</th><th>Status</th><th>Pickup Code</th><th>Pickup Status</th><th>Transaction</th><th>Action</th></tr></thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="font-mono">{shortenAddress(order.id)}</td>
                    <td><Link to={`/product/${order.productId}`}>{order.product?.name || 'Product'}</Link></td>
                    <td className="font-mono">{order.buyerWallet ? shortenAddress(order.buyerWallet) : '-'}</td>
                    <td>{order.totalAmount.toFixed(3)} SOL<div className="text-muted text-sm">{order.quantity} item</div></td>
                    <td><span className={`badge ${order.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>{order.status}</span></td>
                    <td className="font-mono">{order.pickupCode || '-'}</td>
                    <td><span className={`badge badge-${getPickupStatusTone(order.pickupStatus)}`}>{formatPickupStatus(order.pickupStatus)}</span></td>
                    <td>
                      {order.transactionSignature ? (
                        <a href={getExplorerUrl(order.transactionSignature)} target="_blank" rel="noopener noreferrer" className="tx-link">
                          {shortenAddress(order.transactionSignature)}
                        </a>
                      ) : '-'}
                    </td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => markPickedUp(order.id)}
                        disabled={order.status !== 'paid' || order.pickupStatus === 'picked_up' || updatingId === order.id}
                      >
                        {updatingId === order.id ? 'Updating...' : 'Mark as Picked Up'}
                      </button>
                    </td>
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
