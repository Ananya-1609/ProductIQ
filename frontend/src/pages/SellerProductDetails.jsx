import { ArrowLeft, Image as ImageIcon } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Card from '../components/common/Card'
import ErrorState from '../components/common/ErrorState'
import LoadingState from '../components/common/LoadingState'
import StatusBadge from '../components/common/StatusBadge'
import Button from '../components/common/Button'
import CatalogFieldsEditor from '../components/common/CatalogFieldsEditor'
import { getSellerProduct, updateSellerProduct } from '../services/api'
import { normalizeProduct } from '../utils/productUtils'

export default function SellerProductDetails() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [error, setError] = useState('')
  const [catalogFields, setCatalogFields] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => { getSellerProduct(id).then((data) => { const normalized = normalizeProduct(data); setProduct(normalized); setCatalogFields(data.catalog_fields || { product_title: '', price: null, sizes: [], tags: [], seo_keywords: [] }) }).catch((cause) => setError(cause.userMessage || 'Unable to load this product.')) }, [id])
  async function saveFields() {
    setSaving(true); setError(''); setMessage('')
    try {
      const updated = await updateSellerProduct(id, product.analysis || {}, product.aiStatus, catalogFields)
      const normalized = normalizeProduct(updated)
      setProduct(normalized); setCatalogFields(updated.catalog_fields); setMessage('Catalog fields saved.')
    } catch (cause) { setError(cause.userMessage || cause.response?.data?.detail || 'Unable to save catalog fields.') }
    finally { setSaving(false) }
  }
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />
  if (!product) return <LoadingState label="Loading product..." />
  const analysis = product.analysis || {}
  return <div className="space-y-6"><Link to="/seller/products" className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700"><ArrowLeft size={16} />My products</Link><Card className="p-6"><div className="flex flex-col gap-6 sm:flex-row"><div className="grid aspect-square w-full max-w-xs place-items-center overflow-hidden rounded-2xl bg-slate-100 text-slate-300">{product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" /> : <ImageIcon size={32} />}</div><div><p className="text-xs font-bold uppercase tracking-wider text-teal-700">{product.category}</p><h2 className="mt-2 text-3xl font-semibold text-slate-950">{catalogFields?.product_title || product.name}</h2><div className="mt-4 flex flex-wrap gap-2"><StatusBadge status={product.aiStatus} /><StatusBadge status={product.publicationStatus} /></div>{analysis.description?.value && <p className="mt-6 max-w-xl text-sm leading-7 text-slate-600">{analysis.description.value}</p>}<p className="mt-6 text-sm text-slate-500">This product is submitted to the ProductIQ reviewer workflow. Publication decisions remain with reviewers.</p></div></div></Card><CatalogFieldsEditor value={catalogFields || product.catalog_fields} onChange={setCatalogFields} title="Edit product listing" />{error && <p role="alert" className="text-sm text-rose-700">{error}</p>}{message && <p role="status" className="text-sm text-emerald-700">{message}</p>}<div className="flex justify-end"><Button onClick={saveFields} disabled={saving}>{saving ? 'Saving…' : 'Save product fields'}</Button></div></div>
}
