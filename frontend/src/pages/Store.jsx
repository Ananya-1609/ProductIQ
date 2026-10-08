import { LogOut, Search, SlidersHorizontal, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StoreProductCard from '../components/store/StoreProductCard'
import { useAuth } from '../context/useAuth'
import { getStoreProducts } from '../services/api'

const categoryLabels = ['Clothing', 'Footwear', 'Accessories', 'Bags']

export default function Store() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [products, setProducts] = useState([])
  const [categoryProducts, setCategoryProducts] = useState([])
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('newest')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { getStoreProducts().then(setCategoryProducts).catch(() => setCategoryProducts([])) }, [])
  useEffect(() => {
    let active = true
    getStoreProducts({ query, category, sort }).then((data) => { if (active) { setProducts(data); setError('') } }).catch(() => active && setError('Unable to load the storefront right now.')).finally(() => active && setLoading(false))
    return () => { active = false }
  }, [query, category, sort])

  const categories = useMemo(() => {
    const available = new Set(categoryProducts.map((product) => product.category?.toLowerCase()))
    return categoryLabels.filter((label) => available.has(label.toLowerCase()))
  }, [categoryProducts])

  async function handleLogout() { try { await signOut() } finally { navigate('/login', { replace: true }) } }
  function submitSearch(event) { event.preventDefault(); setLoading(true); setError(''); setQuery(searchInput.trim()) }
  function selectCategory(nextCategory) { setLoading(true); setError(''); setCategory(nextCategory) }
  function selectSort(event) { setLoading(true); setError(''); setSort(event.target.value) }

  return <main className="store-shell min-h-screen text-slate-900">
    <header className="store-header"><div className="store-header-inner"><div className="store-brand"><span className="store-brand-mark"><Sparkles size={17} /></span><span>ProductIQ</span></div><form onSubmit={submitSearch} className="store-search"><Search size={18} /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search products, brands, categories" aria-label="Search products" /></form><div className="store-account"><div className="hidden text-right sm:block"><p>{user?.name || 'Buyer'}</p><span>{user?.email}</span></div><button type="button" onClick={handleLogout} aria-label="Log out" title="Log out" className="store-account-button"><LogOut size={17} /></button></div></div></header>
    <div className="store-container">
      <section className="store-hero"><p className="store-eyebrow">ProductIQ storefront</p><h1>SMARTER PRODUCTS. SIMPLER SHOPPING.</h1><p>Discover published products organized with AI-powered catalog intelligence.</p></section>
      <section className="store-toolbar"><div className="store-categories"><span>Browse by category</span><button type="button" onClick={() => selectCategory('')} className={!category ? 'store-pill store-pill-active' : 'store-pill'}>All</button>{categories.map((label) => <button type="button" key={label} onClick={() => selectCategory(category.toLowerCase() === label.toLowerCase() ? '' : label)} className={category.toLowerCase() === label.toLowerCase() ? 'store-pill store-pill-active' : 'store-pill'}>{label}</button>)}</div><label className="store-sort"><SlidersHorizontal size={16} /><span>Sort</span><select value={sort} onChange={selectSort}><option value="newest">Newest</option></select></label></section>
      <section className="store-results"><div className="store-results-heading"><p>{!loading && !error ? `${products.length} published ${products.length === 1 ? 'product' : 'products'}` : 'Published products'}</p></div>{loading && <div className="store-loading"><span /><span /><span /></div>}{!loading && error && <div className="store-state store-state-error" role="alert">{error}</div>}{!loading && !error && products.length === 0 && <div className="store-state"><h2>No published products yet.</h2><p>Try another category or check back soon.</p></div>}{!loading && !error && products.length > 0 && <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{products.map((product) => <StoreProductCard key={product.id} product={product} />)}</div>}</section>
    </div>
  </main>
}
