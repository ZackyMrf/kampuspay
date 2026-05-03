import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../components/authContext'
import { useToast } from '../components/toastContext'
import { createProduct, MARKETPLACE_CATEGORIES, uploadProductImage } from '../utils/marketplaceStorage'
import './DashboardRole.css'

const MAX_IMAGE_SIZE = 3 * 1024 * 1024

export default function CreateProductPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { seller } = useAuth()
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
      toast.error('File harus berupa gambar.')
      event.target.value = ''
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('Ukuran foto maksimal 3 MB.')
      event.target.value = ''
      return
    }

    setProductImage(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!seller?.walletAddress) {
      toast.error('Lengkapi wallet seller di profil seller sebelum membuat produk.')
      return
    }

    try {
      setSaving(true)
      const imageUrl = productImage
        ? await uploadProductImage(productImage, seller.id)
        : form.imageUrl.trim()

      await createProduct({
        sellerId: seller.id,
        name: form.name.trim(),
        description: form.description.trim(),
        priceSol: Number(form.priceSol),
        category: form.category,
        imageUrl,
        stock: Number(form.stock || 0),
        isActive: form.isActive,
      })
      toast.success('Product created.')
      navigate('/seller/products')
    } catch (error) {
      toast.error(error.message || 'Failed to create product.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <div className="container">
        <header className="role-header">
          <div>
            <span className="section-tag">Create Product</span>
            <h1>Tambah produk marketplace.</h1>
          </div>
        </header>

        <form className="card product-form-card" onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Product Name</label>
              <input className="form-input" name="name" value={form.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Price in SOL</label>
              <input className="form-input" name="priceSol" type="number" min="0.001" step="0.001" value={form.priceSol} onChange={handleChange} required />
            </div>
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" name="category" value={form.category} onChange={handleChange}>
                {MARKETPLACE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Stock</label>
              <input className="form-input" name="stock" type="number" min="0" value={form.stock} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Active</label>
              <label className="btn btn-outline" style={{ justifyContent: 'center' }}>
                <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} />
                Active product
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Foto Produk</label>
            <div className="product-image-upload">
              <div className="product-upload-preview">
                {imagePreview || form.imageUrl ? (
                  <img src={imagePreview || form.imageUrl} alt="Preview produk" />
                ) : (
                  <span>Preview</span>
                )}
              </div>
              <div className="product-upload-controls">
                <label className="btn btn-outline product-upload-button">
                  Upload foto
                  <input type="file" accept="image/*" onChange={handleImageChange} disabled={saving} />
                </label>
                <p className="form-hint">JPG, PNG, atau WebP. Maksimal 3 MB. Foto akan disimpan di Supabase Storage.</p>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Image URL Opsional</label>
            <input className="form-input" name="imageUrl" value={form.imageUrl} onChange={handleChange} placeholder="https://..." disabled={Boolean(productImage)} />
            <span className="form-hint">Dipakai kalau tidak upload foto dari perangkat.</span>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" name="description" value={form.description} onChange={handleChange} rows={4} />
          </div>

          <button className="btn btn-primary btn-lg btn-full" disabled={saving}>
            {saving ? 'Saving product...' : 'Create Product'}
          </button>
        </form>
      </div>
    </div>
  )
}
