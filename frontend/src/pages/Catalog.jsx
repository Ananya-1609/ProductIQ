import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { getProducts } from '../services/api'
import { normalizeProduct } from '../utils/productUtils'
import { useLanguage } from '../context/useLanguage'

import CatalogToolbar from '../components/catalog/CatalogToolbar'
import FilterBar from '../components/catalog/FilterBar'
import ProductGrid from '../components/catalog/ProductGrid'
import ProductTable from '../components/catalog/ProductTable'
import SearchBar from '../components/catalog/SearchBar'


function getConfidence(product) {

  const analysis = product.analysis || {}

  const confidenceValues = Object.values(analysis)
    .filter(
      (field) =>
        field &&
        typeof field === 'object' &&
        typeof field.confidence === 'number' &&
        field.value !== null &&
        field.value !== undefined &&
        String(field.value).trim() !== ''
    )
    .map((field) => field.confidence)

  if (!confidenceValues.length) {
    return 0
  }

  const average =
    confidenceValues.reduce(
      (sum, value) => sum + value,
      0
    ) / confidenceValues.length

  return average
}


function transformProduct(product) {
  const normalized = normalizeProduct(product)
  return { ...normalized, status: normalized.aiStatus, updatedAt: product.updated_at, confidence: getConfidence(product) }
}


export default function Catalog() {
  const { t } = useLanguage()

  const [products, setProducts] = useState([])

  const [query, setQuery] = useState('')

  const [status, setStatus] = useState('ALL')

  const [publicationStatus, setPublicationStatus] = useState('ALL')

  const [sort, setSort] = useState('newest')

  const [table, setTable] = useState(false)

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState('')


  // ============================================================
  // LOAD PRODUCTS
  // ============================================================

  useEffect(() => {

    let active = true

    async function loadProducts() {

      setLoading(true)
      setError('')

      try {

        const data = await getProducts()

        if (active) {
          setProducts(
            data.map(transformProduct)
          )
        }

      } catch (cause) {

        if (active) {
          setError(
            cause.message ||
            t('catalog.loadError')
          )
        }

      } finally {

        if (active) {
          setLoading(false)
        }

      }

    }

    loadProducts()

    return () => {
      active = false
    }

  }, [t])


  // ============================================================
  // SEARCH + FILTER
  // ============================================================

  const filteredProducts = useMemo(() => {

    const normalizedQuery =
      query.trim().toLowerCase()

    return products.filter((product) => {

      const searchableText = `
        ${product.name}
        ${product.category}
        ${product.subcategory}
        ${product.filename}
      `.toLowerCase()

      const matchesSearch =
        !normalizedQuery ||
        searchableText.includes(normalizedQuery)

      const matchesStatus =
        status === 'ALL' ||
        product.status === status

      const matchesPublication =
        publicationStatus === 'ALL' ||
        product.publicationStatus === publicationStatus

      return matchesSearch && matchesStatus && matchesPublication

    }).sort((first, second) => sort === 'oldest'
      ? new Date(first.created_at || 0) - new Date(second.created_at || 0)
      : new Date(second.created_at || 0) - new Date(first.created_at || 0))

  }, [products, query, status, publicationStatus, sort])


  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {

    return (
      <div className="space-y-8">

        <div>

          <p className="text-sm font-semibold text-teal-700">
            {t('catalog.eyebrow')}
          </p>

          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {t('catalog.title')}
          </h2>

          <p className="mt-2 text-slate-500">
            {t('catalog.loadingBackend')}
          </p>

        </div>

        <div className="grid place-items-center rounded-2xl border border-slate-200 bg-white py-20">

          <p className="text-sm text-slate-500">
            {t('catalog.loading')}
          </p>

        </div>

      </div>
    )

  }


  // ============================================================
  // ERROR
  // ============================================================

  if (error) {

    return (
      <div className="space-y-8">

        <div>

          <p className="text-sm font-semibold text-teal-700">
            {t('catalog.eyebrow')}
          </p>

          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {t('catalog.title')}
          </h2>

        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">

          <h3 className="font-semibold text-rose-900">
            {t('catalog.unableToLoad')}
          </h3>

          <p className="mt-2 text-sm text-rose-700">
            {error}
          </p>

        </div>

      </div>
    )

  }


  // ============================================================
  // PAGE
  // ============================================================

  return (

    <div className="space-y-8">

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">

        <div>

          <p className="text-sm font-semibold text-teal-700">
            {t('catalog.eyebrow')}
          </p>

          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {t('catalog.title')}
          </h2>

          <p className="mt-2 text-slate-500">
            {t('catalog.subtitle')}
          </p>

        </div>


        <Link
          to="/reviewer/analyze"
          className="inline-flex items-center justify-center rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white"
        >
          {t('catalog.analyzeProduct')}
        </Link>

      </div>


      {/* TOOLBAR */}

      <CatalogToolbar>

        <div className="flex flex-wrap gap-3">

          <SearchBar
            value={query}
            onChange={setQuery}
          />

          <FilterBar
            status={status}
            onStatusChange={setStatus}
          />

          <select aria-label={t('catalog.filterPublicationLabel')} value={publicationStatus} onChange={(event) => setPublicationStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-teal-500">
            <option value="ALL">{t('catalog.allPublicationStates')}</option>
            <option value="DRAFT">{t('status.DRAFT')}</option>
            <option value="PENDING_REVIEW">{t('status.PENDING_REVIEW')}</option>
            <option value="APPROVED">{t('status.APPROVED')}</option>
            <option value="REJECTED">{t('status.REJECTED')}</option>
            <option value="PUBLISHED">{t('status.PUBLISHED')}</option>
          </select>

          <select aria-label={t('catalog.sortLabel')} value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-teal-500">
            <option value="newest">{t('catalog.newestFirst')}</option>
            <option value="oldest">{t('catalog.oldestFirst')}</option>
          </select>

        </div>


        <button
          type="button"
          onClick={() => setTable(!table)}
          className="self-start rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          {table ? t('catalog.gridView') : t('catalog.listView')}
        </button>

      </CatalogToolbar>


      {/* PRODUCTS */}

      {filteredProducts.length ? (

        table ? (

          <ProductTable
            products={filteredProducts}
          />

        ) : (

          <ProductGrid
            products={filteredProducts}
          />

        )

      ) : (

        <div className="grid place-items-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">

          <h3 className="font-semibold text-slate-900">
            {t('catalog.noProducts')}
          </h3>

          <p className="mt-2 text-sm text-slate-500">

            {products.length
              ? t('catalog.noProductsSearch')
              : t('catalog.noProductsEmpty')
            }

          </p>

        </div>

      )}


      <p className="text-xs text-slate-400">
        {t('catalog.loadedCount', { count: products.length })}
      </p>

    </div>

  )
}
