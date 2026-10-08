import { useEffect, useState } from 'react'

import { Link, useParams } from 'react-router-dom'

import Button from '../components/common/Button'

import Card from '../components/common/Card'

import Modal from '../components/common/Modal'

import StatusBadge from '../components/common/StatusBadge'
import CatalogFieldsEditor from '../components/common/CatalogFieldsEditor'

import {
  approveProduct,
  getProduct,
  publishProduct,
  rejectProduct,
  unpublishProduct,
  updateProduct,
} from '../services/api'


function Field({ label, data }) {
  if (!data) return null

  const value = data.value

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-sm font-semibold text-slate-900">
        {value || 'Not available'}
      </p>

      {typeof data.confidence === 'number' && (
        <p className="mt-1 text-xs text-slate-500">
          Confidence: {Math.round(data.confidence * 100)}%
        </p>
      )}

      {data.status && (
        <p className="mt-1 text-xs font-medium text-slate-500">
          Status: {data.status}
        </p>
      )}

      {data.evidence && (
        <p className="mt-2 text-xs leading-5 text-slate-500">
          {data.evidence}
        </p>
      )}
    </div>
  )
}


export default function ProductDetails() {
  const { id } = useParams()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [catalogFields, setCatalogFields] = useState(null)


  async function refreshProduct() {
    try {
      const data = await getProduct(id)
      setProduct(data)
      setCatalogFields(data.catalog_fields || { product_title: '', price: null, sizes: [], tags: [], seo_keywords: [] })
    } catch (err) {
      console.error(err)

      setActionError(
        err?.response?.data?.detail ||
          'Unable to refresh product details.'
      )
    }
  }


  useEffect(() => {
    async function loadProduct() {
      try {
        setLoading(true)
        setError('')

        const data = await getProduct(id)

        setProduct(data)
        setCatalogFields(data.catalog_fields || { product_title: '', price: null, sizes: [], tags: [], seo_keywords: [] })
      } catch (err) {
        console.error(err)

        setError(
          err?.response?.data?.detail ||
            'Unable to load product details.'
        )
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      loadProduct()
    }
  }, [id])


  async function handleAction(action, reason = '') {
    if (action === 'reject' && !reason.trim()) {
      setActionError('A rejection reason is required.')
      return
    }

    setActionLoading(true)
    setActionError('')
    setSuccessMessage('')

    try {
      const actions = {
        approve: () => approveProduct(id),
        reject: () => rejectProduct(id, reason.trim()),
        publish: () => publishProduct(id),
        unpublish: () => unpublishProduct(id),
      }

      await actions[action]()

      await refreshProduct()

      setRejectOpen(false)
      setRejectionReason('')

      const actionLabel = {
        approve: 'approved',
        reject: 'rejected',
        publish: 'published',
        unpublish: 'unpublished',
      }[action]

      setSuccessMessage(
        `Product ${actionLabel} successfully.`
      )
    } catch (err) {
      console.error(err)

      setActionError(
        err?.response?.data?.detail ||
          `Unable to ${action} product.`
      )
    } finally {
      setActionLoading(false)
    }
  }

  async function saveCatalogFields() {
    setActionLoading(true)
    setActionError('')
    try {
      const updated = await updateProduct(id, product.analysis || {}, product.status || 'REVIEW', catalogFields || {})
      setProduct((current) => ({ ...current, ...updated.product, catalog_fields: catalogFields }))
      setSuccessMessage('Catalog fields saved.')
    } catch (err) {
      setActionError(err?.response?.data?.detail || 'Unable to save catalog fields.')
    } finally {
      setActionLoading(false)
    }
  }


  if (loading) {
    return (
      <div className="space-y-6">

        <Link
          to="/reviewer/catalog"
          className="text-sm font-semibold text-teal-700"
        >
          ← Back to catalog
        </Link>

        <Card className="p-10 text-center">
          <p className="text-sm text-slate-500">
            Loading product...
          </p>
        </Card>

      </div>
    )
  }


  if (error || !product) {
    return (
      <div className="space-y-6">

        <Link
          to="/reviewer/catalog"
          className="text-sm font-semibold text-teal-700"
        >
          ← Back to catalog
        </Link>

        <Card className="p-10 text-center">

          <p className="text-sm font-semibold text-red-600">
            {error || 'Product not found.'}
          </p>

          <Link to="/reviewer/catalog">
            <Button className="mt-6">
              Back to Catalog
            </Button>
          </Link>

        </Card>

      </div>
    )
  }


  const analysis = product.analysis || {}

  const productName =
    product.catalog_fields?.product_title ||
    analysis.product_title ||
    analysis.subcategory?.value ||
    analysis.category?.value ||
    product.filename ||
    'Untitled Product'


  const attributes = [
    ['Category', analysis.category],
    ['Subcategory', analysis.subcategory],
    ['Gender', analysis.gender],
    ['Color', analysis.color],
    ['Brand', analysis.brand],
    ['Material', analysis.material],
    ['Closure', analysis.closure],
    ['Sole', analysis.sole],
  ]


  return (
    <div className="space-y-6">

      {/* Back */}
      <Link
        to="/reviewer/catalog"
        className="text-sm font-semibold text-teal-700"
      >
        ← Back to catalog
      </Link>


      {/* Header */}
      <Card className="p-6">

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>

            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Product Details
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-950">
              {productName}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {product.filename}
            </p>

          </div>


          <div className="flex flex-col items-start gap-2 md:items-end">

            <div className="flex flex-wrap gap-2">

              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                AI Status
              </span>

              <StatusBadge
                status={product.status || 'UNKNOWN'}
              />

            </div>


            <div className="flex flex-wrap gap-2">

              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Publication
              </span>

              <StatusBadge
                status={product.publication_status || 'DRAFT'}
              />

            </div>

          </div>

        </div>

      </Card>

      <CatalogFieldsEditor value={catalogFields || product.catalog_fields} onChange={setCatalogFields} title="Review and edit catalog fields" />
      <div className="flex justify-end"><Button onClick={saveCatalogFields} disabled={actionLoading}>Save catalog fields</Button></div>


      {/* Publication Workflow */}
      <Card className="p-5">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <h2 className="font-semibold text-slate-950">
              Publication workflow
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              AI acceptance never publishes a product automatically.
            </p>

          </div>


          <div className="flex flex-wrap gap-2">

            {(product.publication_status === 'DRAFT' ||
              product.publication_status === 'PENDING_REVIEW') && (
              <>

                {/* Approve */}
                <button
                  type="button"
                  onClick={() => handleAction('approve')}
                  disabled={actionLoading}
                  style={{
                    backgroundColor: '#0f766e',
                    color: '#ffffff',
                    border: '1px solid #0f766e',
                    borderRadius: '12px',
                    padding: '10px 16px',
                    fontSize: '14px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: actionLoading
                      ? 'not-allowed'
                      : 'pointer',
                    opacity: actionLoading ? 0.5 : 1,
                  }}
                >
                  Approve
                </button>


                {/* Reject */}
                <button
                  type="button"
                  onClick={() => setRejectOpen(true)}
                  disabled={actionLoading}
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    border: '1px solid #dc2626',
                    borderRadius: '12px',
                    padding: '10px 16px',
                    fontSize: '14px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: actionLoading
                      ? 'not-allowed'
                      : 'pointer',
                    opacity: actionLoading ? 0.5 : 1,
                  }}
                >
                  Reject
                </button>

              </>
            )}


            {/* Publish */}
            {product.publication_status === 'APPROVED' && (
              <button
                type="button"
                onClick={() => handleAction('publish')}
                disabled={actionLoading}
                style={{
                  backgroundColor: '#0f766e',
                  color: '#ffffff',
                  border: '1px solid #0f766e',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: actionLoading
                    ? 'not-allowed'
                    : 'pointer',
                  opacity: actionLoading ? 0.5 : 1,
                }}
              >
                Publish
              </button>
            )}


            {/* Unpublish */}
            {product.publication_status === 'PUBLISHED' && (
              <button
                type="button"
                onClick={() => handleAction('unpublish')}
                disabled={actionLoading}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: actionLoading
                    ? 'not-allowed'
                    : 'pointer',
                  opacity: actionLoading ? 0.5 : 1,
                }}
              >
                Unpublish
              </button>
            )}

          </div>

        </div>


        {successMessage && (
          <p
            role="status"
            className="mt-3 text-sm font-medium text-emerald-700"
          >
            {successMessage}
          </p>
        )}


        {actionError && (
          <p
            role="alert"
            className="mt-3 text-sm font-medium text-rose-700"
          >
            {actionError}
          </p>
        )}

      </Card>


      {/* Classification */}
      <Card className="p-6">

        <h2 className="text-lg font-semibold text-slate-950">
          Classification
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-3">

          <Field
            label="Category"
            data={analysis.category}
          />

          <Field
            label="Subcategory"
            data={analysis.subcategory}
          />

          <Field
            label="Gender"
            data={analysis.gender}
          />

        </div>

      </Card>


      {/* Attributes */}
      <Card className="p-6">

        <h2 className="text-lg font-semibold text-slate-950">
          Product Attributes
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">

          {attributes
            .slice(3)
            .map(([label, data]) => (
              <Field
                key={label}
                label={label}
                data={data}
              />
            ))}

        </div>

      </Card>


      {/* Description */}
      {analysis.description && (
        <Card className="p-6">

          <h2 className="text-lg font-semibold text-slate-950">
            Description
          </h2>

          <p className="mt-4 text-sm leading-7 text-slate-600">
            {analysis.description}
          </p>

        </Card>
      )}


      {/* Keywords */}
      {Array.isArray(analysis.keywords) &&
        analysis.keywords.length > 0 && (
          <Card className="p-6">

            <h2 className="text-lg font-semibold text-slate-950">
              Keywords
            </h2>

            <div className="mt-4 flex flex-wrap gap-2">

              {analysis.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {keyword}
                </span>
              ))}

            </div>

          </Card>
        )}


      {/* Reject Modal */}
      <Modal
        open={rejectOpen}
        title="Reject product"
        onClose={() =>
          !actionLoading && setRejectOpen(false)
        }
      >

        <form
          onSubmit={(event) => {
            event.preventDefault()
            handleAction('reject', rejectionReason)
          }}
          className="space-y-4"
        >

          <label
            className="block text-sm font-medium text-slate-700"
            htmlFor="rejection-reason"
          >
            Rejection reason
          </label>


          <textarea
            id="rejection-reason"
            value={rejectionReason}
            onChange={(event) =>
              setRejectionReason(event.target.value)
            }
            required
            rows={4}
            className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-teal-500"
            placeholder="Explain what needs to be corrected."
          />


          <div className="flex justify-end gap-2">

            <Button
              type="button"
              variant="secondary"
              onClick={() => setRejectOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>


            <Button
              type="submit"
              variant="danger"
              disabled={
                actionLoading ||
                !rejectionReason.trim()
              }
            >
              Confirm rejection
            </Button>

          </div>

        </form>

      </Modal>

    </div>
  )
}
