import { ArrowRight, Package, ScanLine, Send, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import ErrorState from '../components/common/ErrorState'
import LoadingState from '../components/common/LoadingState'
import { getSellerProducts } from '../services/api'
import { normalizeProduct } from '../utils/productUtils'

export default function SellerDashboard() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { getSellerProducts().then((data) => setProducts(data.map(normalizeProduct))).catch((cause) => setError(cause.userMessage || 'Unable to load your seller workspace.')).finally(() => setLoading(false)) }, [])
  const metrics = useMemo(() => ({ total: products.length, published: products.filter((product) => product.publicationStatus === 'PUBLISHED').length, review: products.filter((product) => product.aiStatus === 'REVIEW').length }), [products])
  if (loading) return <LoadingState label="Loading seller workspace..." />
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />
  return <div className="space-y-8"><section className="seller-intro"><div><p className="seller-eyebrow">Seller workspace</p><h2>Build a better product catalog.</h2><p>Upload products and prepare accurate catalog information for reviewer approval.</p></div><Link to="/seller/add-product"><Button><ScanLine size={17} />Add product</Button></Link></section><section className="grid gap-4 sm:grid-cols-3"><Card className="p-6"><Package size={19} className="text-teal-700" /><p className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-500">Total products</p><strong className="mt-2 block text-3xl text-slate-950">{metrics.total}</strong></Card><Card className="p-6"><Send size={19} className="text-teal-700" /><p className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-500">Published</p><strong className="mt-2 block text-3xl text-slate-950">{metrics.published}</strong></Card><Card className="p-6"><ShieldCheck size={19} className="text-amber-700" /><p className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-500">Needs review</p><strong className="mt-2 block text-3xl text-slate-950">{metrics.review}</strong></Card></section><Card className="p-6"><div className="flex items-center justify-between"><div><h3 className="text-lg font-semibold text-slate-950">My products</h3><p className="mt-1 text-sm text-slate-500">Products submitted from your seller account.</p></div><Link to="/seller/products" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700">View all <ArrowRight size={15} /></Link></div>{products.length === 0 && <p className="mt-8 text-sm text-slate-500">No products yet. Add your first product to begin cataloging.</p>}</Card></div>
}
