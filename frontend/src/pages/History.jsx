import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import EmptyState from '../components/common/EmptyState'
import ErrorState from '../components/common/ErrorState'
import LoadingState from '../components/common/LoadingState'
import StatusBadge from '../components/common/StatusBadge'
import { getProducts } from '../services/api'
import { formatDate } from '../utils/formatDate'
import { normalizeProduct } from '../utils/productUtils'
import { useLanguage } from '../context/useLanguage'

export default function History() {
  const { t } = useLanguage()
  const [products, setProducts] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadHistory() {
    try {
      setLoading(true)
      setError('')
      setProducts((await getProducts()).map(normalizeProduct))
    } catch (cause) {
      setError(cause.response?.data?.detail || cause.message || t('history.loadError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    getProducts()
      .then((data) => active && setProducts(data.map(normalizeProduct)))
      .catch((cause) => active && setError(cause.response?.data?.detail || cause.message || t('history.loadError')))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [t])

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase()
    return [...products].sort((first, second) => new Date(second.created_at || 0) - new Date(first.created_at || 0)).filter((product) => !value || `${product.name} ${product.category} ${product.subcategory}`.toLowerCase().includes(value))
  }, [products, query])

  if (loading) return <LoadingState label={t('history.loading')} />
  if (error) return <ErrorState message={error} onRetry={loadHistory} />

  return <div className="space-y-8">
    <section><p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">{t('history.eyebrow')}</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{t('history.title')}</h2><p className="mt-2 text-slate-500">{t('history.subtitle')}</p></section>
    {products.length === 0 ? <EmptyState title={t('history.empty')} description={t('history.emptyDesc')} /> : <><div className="relative max-w-xl"><Search size={17} className="absolute left-3 top-3 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('history.searchPlaceholder')} aria-label={t('history.searchAria')} className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-teal-500" /></div><div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-190 text-left text-sm"><thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-4">{t('common.product')}</th><th className="px-5 py-4">{t('common.category')}</th><th className="px-5 py-4">{t('common.aiStatus')}</th><th className="px-5 py-4">{t('common.publication')}</th><th className="px-5 py-4">{t('common.date')}</th><th /></tr></thead><tbody>{filtered.map((product) => <tr key={product.id} className="border-b border-slate-100 last:border-0"><td className="px-5 py-4 font-semibold text-slate-800">{product.name}</td><td className="px-5 py-4 text-slate-500">{product.category}<span className="block text-xs">{product.subcategory}</span></td><td className="px-5 py-4"><StatusBadge status={product.aiStatus} /></td><td className="px-5 py-4"><StatusBadge status={product.publicationStatus} /></td><td className="px-5 py-4 text-slate-500">{formatDate(product.created_at)}</td><td className="px-5 py-4"><Link to={`/reviewer/catalog/${product.id}`} className="font-semibold text-teal-700">{t('common.open')}</Link></td></tr>)}</tbody></table></div>{filtered.length === 0 && <EmptyState title={t('history.noMatch')} description={t('history.noMatchDesc')} />}</>}
  </div>
}
