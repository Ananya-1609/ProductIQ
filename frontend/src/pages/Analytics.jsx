import { useEffect, useMemo, useState } from 'react'
import Card from '../components/common/Card'
import EmptyState from '../components/common/EmptyState'
import ErrorState from '../components/common/ErrorState'
import LoadingState from '../components/common/LoadingState'
import StatusBadge from '../components/common/StatusBadge'
import StatCard from '../components/dashboard/StatCard'
import { getProducts } from '../services/api'
import { getProductConfidence, normalizeProduct } from '../utils/productUtils'

function Distribution({ title, values, total }) {
  return <Card className="p-6"><h3 className="font-semibold text-slate-950">{title}</h3><div className="mt-5 space-y-4">{Object.entries(values).map(([label, count]) => <div key={label}><div className="flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2"><StatusBadge status={label} /><span className="text-slate-500">{count} {count === 1 ? 'product' : 'products'}</span></span><span className="font-semibold text-slate-700">{total ? Math.round((count / total) * 100) : 0}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-600" style={{ width: `${total ? (count / total) * 100 : 0}%` }} /></div></div>)}</div></Card>
}

export default function Analytics() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadAnalytics() {
    try {
      setLoading(true)
      setError('')
      setProducts((await getProducts()).map(normalizeProduct))
    } catch (cause) {
      setError(cause.response?.data?.detail || cause.message || 'Unable to load analytics.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    getProducts()
      .then((data) => active && setProducts(data.map(normalizeProduct)))
      .catch((cause) => active && setError(cause.response?.data?.detail || cause.message || 'Unable to load analytics.'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  const data = useMemo(() => {
    const categories = {}
    const aiStatuses = { ACCEPT: 0, REVIEW: 0, UNKNOWN: 0 }
    const publicationStatuses = { DRAFT: 0, PENDING_REVIEW: 0, APPROVED: 0, REJECTED: 0, PUBLISHED: 0 }
    products.forEach((product) => { categories[product.category] = (categories[product.category] || 0) + 1; aiStatuses[product.aiStatus] = (aiStatuses[product.aiStatus] || 0) + 1; publicationStatuses[product.publicationStatus] = (publicationStatuses[product.publicationStatus] || 0) + 1 })
    const confidenceValues = products.map(getProductConfidence).filter(Boolean)
    return { categories, aiStatuses, publicationStatuses, averageConfidence: confidenceValues.length ? Math.round((confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length) * 100) : 0 }
  }, [products])

  if (loading) return <LoadingState label="Calculating catalog analytics..." />
  if (error) return <ErrorState message={error} onRetry={loadAnalytics} />
  if (!products.length) return <><section><p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">Operational view</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Analytics</h2></section><EmptyState title="No analytics yet" description="Analytics will appear after products are analyzed and stored." /></>

  return <div className="space-y-8"><section><p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">Operational view</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Analytics</h2><p className="mt-2 text-slate-500">Calculated from the persisted ProductIQ catalog.</p></section><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Products analyzed" value={products.length} detail="All persisted records" /><StatCard label="Published" value={data.publicationStatuses.PUBLISHED} detail="Publication status" /><StatCard label="Needs review" value={data.aiStatuses.REVIEW} detail="AI status" /><StatCard label="Average confidence" value={data.averageConfidence ? `${data.averageConfidence}%` : '—'} detail="Populated AI fields" /></section><section className="grid gap-5 lg:grid-cols-3"><Distribution title="By category" values={data.categories} total={products.length} /><Distribution title="AI status" values={data.aiStatuses} total={products.length} /><Distribution title="Publication status" values={data.publicationStatuses} total={products.length} /></section></div>
}