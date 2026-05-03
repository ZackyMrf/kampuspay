import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import { useAuth } from '../components/authContext'
import { useToast } from '../components/toastContext'
import { createProductCheckout, getProductById } from '../utils/marketplaceStorage'
import './MarketplacePage.css'

export default function ProductDetailPage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { publicKey, connected } = useWallet()
  const { isLoggedIn, role, user } = useAuth()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [checkingOut, setCheckingOut] = useState(false)

  useEffect(() => {
    let ignore = false
    getProductById(productId)
      .then((data) => {
        if (!ignore) setProduct(data)
      })
      .catch((error) => toast.error(error.message || 'Product not found.'))
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [productId, toast])

  const handleBuy = async () => {
    if (!product) return
    if (!isLoggedIn || role !== 'student') {
      toast.info('Login sebagai student untuk checkout.')
      navigate('/login')
      return
    }
    if (!connected || !publicKey) {
      toast.error('Connect wallet dulu sebelum checkout.')
      return
    }
    if (!product.seller?.walletAddress) {
      toast.error('Seller wallet belum tersedia.')
      return
    }

    try {
      setCheckingOut(true)
      const { invoice } = await createProductCheckout({
        product,
        buyerUserId: user.id,
        buyerWallet: publicKey.toString(),
        quantity,
      })
      toast.success('Invoice checkout dibuat.')
      navigate(`/pay/${invoice.id}`)
    } catch (error) {
      toast.error(error.message || 'Checkout failed.')
    } finally {
      setCheckingOut(false)
    }
  }

  if (loading) return <div className="page flex-center"><span className="spinner" /></div>

  if (!product) {
    return (
      <div className="page flex-center flex-col gap-4">
        <h2>Product not found</h2>
        <Link to="/marketplace" className="btn btn-primary">Back to Marketplace</Link>
      </div>
    )
  }

  const maxQty = Math.max(1, product.stock)

  return (
    <div className="page">
      <div className="container">
        <Link to="/marketplace" className="back-link">Back to marketplace</Link>
        <div className="card product-detail-card">
          <div className="product-image-wrap product-detail-image">
            {product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : <div className="product-image-fallback">{product.category}</div>}
          </div>
          <div>
            <span className="market-category">{product.category}</span>
            <h1 className="market-section-title">{product.name}</h1>
            <p className="text-secondary">{product.description || 'Campus marketplace product.'}</p>
            <div className="divider" />
            <div className="invoice-details">
              <div className="detail-row"><span className="detail-label">Seller</span><strong>{product.seller?.storeName || 'Campus Seller'}</strong></div>
              <div className="detail-row"><span className="detail-label">Price</span><strong>{Number(product.priceSol).toFixed(3)} SOL</strong></div>
              <div className="detail-row"><span className="detail-label">Stock</span><span>{product.stock}</span></div>
            </div>
            <div className="form-group mt-6">
              <label className="form-label">Quantity</label>
              <input className="form-input" type="number" min="1" max={maxQty} value={quantity} onChange={(event) => setQuantity(Math.min(maxQty, Math.max(1, Number(event.target.value))))} />
            </div>
            <button className="btn btn-primary btn-lg btn-full" onClick={handleBuy} disabled={checkingOut || product.stock <= 0}>
              {checkingOut ? 'Creating invoice...' : `Buy Now - ${(product.priceSol * quantity).toFixed(3)} SOL`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
