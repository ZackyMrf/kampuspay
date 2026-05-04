import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import { useAuth } from '../components/authContext'
import { useToast } from '../components/toastContext'
import {
  createProductCheckout,
  getActiveProducts,
  MARKETPLACE_CATEGORIES,
} from '../utils/marketplaceStorage'
import { getSellerBadgeTone } from '../utils/sellerBadge'
import './MarketplacePage.css'

export default function MarketplacePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { publicKey, connected } = useWallet()
  const { isLoggedIn, role, user } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('All')
  const [buyingId, setBuyingId] = useState(null)

  useEffect(() => {
    let ignore = false
    getActiveProducts()
      .then((data) => {
        if (!ignore) setProducts(data)
      })
      .catch((error) => toast.error(error.message || 'Failed to load marketplace.'))
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [toast])

  const filteredProducts = useMemo(() => (
    category === 'All' ? products : products.filter((product) => product.category === category)
  ), [category, products])

  const buyNow = async (product) => {
    if (!isLoggedIn || role !== 'student') {
      toast.info('Login sebagai student untuk membeli produk.')
      navigate('/login')
      return
    }

    if (!connected || !publicKey) {
      toast.error('Connect wallet dulu sebelum checkout.')
      return
    }

    if (!product.seller?.walletAddress) {
      toast.error('Seller belum memasang wallet penerima.')
      return
    }

    try {
      setBuyingId(product.id)
      const { invoice } = await createProductCheckout({
        product,
        buyerUserId: user.id,
        buyerWallet: publicKey.toString(),
        quantity: 1,
      })
      toast.success('Invoice checkout dibuat.')
      navigate(`/pay/${invoice.id}`)
    } catch (error) {
      toast.error(error.message || 'Checkout failed.')
    } finally {
      setBuyingId(null)
    }
  }

  return (
    <div className="page marketplace-page">
      <div className="container">
        <div className="market-hero">
          <div>
            <span className="section-tag">Campus Marketplace</span>
            <h1 className="market-title">Lapak kampus untuk makanan, event, merch, jasa, dan donasi.</h1>
            <p className="market-sub">
              Browse produk seller kampus, buat invoice otomatis, dan bayar menggunakan Solana Devnet.
            </p>
          </div>
          <div className="market-summary">
            <div className="market-summary-card"><span>Active products</span><strong>{products.length}</strong></div>
            <div className="market-summary-card"><span>Categories</span><strong>{MARKETPLACE_CATEGORIES.length}</strong></div>
            <div className="market-summary-card"><span>Network</span><strong>Devnet</strong></div>
          </div>
        </div>

        <div className="market-filter-row">
          {['All', ...MARKETPLACE_CATEGORIES].map((item) => (
            <button
              key={item}
              className={`btn btn-sm ${category === item ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="empty-state card">
            <div className="spinner" />
            <h3>Loading marketplace</h3>
            <p className="text-secondary">Fetching active products from Supabase.</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-icon">0</div>
            <h3>No active products</h3>
            <p className="text-secondary">Try another category or ask sellers to add products.</p>
          </div>
        ) : (
          <div className="market-grid">
            {filteredProducts.map((product) => (
              <article className="market-card" key={product.id}>
                <div className="product-image-wrap">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} />
                  ) : (
                    <div className="product-image-fallback">{product.category}</div>
                  )}
                </div>
                <div className="market-card-top">
                  <span className="market-category">{product.category}</span>
                  <span className="market-featured">{product.stock} stock</span>
                </div>
                <h2>{product.name}</h2>
                <p>{product.description || 'Campus marketplace product.'}</p>
                <div className="market-meta">
                  <div className="market-seller-trust">
                    <strong>{product.seller?.storeName || 'Campus Seller'}</strong>
                    <span className={`badge badge-${getSellerBadgeTone(product.seller?.trust?.badge)}`}>
                      {product.seller?.trust?.badge || 'New Seller'}
                    </span>
                    <small>Trust Score: {product.seller?.trust?.trustScore || 0}%</small>
                  </div>
                  <span>{Number(product.priceSol).toFixed(3)} SOL</span>
                </div>
                <div className="market-card-bottom">
                  <strong>{Number(product.priceSol).toFixed(3)} SOL</strong>
                  <div className="market-actions-inline">
                    <Link className="btn btn-outline btn-sm" to={`/product/${product.id}`}>View detail</Link>
                    <button className="btn btn-primary btn-sm" onClick={() => buyNow(product)} disabled={buyingId === product.id}>
                      {buyingId === product.id ? 'Creating...' : 'Buy now'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
