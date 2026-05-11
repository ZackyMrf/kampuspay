import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import { useAuth } from '../components/authContext'
import { useToast } from '../components/toastContext'
import { createProductCheckout, getProductById } from '../utils/marketplaceStorage'
import { getOrCreateChatThread } from '../utils/chatStorage'
import { getSellerBadgeTone } from '../utils/sellerBadge'
import { useI18n } from '../i18n/LanguageProvider'
import './MarketplacePage.css'

export default function ProductDetailPage() {
  const { t } = useI18n()
  const { productId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { publicKey, connected } = useWallet()
  const { isLoggedIn, role, user } = useAuth()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [checkingOut, setCheckingOut] = useState(false)
  const [startingChat, setStartingChat] = useState(false)

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
      toast.info(t('product.loginStudentCheckout'))
      navigate('/login')
      return
    }
    if (!product.seller?.walletAddress) {
      toast.error(t('product.sellerWalletMissing'))
      return
    }

    try {
      setCheckingOut(true)
      const { invoice } = await createProductCheckout({
        product,
        buyerUserId: user.id,
        buyerWallet: connected && publicKey ? publicKey.toString() : '',
        quantity,
      })
      toast.success(t('product.checkoutCreated'))
      navigate(`/pay/${invoice.id}`)
    } catch (error) {
      toast.error(error.message || 'Checkout failed.')
    } finally {
      setCheckingOut(false)
    }
  }

  const handleChatSeller = async () => {
    if (!product) return
    if (!isLoggedIn || role !== 'student') {
      toast.info(t('product.loginStudentChat'))
      navigate('/login')
      return
    }

    try {
      setStartingChat(true)
      const thread = await getOrCreateChatThread({
        productId: product.id,
        studentId: user.id,
        sellerId: product.sellerId,
      })
      navigate(`/chats/${thread.id}`)
    } catch (error) {
      toast.error(error.message || t('chat.openSellerFailed'))
    } finally {
      setStartingChat(false)
    }
  }

  if (loading) return <div className="page flex-center"><span className="spinner" /></div>

  if (!product) {
    return (
      <div className="page flex-center flex-col gap-4">
        <h2>{t('product.notFound')}</h2>
        <Link to="/marketplace" className="btn btn-primary">{t('product.backMarketplace')}</Link>
      </div>
    )
  }

  const maxQty = Math.max(1, product.stock)
  const sellerTrust = product.seller?.trust

  return (
    <div className="page">
      <div className="container">
        <Link to="/marketplace" className="back-link">{t('product.backToMarketplace')}</Link>
        <div className="card product-detail-card">
          <div className="product-image-wrap product-detail-image">
            {product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : <div className="product-image-fallback">{product.category}</div>}
          </div>
          <div>
            <span className="market-category">{product.category}</span>
            <h1 className="market-section-title">{product.name}</h1>
            <p className="text-secondary">{product.description || t('market.defaultProduct')}</p>
            <div className="divider" />
            <div className="invoice-details">
              <div className="detail-row"><span className="detail-label">{t('product.seller')}</span><strong>{product.seller?.storeName || t('market.campusSeller')}</strong></div>
              <div className="detail-row"><span className="detail-label">{t('product.price')}</span><strong>{Number(product.priceSol).toFixed(3)} SOL</strong></div>
              <div className="detail-row"><span className="detail-label">{t('product.stock')}</span><span>{product.stock}</span></div>
            </div>
            <div className="seller-trust-card mt-6">
              <div>
                <span className="detail-label">{t('product.sellerTrust')}</span>
                <h2>{product.seller?.storeName || t('market.campusSeller')}</h2>
              </div>
              <span className={`badge badge-${getSellerBadgeTone(sellerTrust?.badge)}`}>
                {sellerTrust?.badge || t('market.newSeller')}
              </span>
              <div className="seller-trust-grid">
                <div><strong>{sellerTrust?.paidOrders || 0}</strong><span>{t('product.paidOrders')}</span></div>
                <div><strong>{sellerTrust?.trustScore || 0}%</strong><span>{t('product.trustScore')}</span></div>
                <div><strong>{sellerTrust?.activeProducts || 0}</strong><span>{t('product.activeProducts')}</span></div>
              </div>
            </div>
            <div className="form-group mt-6">
              <label className="form-label">{t('product.quantity')}</label>
              <input className="form-input" type="number" min="1" max={maxQty} value={quantity} onChange={(event) => setQuantity(Math.min(maxQty, Math.max(1, Number(event.target.value))))} />
            </div>
            <button className="btn btn-primary btn-lg btn-full" onClick={handleBuy} disabled={checkingOut || product.stock <= 0}>
              {checkingOut ? t('product.creatingInvoice') : t('product.buyNowAmount', { amount: (product.priceSol * quantity).toFixed(3) })}
            </button>
            <button className="btn btn-outline btn-lg btn-full mt-4" onClick={handleChatSeller} disabled={startingChat}>
              {startingChat ? t('chat.opening') : t('chat.chatSeller')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
