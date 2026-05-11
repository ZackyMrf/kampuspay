import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../components/authContext'
import { useToast } from '../components/toastContext'
import {
  createProduct,
  getProductById,
  MARKETPLACE_CATEGORIES,
  updateProduct,
  uploadProductImage,
} from '../utils/marketplaceStorage'
import { useI18n } from '../i18n/LanguageProvider'
import './DashboardRole.css'

const MAX_IMAGE_SIZE = 3 * 1024 * 1024

export default function CreateProductPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { productId } = useParams()
  const toast = useToast()
  const { seller } = useAuth()
  const isEditMode = Boolean(productId)
  const [loadingProduct, setLoadingProduct] = useState(Boolean(productId))
  const [saving, setSaving] = useState(false)
  const [productImage, setProductImage] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [form, setForm] = useState({
    name: '',
    description: '',
    priceSol: '',
    category: 'Food',
    imageUrl: '',
    stock: '1',
    isActive: true,
  })

  useEffect(() => {
    if (!productId || !seller?.id) return

    let ignore = false
    getProductById(productId)
      .then((product) => {
        if (ignore) return
        if (!product || product.sellerId !== seller.id) {
          toast.error(t('sellerProducts.notFoundOwned'))
          navigate('/seller/products', { replace: true })
          return
        }

        setForm({
          name: product.name || '',
          description: product.description || '',
          priceSol: String(product.priceSol || ''),
          category: product.category || 'Food',
          imageUrl: product.imageUrl || '',
          stock: String(product.stock ?? 0),
          isActive: product.isActive,
        })
      })
      .catch((error) => toast.error(error.message || 'Failed to load product.'))
      .finally(() => {
        if (!ignore) setLoadingProduct(false)
      })

    return () => {
      ignore = true
    }
  }, [navigate, productId, seller?.id, t, toast])

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleImageChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      setProductImage(null)
      setImagePreview('')
      return
    }

    if (!file.type.startsWith('image/')) {
      toast.error(t('sellerProducts.imageTypeError'))
      event.target.value = ''
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error(t('sellerProducts.imageSizeError'))
      event.target.value = ''
      return
    }

    setProductImage(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!seller?.walletAddress) {
      toast.error(t('sellerProducts.walletRequired'))
      return
    }

    try {
      setSaving(true)
      const imageUrl = productImage
        ? await uploadProductImage(productImage, seller.id)
        : form.imageUrl.trim()

      const payload = {
        sellerId: seller.id,
        name: form.name.trim(),
        description: form.description.trim(),
        priceSol: Number(form.priceSol),
        category: form.category,
        imageUrl,
        stock: Number(form.stock || 0),
        isActive: form.isActive,
      }

      if (isEditMode) {
        await updateProduct(productId, payload)
        toast.success(t('sellerProducts.updated'))
      } else {
        await createProduct(payload)
        toast.success(t('sellerProducts.created'))
      }

      navigate('/seller/products')
    } catch (error) {
      toast.error(error.message || `Failed to ${isEditMode ? 'update' : 'create'} product.`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <div className="container">
        <header className="role-header">
          <div>
            <span className="section-tag">{isEditMode ? t('sellerProducts.editTag') : t('sellerProducts.createTag')}</span>
            <h1>{isEditMode ? t('sellerProducts.editTitle') : t('sellerProducts.createTitle')}</h1>
          </div>
          <div className="role-actions">
            <Link to="/seller/products" className="btn btn-outline">{t('sellerProducts.back')}</Link>
          </div>
        </header>

        {loadingProduct ? (
          <div className="card empty-state"><span className="spinner" /></div>
        ) : (
        <form className="card product-form-card" onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">{t('sellerProducts.productName')}</label>
              <input className="form-input" name="name" value={form.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">{t('sellerProducts.priceSol')}</label>
              <input className="form-input" name="priceSol" type="number" min="0.001" step="0.001" value={form.priceSol} onChange={handleChange} required />
            </div>
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">{t('sellerProducts.category')}</label>
              <select className="form-select" name="category" value={form.category} onChange={handleChange}>
                {MARKETPLACE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t('sellerProducts.stock')}</label>
              <input className="form-input" name="stock" type="number" min="0" value={form.stock} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('sellerProducts.active')}</label>
              <label className="btn btn-outline" style={{ justifyContent: 'center' }}>
                <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} />
                {t('sellerProducts.activeProduct')}
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('sellerProducts.photo')}</label>
            <div className="product-image-upload">
              <div className="product-upload-preview">
                {imagePreview || form.imageUrl ? (
                  <img src={imagePreview || form.imageUrl} alt={t('sellerProducts.previewAlt')} />
                ) : (
                  <span>Preview</span>
                )}
              </div>
              <div className="product-upload-controls">
                <label className="btn btn-outline product-upload-button">
                  {t('sellerProducts.uploadPhoto')}
                  <input type="file" accept="image/*" onChange={handleImageChange} disabled={saving} />
                </label>
                <p className="form-hint">{t('sellerProducts.photoHint')}</p>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('sellerProducts.optionalImageUrl')}</label>
            <input className="form-input" name="imageUrl" value={form.imageUrl} onChange={handleChange} placeholder="https://..." disabled={Boolean(productImage)} />
            <span className="form-hint">{t('sellerProducts.optionalImageHint')}</span>
          </div>

          <div className="form-group">
            <label className="form-label">{t('sellerProducts.description')}</label>
            <textarea className="form-textarea" name="description" value={form.description} onChange={handleChange} rows={4} />
          </div>

          <button className="btn btn-primary btn-lg btn-full" disabled={saving}>
            {saving ? t('sellerProducts.saving') : isEditMode ? t('sellerProducts.update') : t('sellerProducts.create')}
          </button>
        </form>
        )}
      </div>
    </div>
  )
}
