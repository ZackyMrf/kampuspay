import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../components/authContext'
import { useToast } from '../components/toastContext'
import { deleteProduct, getSellerProducts, updateProduct } from '../utils/marketplaceStorage'
import './DashboardRole.css'

export default function SellerProductsPage() {
  const { seller } = useAuth()
  const toast = useToast()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const loadProducts = async () => {
    const data = await getSellerProducts(seller.id)
    setProducts(data)
  }

  useEffect(() => {
    if (!seller?.id) return
    let ignore = false
    getSellerProducts(seller.id)
      .then((data) => {
        if (!ignore) setProducts(data)
      })
      .catch((error) => toast.error(error.message || 'Failed to load products.'))
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [seller?.id, toast])

  const toggleProduct = async (product) => {
    try {
      await updateProduct(product.id, { isActive: !product.isActive })
      await loadProducts()
      toast.success('Product updated.')
    } catch (error) {
      toast.error(error.message || 'Failed to update product.')
    }
  }

  const removeProduct = async (product) => {
    try {
      await deleteProduct(product.id)
      setProducts((current) => current.filter((item) => item.id !== product.id))
      toast.success('Product deleted.')
    } catch (error) {
      toast.error(error.message || 'Failed to delete product.')
    }
  }

  return (
    <div className="page">
      <div className="container">
        <header className="role-header">
          <div>
            <span className="section-tag">Seller Products</span>
            <h1>Kelola produk lapak.</h1>
          </div>
          <Link to="/seller/products/create" className="btn btn-primary">Create Product</Link>
        </header>

        {loading ? (
          <div className="card empty-state"><span className="spinner" /></div>
        ) : products.length === 0 ? (
          <div className="card empty-state"><h3>No products yet</h3><p className="text-secondary">Create your first product for the marketplace.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Product</th><th>Price</th><th>Category</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td><strong>{product.name}</strong><div className="text-muted text-sm">{product.description}</div></td>
                    <td>{product.priceSol.toFixed(3)} SOL</td>
                    <td>{product.category}</td>
                    <td>{product.stock}</td>
                    <td><span className={`badge ${product.isActive ? 'badge-success' : 'badge-muted'}`}>{product.isActive ? 'active' : 'inactive'}</span></td>
                    <td>
                      <div className="role-actions">
                        <Link className="btn btn-outline btn-sm" to={`/seller/products/${product.id}/edit`}>Edit</Link>
                        <button className="btn btn-outline btn-sm" onClick={() => toggleProduct(product)}>{product.isActive ? 'Deactivate' : 'Activate'}</button>
                        <button className="btn btn-danger btn-sm" onClick={() => removeProduct(product)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
