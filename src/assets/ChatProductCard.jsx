import { Link } from 'react-router-dom'
import { getSellerBadgeTone } from '../../utils/sellerBadge'

export default function ChatProductCard({ product, canBuy }) {
  return (
    <article className="ai-product-card">
      <div className="ai-product-thumb">
        {product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : <span>{product.category}</span>}
      </div>
      <div className="ai-product-body">
        <div>
          <span className="ai-kicker">{product.category}</span>
          <h4>{product.name}</h4>
          <p>{Number(product.priceSol).toFixed(3)} SOL</p>
        </div>
        <div className="ai-seller-line">
          <strong>{product.seller?.storeName || 'Campus Seller'}</strong>
          <span className={`badge badge-${getSellerBadgeTone(product.seller?.trust?.badge)}`}>
            {product.seller?.trust?.badge || 'New Seller'}
          </span>
        </div>
        <div className="ai-card-actions">
          <Link className="btn btn-outline btn-sm" to={`/product/${product.id}`}>View Product</Link>
          {canBuy && <Link className="btn btn-primary btn-sm" to={`/product/${product.id}`}>Buy Now</Link>}
        </div>
      </div>
    </article>
  )
}
