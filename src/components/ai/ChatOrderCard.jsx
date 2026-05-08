import { Link } from 'react-router-dom'
import { formatPickupStatus, getPickupStatusTone } from '../../utils/pickupCode'
import { formatPaymentMethod, formatPaymentStatus, PAID_ORDER_STATUSES } from '../../utils/paymentMethods'

export default function ChatOrderCard({ order }) {
  return (
    <article className="ai-order-card">
      <div>
        <span className="ai-kicker">{formatPaymentStatus(order.status, order.paymentMethod)}</span>
        <h4>{order.product?.name || 'Campus product'}</h4>
        <p>{order.totalAmount.toFixed(3)} SOL - {formatPaymentMethod(order.paymentMethod)}</p>
      </div>
      <div className="ai-order-grid">
        <span>Pickup</span>
        <strong className="font-mono">{order.pickupCode || '-'}</strong>
        <span>Status</span>
        <strong>
          <span className={`badge badge-${getPickupStatusTone(order.pickupStatus)}`}>
            {formatPickupStatus(order.pickupStatus)}
          </span>
        </strong>
      </div>
      <Link className="btn btn-outline btn-sm" to={`/pay/${order.invoiceId}`}>
        {PAID_ORDER_STATUSES.has(order.status) ? 'View Receipt' : 'Open Payment'}
      </Link>
    </article>
  )
}
