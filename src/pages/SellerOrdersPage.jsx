import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/authContext'
import { useToast } from '../components/toastContext'
import {
  confirmReviewPaymentByOrder,
  getSellerOrders,
  getSellerTrustSummary,
  markCashOrderPaidAndPickedUp,
  rejectReviewPaymentByOrder,
  setLocalSellerOrderReadAt,
  subscribeToSellerOrderChanges,
  updateOrderPickupStatus,
} from '../utils/marketplaceStorage'
import { getOrCreateChatThread } from '../utils/chatStorage'
import { shortenAddress } from '../hooks/useWallet'
import { getExplorerUrl } from '../utils/solana'
import { formatPickupStatus, getPickupStatusTone } from '../utils/pickupCode'
import { getSellerBadgeTone } from '../utils/sellerBadge'
import { formatIdr, formatPaymentMethod, formatPaymentStatus, getPaymentStatusTone, PAID_ORDER_STATUSES } from '../utils/paymentMethods'
import { useI18n } from '../i18n/LanguageProvider'
import './DashboardRole.css'

export default function SellerOrdersPage() {
  const { t } = useI18n()
  const { seller } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [sellerTrust, setSellerTrust] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [openingChatId, setOpeningChatId] = useState(null)

  useEffect(() => {
    if (!seller?.id) return
    let ignore = false
    const loadOrders = ({ showNewOrderToast = false } = {}) => {
      Promise.all([getSellerOrders(seller.id), getSellerTrustSummary(seller.id)])
        .then(([nextOrders, nextTrust]) => {
          if (!ignore) {
            setOrders(nextOrders)
            setSellerTrust(nextTrust)
            setLocalSellerOrderReadAt(seller.id)
            if (showNewOrderToast) toast.info(t('toast.newOrder'))
          }
        })
        .catch((error) => toast.error(error.message || 'Failed to load orders.'))
        .finally(() => {
          if (!ignore) setLoading(false)
        })
    }

    loadOrders()

    const unsubscribe = subscribeToSellerOrderChanges(seller.id, ({ eventType }) => {
      loadOrders({ showNewOrderToast: eventType === 'INSERT' })
    })

    return () => {
      ignore = true
      unsubscribe()
    }
  }, [seller?.id, t, toast])

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

  const confirmReviewPayment = async (orderId, method) => {
    try {
      setUpdatingId(orderId)
      const updatedOrder = await confirmReviewPaymentByOrder(orderId)
      setOrders((current) => current.map((order) => order.id === orderId ? updatedOrder : order))
      toast.success(`${method === 'qris' ? 'QRIS' : 'Bank transfer'} payment confirmed as Paid Demo.`)
    } catch (error) {
      toast.error(error.message || 'Seller confirmation failed.')
    } finally {
      setUpdatingId(null)
    }
  }

  const rejectReviewPayment = async (orderId) => {
    try {
      setUpdatingId(orderId)
      const updatedOrder = await rejectReviewPaymentByOrder(orderId)
      setOrders((current) => current.map((order) => order.id === orderId ? updatedOrder : order))
      toast.success('Payment review rejected.')
    } catch (error) {
      toast.error(error.message || 'Failed to reject payment.')
    } finally {
      setUpdatingId(null)
    }
  }

  const confirmCashPickup = async (orderId) => {
    try {
      setUpdatingId(orderId)
      const updatedOrder = await markCashOrderPaidAndPickedUp(orderId)
      setOrders((current) => current.map((order) => order.id === orderId ? updatedOrder : order))
      toast.success('Cash payment marked as paid and picked up.')
    } catch (error) {
      toast.error(error.message || 'Seller confirmation failed.')
    } finally {
      setUpdatingId(null)
    }
  }

  const openOrderChat = async (order) => {
    try {
      setOpeningChatId(order.id)
      const thread = await getOrCreateChatThread({
        productId: order.productId,
        orderId: order.id,
        studentId: order.buyerUserId,
        sellerId: seller.id,
      })
      navigate(`/chats/${thread.id}`)
    } catch (error) {
      toast.error(error.message || t('chat.openFailed'))
    } finally {
      setOpeningChatId(null)
    }
  }

  return (
    <div className="page">
      <div className="container">
        <header className="role-header">
          <div>
            <span className="section-tag">{t('sellerOrders.tag')}</span>
            <h1>{t('sellerOrders.title')}</h1>
            {sellerTrust && (
              <p className="text-secondary">
                <span className={`badge badge-${getSellerBadgeTone(sellerTrust.badge)}`}>{sellerTrust.badge}</span>{' '}
                {t('product.trustScore')}: {sellerTrust.trustScore}%
              </p>
            )}
          </div>
        </header>

        {loading ? (
          <div className="card empty-state"><span className="spinner" /></div>
        ) : orders.length === 0 ? (
          <div className="card empty-state"><h3>{t('dashboard.noOrders')}</h3><p className="text-secondary">{t('dashboard.noOrdersSub')}</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>{t('sellerOrders.order')}</th><th>{t('dashboard.product')}</th><th>{t('dashboard.buyerWallet')}</th><th>{t('dashboard.total')}</th><th>{t('dashboard.payment')}</th><th>{t('dashboard.status')}</th><th>{t('dashboard.pickupCode')}</th><th>{t('dashboard.pickupStatus')}</th><th>{t('dashboard.transaction')}</th><th>{t('dashboard.action')}</th></tr></thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="font-mono">{shortenAddress(order.id)}</td>
                    <td><Link to={`/product/${order.productId}`}>{order.product?.name || t('dashboard.product')}</Link></td>
                    <td className="font-mono">{order.buyerWallet ? shortenAddress(order.buyerWallet) : '-'}</td>
                    <td>
                      {order.totalAmount.toFixed(3)} SOL
                      {order.fiatAmount ? <div className="text-muted text-sm">{formatIdr(order.fiatAmount)}</div> : null}
                      <div className="text-muted text-sm">{t('dashboard.item', { count: order.quantity })}</div>
                    </td>
                    <td>
                      <span className="badge badge-muted">{formatPaymentMethod(order.paymentMethod)}</span>
                      {order.paymentProofUrl && (
                        <div className="text-sm mt-4">
                          <a href={order.paymentProofUrl} target="_blank" rel="noopener noreferrer" className="tx-link">{t('sellerOrders.proof')}</a>
                        </div>
                      )}
                    </td>
                    <td><span className={`badge badge-${getPaymentStatusTone(order.status)}`}>{formatPaymentStatus(order.status, order.paymentMethod)}</span></td>
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
                      <div className="order-actions">
                        {order.status === 'payment_review' && (
                          <>
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => confirmReviewPayment(order.id, order.paymentMethod)}
                              disabled={updatingId === order.id}
                            >
                              {updatingId === order.id ? t('sellerOrders.confirming') : t('sellerOrders.confirmPayment', { method: formatPaymentMethod(order.paymentMethod) })}
                            </button>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => rejectReviewPayment(order.id)}
                              disabled={updatingId === order.id}
                            >
                              {t('sellerOrders.rejectPayment')}
                            </button>
                          </>
                        )}
                        {order.status === 'cash_pending' && (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => confirmCashPickup(order.id)}
                            disabled={updatingId === order.id}
                          >
                            {updatingId === order.id ? t('sellerOrders.updating') : t('sellerOrders.markPaidPickedUp')}
                          </button>
                        )}
                        {order.status !== 'payment_review' && order.status !== 'cash_pending' && (
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => markPickedUp(order.id)}
                            disabled={!PAID_ORDER_STATUSES.has(order.status) || order.pickupStatus === 'picked_up' || updatingId === order.id}
                          >
                            {updatingId === order.id ? t('sellerOrders.updating') : t('sellerOrders.markPickedUp')}
                          </button>
                        )}
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => openOrderChat(order)}
                          disabled={!order.buyerUserId || openingChatId === order.id}
                        >
                          {openingChatId === order.id ? t('chat.opening') : t('chat.chatBuyer')}
                        </button>
                      </div>
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
