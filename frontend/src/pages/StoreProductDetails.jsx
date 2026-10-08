import { ArrowLeft, LogOut, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import StoreImage from '../components/store/StoreImage'
import { useAuth } from '../context/useAuth'
import { getStoreProduct } from '../services/api'

const detailFields = [['Gender', 'gender'], ['Color', 'color'], ['Brand', 'brand'], ['Material', 'material'], ['Closure', 'closure'], ['Sole', 'sole']]

export default function StoreProductDetails() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { let active = true; getStoreProduct(id).then((data) => active && setProduct(data)).catch((cause) => active && setError(cause.response?.status === 404 ? 'This product is not available.' : 'Unable to load this product.')).finally(() => active && setLoading(false)); return () => { active = false } }, [id])
  async function handleLogout() { try { await signOut() } finally { navigate('/login', { replace: true }) } }
  if (loading) return <main className="store-shell min-h-screen"><div className="store-detail-loading">Loading product...</div></main>
  if (error || !product) return <main className="store-shell min-h-screen"><div className="store-detail-error"><p>{error || 'Product not found.'}</p><Link to="/store">Back to store</Link></div></main>
  return <main className="store-shell min-h-screen text-slate-900"><header className="store-header"><div className="store-header-inner"><Link to="/store" className="store-brand"><span className="store-brand-mark"><Sparkles size={17} /></span><span>ProductIQ</span></Link><div className="store-account"><div className="hidden text-right sm:block"><p>{user?.name || 'Buyer'}</p><span>{user?.email}</span></div><button type="button" onClick={handleLogout} aria-label="Log out" title="Log out" className="store-account-button"><LogOut size={17} /></button></div></div></header><div className="store-container store-detail-container"><Link to="/store" className="store-back-link"><ArrowLeft size={16} />Back to storefront</Link><div className="store-detail-grid"><StoreImage src={product.image_url || product.image_preview} alt={product.name} className="store-detail-image aspect-square w-full" /><section className="store-detail-copy"><p className="store-eyebrow">{product.category}</p><h1>{product.product_title || product.name}</h1><p className="store-detail-subcategory">{product.subcategory}</p><p className="text-xl font-bold text-teal-800">{product.price == null ? 'Price not provided' : `Price: ${product.price}`}</p><p className="mt-2 text-sm text-slate-600">Available sizes: {product.sizes?.length ? product.sizes.join(', ') : 'Not provided'}</p>{product.description && <p className="store-detail-description">{product.description}</p>}<dl className="store-attributes"><div><dt>Category</dt><dd>{product.category}</dd></div><div><dt>Subcategory</dt><dd>{product.subcategory}</dd></div>{detailFields.filter(([, key]) => product[key]).map(([label, key]) => <div key={key}><dt>{label}</dt><dd>{product[key]}</dd></div>)}</dl>{product.tags?.length > 0 && <div className="store-keywords"><p>Tags</p><div>{product.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div>}{product.seo_keywords?.length > 0 && <div className="store-keywords"><p>Search terms</p><div>{product.seo_keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}</div></div>}{product.keywords?.length > 0 && <div className="store-keywords"><p>Keywords</p><div>{product.keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}</div></div>}</section></div></div></main>
}
