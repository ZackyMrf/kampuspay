import { Link } from 'react-router-dom'
import { formatPickupStatus, getPickupStatusTone } from '../../utils/pickupCode'

export default function ChatOrderCard({ order }) {
  return (
    <article className="ai-order-card">
      <div>
        <span className="ai-kicker">{order.status}</span>
        <h4>{order.product?.name || 'Campus product'}</h4>
        <p>{order.totalAmount.toFixed(3)} SOL</p>
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
        {order.status === 'paid' ? 'View Receipt' : 'Open Payment'}
      </Link>
    </article>
  )
}
