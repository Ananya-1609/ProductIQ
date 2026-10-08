import { ArrowRight, ArrowUpRight, BrainCircuit, CheckCircle2, ClipboardCheck, Image as ImageIcon, ScanLine, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import EmptyState from '../components/common/EmptyState'
import ErrorState from '../components/common/ErrorState'
import LoadingState from '../components/common/LoadingState'
import StatusBadge from '../components/common/StatusBadge'
import { useAuth } from '../context/useAuth'
import { useLanguage } from '../context/useLanguage'
import { getProducts } from '../services/api'
import { formatDate } from '../utils/formatDate'
import { normalizeProduct } from '../utils/productUtils'

function MetricCard({ label, value, detail, icon: Icon, tone, href }) {
  const card = <Card className={`min-h-32 p-5 sm:p-6 ${href ? 'transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">{label}</p>
        <span className={`grid size-10 place-items-center rounded-xl ${tone}`}><Icon size={18} /></span>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </Card>
  return href ? <Link to={href} className="block" aria-label={label}>{card}</Link> : card
}

function ProductThumbnail({ product }) {
  const image = product.image_url || product.image
  return <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100 text-slate-300">{image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <ImageIcon size={21} />}</div>
}

function RecentProducts({ products }) {
  const { t } = useLanguage()
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">{t('dashboard.recentTitle')}</p><p className="mt-1 text-sm text-slate-500">{t('dashboard.recentSubtitle')}</p></div>
        <Link to="/reviewer/catalog" className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-teal-700">{t('dashboard.viewCatalog')} <ArrowRight size={16} /></Link>
      </div>
      {products.length ? <div className="overflow-x-auto"><table className="w-full min-w-180 text-left"><thead className="border-b border-slate-100 bg-slate-50/70"><tr className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400"><th className="px-6 py-3">{t('common.product')}</th><th className="px-4 py-3">{t('common.category')}</th><th className="px-4 py-3">{t('common.aiStatus')}</th><th className="px-4 py-3">{t('common.publication')}</th><th className="px-4 py-3">{t('common.date')}</th><th className="px-6 py-3 text-right">{t('common.action')}</th></tr></thead><tbody className="divide-y divide-slate-100">{products.map((product) => <tr key={product.id} className="transition hover:bg-teal-50/30"><td className="px-6 py-4"><Link to={`/reviewer/catalog/${product.id}`} className="flex items-center gap-3"><ProductThumbnail product={product} /><span className="min-w-0"><span className="block max-w-52 truncate text-sm font-semibold text-slate-800">{product.name}</span><span className="mt-1 block text-xs text-slate-500">{product.subcategory}</span></span></Link></td><td className="px-4 py-4 text-sm text-slate-600">{product.category}</td><td className="px-4 py-4"><StatusBadge status={product.aiStatus} /></td><td className="px-4 py-4"><StatusBadge status={product.publicationStatus} /></td><td className="px-4 py-4 text-sm text-slate-500">{formatDate(product.created_at)}</td><td className="px-6 py-4 text-right"><Link to={`/reviewer/catalog/${product.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700">{t('dashboard.viewLink')} <ArrowUpRight size={15} /></Link></td></tr>)}</tbody></table></div> : <EmptyState title={t('dashboard.noProducts')} description={t('dashboard.noProductsDesc')} action={<Link to="/reviewer/analyze"><Button>{t('dashboard.analyzeAProduct')}</Button></Link>} />}
    </Card>
  )
}

function NeedsAttention({ products }) {
  const { t } = useLanguage()
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 px-6 py-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">{t('dashboard.needsAttentionTitle')}</p><h3 className="mt-1 text-lg font-semibold text-slate-950">{t('dashboard.needsAttentionSubtitle')}</h3></div>
      {products.length ? <div className="divide-y divide-slate-100">{products.map((product) => <div key={product.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center"><ProductThumbnail product={product} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{product.name}</p><p className="mt-1 text-sm text-slate-500">{product.category}</p></div><StatusBadge status={product.aiStatus} /><Link to={`/reviewer/catalog/${product.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700">{t('dashboard.reviewLink')} <ArrowRight size={15} /></Link></div>)}</div> : <div className="flex items-center gap-3 px-6 py-5 text-sm text-slate-500"><CheckCircle2 size={18} className="text-emerald-600" />{t('dashboard.allClear')}</div>}
    </Card>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadProducts() {
    try {
      setLoading(true)
      setError('')
      setProducts((await getProducts()).map(normalizeProduct))
    } catch (cause) {
      setError(cause.userMessage || cause.response?.data?.detail || cause.message || 'Unable to load dashboard data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    getProducts()
      .then((data) => active && setProducts(data.map(normalizeProduct)))
      .catch((cause) => active && setError(cause.userMessage || cause.response?.data?.detail || cause.message || 'Unable to load dashboard data.'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  const metrics = useMemo(() => ({
    total: products.length,
    accepted: products.filter((product) => product.aiStatus === 'ACCEPT').length,
    review: products.filter((product) => product.aiStatus === 'REVIEW').length,
    published: products.filter((product) => product.publicationStatus === 'PUBLISHED').length,
  }), [products])

  const recentProducts = [...products].sort((first, second) => new Date(second.created_at || 0) - new Date(first.created_at || 0)).slice(0, 5)
  const needsAttention = products.filter((product) => product.aiStatus === 'REVIEW')
  const acceptedDetail = metrics.total ? t('dashboard.acceptedDetail', { percent: ((metrics.accepted / metrics.total) * 100).toFixed(1) }) : t('dashboard.acceptedDetailEmpty')

  if (loading) return <LoadingState label={t('dashboard.loading')} />
  if (error) return <ErrorState message={error} onRetry={loadProducts} />

  return <div className="space-y-8">
    <section className="flex flex-col justify-between gap-5 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">{t('dashboard.eyebrow')}</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{t('dashboard.greeting', { name: user?.name?.split(' ')[0] || t('dashboard.reviewerFallback') })}</h2><p className="mt-3 text-base text-slate-500">{t('dashboard.subtitle')}</p></div><Link to="/reviewer/analyze"><Button className="reviewer-dashboard-cta"><ScanLine size={17} />{t('dashboard.analyzeCta')}</Button></Link></section>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label={t('dashboard.totalProducts')} value={metrics.total} detail={t('dashboard.totalProductsDetail')} icon={ImageIcon} tone="bg-slate-100 text-slate-700" /><MetricCard label={t('dashboard.aiAccepted')} value={metrics.accepted} detail={acceptedDetail} icon={BrainCircuit} tone="bg-emerald-50 text-emerald-700" /><MetricCard label={t('common.needsReview')} value={metrics.review} detail={t('dashboard.needsReviewDetail')} icon={ClipboardCheck} tone="bg-amber-50 text-amber-700" href="/reviewer/catalog" /><MetricCard label={t('status.PUBLISHED')} value={metrics.published} detail={t('dashboard.publishedDetail')} icon={Send} tone="bg-teal-50 text-teal-700" /></section>
    <NeedsAttention products={needsAttention} />
    <RecentProducts products={recentProducts} />
  </div>
}
