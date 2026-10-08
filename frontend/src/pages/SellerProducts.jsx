import { ArrowUpRight, Image as ImageIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Card from '../components/common/Card'
import ErrorState from '../components/common/ErrorState'
import LoadingState from '../components/common/LoadingState'
import StatusBadge from '../components/common/StatusBadge'
import { getSellerProducts } from '../services/api'
import { normalizeProduct } from '../utils/productUtils'

export default function SellerProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { getSellerProducts().then((data) => setProducts(data.map(normalizeProduct))).catch((cause) => setError(cause.userMessage || 'Unable to load your products.')).finally(() => setLoading(false)) }, [])
  if (loading) return <LoadingState label="Loading your products..." />
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />
  return <div className="space-y-6"><section><p className="seller-eyebrow">Seller workspace</p><h2 className="mt-2 text-3xl font-semibold text-slate-950">My products</h2><p className="mt-2 text-slate-500">Manage products owned by your seller account.</p></section><Card className="overflow-hidden">{products.length ? <div className="divide-y divide-slate-100">{products.map((product) => <div key={product.id} className="flex items-center gap-4 px-6 py-4"><div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100 text-slate-300">{product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-cover" /> : <ImageIcon size={20} />}</div><div className="min-w-0 flex-1"><p className="truncate font-semibold text-slate-800">{product.name}</p><p className="mt-1 text-sm text-slate-500">{product.category} · {product.subcategory}</p></div><StatusBadge status={product.aiStatus} /><StatusBadge status={product.publicationStatus} /><Link to={`/seller/products/${product.id}`} className="text-teal-700" aria-label={`View ${product.name}`}><ArrowUpRight size={17} /></Link></div>)}</div> : <p className="p-8 text-sm text-slate-500">No products yet. Add a product to begin.</p>}</Card></div>
}
