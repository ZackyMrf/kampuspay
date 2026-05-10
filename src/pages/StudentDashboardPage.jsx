import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import { useAuth } from '../components/authContext'
import { useToast } from '../components/toastContext'
import { shortenAddress } from '../hooks/useWallet'
import { cancelOrderByInvoice, getStudentOrders } from '../utils/marketplaceStorage'
import { getOrCreateChatThread } from '../utils/chatStorage'
import { getExplorerUrl } from '../utils/solana'
import { formatPickupStatus, getPickupStatusTone } from '../utils/pickupCode'
import { CANCELLABLE_ORDER_STATUSES, formatIdr, formatPaymentMethod, formatPaymentStatus, getPaymentStatusTone, PAID_ORDER_STATUSES } from '../utils/paymentMethods'
import { useI18n } from '../i18n/LanguageProvider'
import './DashboardRole.css'

export default function StudentDashboardPage() {
  const { t } = useI18n()
  const { profile, user } = useAuth()
  const navigate = useNavigate()
  const { publicKey } = useWallet()
  const toast = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState(null)
  const [openingChatId, setOpeningChatId] = useState(null)

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
    paid: orders.filter((order) => PAID_ORDER_STATUSES.has(order.status)).length,
    pending: orders.filter((order) => !PAID_ORDER_STATUSES.has(order.status)).length,
    amount: orders.filter((order) => order.status === 'paid' && order.paymentMethod === 'solana').reduce((sum, order) => sum + order.totalAmount, 0),
  }), [orders])

  const cancelOrder = async (order) => {
    const confirmed = window.confirm('Batalkan order ini? Status transaksi akan berubah menjadi cancelled.')
    if (!confirmed) return

    try {
      setCancellingId(order.id)
      const { order: cancelledOrder } = await cancelOrderByInvoice(order.invoiceId)
      setOrders((current) => current.map((item) => item.id === order.id ? cancelledOrder : item))
      toast.success('Order berhasil dibatalkan.')
    } catch (error) {
      toast.error(error.message || 'Gagal membatalkan order.')
    } finally {
      setCancellingId(null)
    }
  }

  const openOrderChat = async (order) => {
    try {
      setOpeningChatId(order.id)
      const thread = await getOrCreateChatThread({
        productId: order.productId,
        orderId: order.id,
        studentId: user.id,
        sellerId: order.sellerId,
      })
      navigate(`/chats/${thread.id}`)
    } catch (error) {
      toast.error(error.message || 'Gagal membuka chat.')
    } finally {
      setOpeningChatId(null)
    }
  }

  return (
    <div className="page">
      <div className="container">
        <header className="role-header">
          <div className="role-title-with-avatar">
            <div className="role-avatar">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt={profile?.full_name || 'Student'} /> : <span>{(profile?.full_name || 'S').charAt(0).toUpperCase()}</span>}
            </div>
            <div>
              <span className="section-tag">{t('dashboard.studentTag')}</span>
              <h1>{t('dashboard.hello', { name: profile?.full_name || t('auth.student') })}</h1>
              <p className="text-secondary">
                Wallet: {publicKey ? shortenAddress(publicKey.toString()) : profile?.wallet_address || t('dashboard.notConnected')}
              </p>
            </div>
          </div>
          <div className="role-actions">
            <Link to="/marketplace" className="btn btn-primary">{t('dashboard.openMarketplace')}</Link>
          </div>
        </header>

        <div className="dashboard-grid">
          <div className="card stat-card"><div className="stat-number">{stats.total}</div><div className="stat-label">{t('dashboard.totalPayments')}</div></div>
          <div className="card stat-card"><div className="stat-number">{stats.paid}</div><div className="stat-label">{t('dashboard.paidInvoices')}</div></div>
          <div className="card stat-card"><div className="stat-number">{stats.pending}</div><div className="stat-label">{t('dashboard.pendingInvoices')}</div></div>
          <div className="card stat-card"><div className="stat-number">{stats.amount.toFixed(3)}</div><div className="stat-label">{t('dashboard.solSpent')}</div></div>
        </div>

        <section className="dashboard-section">
          <h2 className="mb-6">{t('dashboard.recentPayments')}</h2>
          {loading ? (
            <div className="card empty-state"><span className="spinner" /></div>
          ) : orders.length === 0 ? (
            <div className="card empty-state">
              <h3>{t('dashboard.noPurchases')}</h3>
              <p className="text-secondary">{t('dashboard.noPurchasesSub')}</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>{t('dashboard.product')}</th><th>{t('dashboard.total')}</th><th>{t('dashboard.payment')}</th><th>{t('dashboard.status')}</th><th>{t('dashboard.pickupCode')}</th><th>{t('dashboard.pickupStatus')}</th><th>{t('dashboard.transaction')}</th><th>{t('dashboard.action')}</th></tr></thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.product?.name || t('dashboard.product')}<div className="text-muted text-sm">{t('dashboard.item', { count: order.quantity })}</div></td>
                      <td>
                        {order.totalAmount.toFixed(3)} SOL
                        {order.fiatAmount ? <div className="text-muted text-sm">{formatIdr(order.fiatAmount)}</div> : null}
                      </td>
                      <td>
                        <span className="badge badge-muted">{formatPaymentMethod(order.paymentMethod)}</span>
                        {['qris', 'bank_transfer'].includes(order.paymentMethod) && (
                          <div className="text-muted text-sm">{order.paymentProofUrl ? t('dashboard.proofUploaded') : t('dashboard.noProofUploaded')}</div>
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
                          <Link to={`/pay/${order.invoiceId}`} className="btn btn-outline btn-sm">{t('dashboard.open')}</Link>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => openOrderChat(order)}
                            disabled={openingChatId === order.id}
                          >
                            {openingChatId === order.id ? 'Opening...' : 'Chat Seller'}
                          </button>
                          {CANCELLABLE_ORDER_STATUSES.has(order.status) && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => cancelOrder(order)}
                              disabled={cancellingId === order.id}
                            >
                              {cancellingId === order.id ? t('dashboard.cancelling') : t('dashboard.cancelOrder')}
                            </button>
                          )}
                        </div>
                      </td>
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
