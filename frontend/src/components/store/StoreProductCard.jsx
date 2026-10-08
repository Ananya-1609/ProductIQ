import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import StoreImage from './StoreImage'
import { useLanguage } from '../../context/useLanguage'

export default function StoreProductCard({ product }) {
  const { t, categoryLabel } = useLanguage()
  return <article className="store-product-card group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-teal-200 hover:shadow-lg">
    <Link to={`/store/product/${product.id}`}>
      <StoreImage src={product.image_url || product.image_preview} alt={product.name} className="store-card-image aspect-4/3 w-full" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">{categoryLabel(product.category)}</p>
            <h2 className="mt-2 truncate text-xl font-semibold text-slate-950">{product.name}</h2>
          </div>
          <ArrowUpRight size={18} className="shrink-0 text-slate-300 transition group-hover:text-teal-700" />
        </div>
        <p className="mt-2 text-sm font-medium text-slate-500">{product.subcategory}</p>
        <p className="mt-3 text-lg font-bold text-slate-950">{product.price == null ? 'Price not provided' : `Price: ${product.price}`}</p>
        {product.sizes?.length > 0 && <p className="mt-1 text-xs text-slate-500">Sizes: {product.sizes.join(', ')}</p>}
        {product.tags?.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{product.tags.slice(0, 4).map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{tag}</span>)}</div>}
        {product.description && <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-500">{product.description}</p>}
        <span className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-teal-700">{t('store.viewProduct')} <ArrowUpRight size={15} /></span>
      </div>
    </Link>
  </article>
}
