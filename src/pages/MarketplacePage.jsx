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
import { useI18n } from '../i18n/LanguageProvider'
import './MarketplacePage.css'

export default function MarketplacePage() {
  const { t } = useI18n()
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
            <span className="section-tag">{t('market.tag')}</span>
            <h1 className="market-title">{t('market.title')}</h1>
            <p className="market-sub">
              {t('market.sub')}
            </p>
          </div>
          <div className="market-summary">
            <div className="market-summary-card"><span>{t('market.activeProducts')}</span><strong>{products.length}</strong></div>
            <div className="market-summary-card"><span>{t('market.categories')}</span><strong>{MARKETPLACE_CATEGORIES.length}</strong></div>
            <div className="market-summary-card"><span>{t('market.network')}</span><strong>Devnet</strong></div>
          </div>
        </div>

        <div className="market-filter-row">
          {['All', ...MARKETPLACE_CATEGORIES].map((item) => (
            <button
              key={item}
              className={`btn btn-sm ${category === item ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setCategory(item)}
            >
              {item === 'All' ? t('market.all') : item}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="empty-state card">
            <div className="spinner" />
            <h3>{t('market.loadingTitle')}</h3>
            <p className="text-secondary">{t('market.loadingSub')}</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-icon">0</div>
            <h3>{t('market.emptyTitle')}</h3>
            <p className="text-secondary">{t('market.emptySub')}</p>
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
                  <span className="market-featured">{t('market.stock', { count: product.stock })}</span>
                </div>
                <h2>{product.name}</h2>
                <p>{product.description || t('market.defaultProduct')}</p>
                <div className="market-meta">
                  <div className="market-seller-trust">
                    <strong>{product.seller?.storeName || t('market.campusSeller')}</strong>
                    <span className={`badge badge-${getSellerBadgeTone(product.seller?.trust?.badge)}`}>
                      {product.seller?.trust?.badge || t('market.newSeller')}
                    </span>
                    <small>{t('market.trustScore', { score: product.seller?.trust?.trustScore || 0 })}</small>
                  </div>
                  <span>{Number(product.priceSol).toFixed(3)} SOL</span>
                </div>
                <div className="market-card-bottom">
                  <strong>{Number(product.priceSol).toFixed(3)} SOL</strong>
                  <div className="market-actions-inline">
                    <Link className="btn btn-outline btn-sm" to={`/product/${product.id}`}>{t('market.viewDetail')}</Link>
                    <button className="btn btn-primary btn-sm" onClick={() => buyNow(product)} disabled={buyingId === product.id}>
                      {buyingId === product.id ? t('market.creating') : t('market.buyNow')}
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
