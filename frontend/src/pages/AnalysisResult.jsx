import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import StatusBadge from '../components/common/StatusBadge'
import ConfidenceIndicator from '../components/common/ConfidenceIndicator'
import EvidencePanel from '../components/analysis/EvidencePanel'
import AnalysisHeader from '../components/analysis/AnalysisHeader'
import DescriptionCard from '../components/analysis/DescriptionCard'
import KeywordList from '../components/analysis/KeywordList'
import ReviewPanel from '../components/review/ReviewPanel'
import ReviewSummary from '../components/review/ReviewSummary'
import CatalogFieldsEditor from '../components/common/CatalogFieldsEditor'
import { updateProduct } from '../services/api'
import { useLanguage } from '../context/useLanguage'
import { displayValue } from '../utils/statusUtils'

const excludedFromAttributeTable = new Set(['description', 'keywords'])

function AttributeTable({ analysis }) {
  const { t, fieldLabel } = useLanguage()
  const fields = Object.entries(analysis || {}).filter(([key, value]) => !excludedFromAttributeTable.has(key) && value && typeof value === 'object' && !Array.isArray(value))
  return <Card className="analysis-attribute-card p-5"><div className="analysis-section-heading"><div><p className="analysis-section-kicker">{t('analysis.attributeKicker')}</p><h2>{t('analysis.attributeTitle')}</h2></div><p>{t('analysis.attributeSubtitle')}</p></div><div className="analysis-attribute-table">{fields.map(([key, field]) => <article key={key} className="analysis-attribute-row"><div className="analysis-attribute-name">{fieldLabel(key)}</div><div className="analysis-attribute-value">{displayValue(field.value, field.status, t)}</div><div className="analysis-attribute-confidence"><ConfidenceIndicator value={field.confidence} /></div><div className="analysis-attribute-status"><StatusBadge status={field.status} /></div><div className="analysis-attribute-evidence"><EvidencePanel evidence={field.evidence} /></div></article>)}</div></Card>
}

export default function AnalysisResult() {
  const location = useLocation()
  const { t, fieldLabel } = useLanguage()
  const navigate = useNavigate()
  const result = location.state?.result
  const preview = location.state?.preview
  const filename = location.state?.filename || result?.filename || 'product-image'
  const [analysis, setAnalysis] = useState(result?.analysis || result?.gemini_analysis || null)
  const [editedValues, setEditedValues] = useState({})
  const [catalogFields, setCatalogFields] = useState(result?.catalog_fields || { product_title: '', price: null, sizes: [], tags: [], seo_keywords: [] })
  const [productId] = useState(location.state?.productId || result?.product_id || null)
  const [reviewStatus, setReviewStatus] = useState(location.state?.status || result?.status || result?.validation?.overall_status || 'REVIEW')
  const publicationStatus = result?.publication_status || 'PENDING_REVIEW'
  const validationFields = Array.isArray(result?.validation?.field_validation) ? result.validation.field_validation : []
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')

  function buildFinalAnalysis() {
    const finalAnalysis = { ...(analysis || {}) }
    Object.entries(editedValues).forEach(([attribute, value]) => { if (finalAnalysis[attribute] && typeof finalAnalysis[attribute] === 'object') finalAnalysis[attribute] = { ...finalAnalysis[attribute], value } })
    return finalAnalysis
  }

  function handleFieldEdit(attribute, value) {
    setEditedValues((previous) => ({ ...previous, [attribute]: value }))
    setSaveMessage('')
    setSaveError('')
  }

  async function saveProduct(status) {
    if (!productId) { setSaveError(t('analysis.missingId')); return }
    setSaving(true)
    setSaveMessage('')
    setSaveError('')
    try {
      const finalAnalysis = buildFinalAnalysis()
      await updateProduct(productId, finalAnalysis, status, catalogFields)
      setAnalysis(finalAnalysis)
      setReviewStatus(status)
      setSaveMessage(t('analysis.saveSuccess', { status: publicationStatus }))
    } catch (error) {
      console.error('Product update error:', error)
      setSaveError(error?.response?.data?.detail || error?.message || t('analysis.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const reviewCounts = (() => {
    const fields = validationFields.length ? validationFields : Object.values(analysis || {}).filter((field) => field && typeof field === 'object' && typeof field.confidence === 'number')
    return fields.reduce((counts, field) => { if (field.status === 'ACCEPT') counts.accepted += 1; else if (field.status === 'REVIEW') counts.review += 1; else if (field.status === 'UNKNOWN') counts.unknown += 1; return counts }, { accepted: 0, review: 0, unknown: 0 })
  })()

  if (!analysis) return <div className="space-y-6"><Card className="p-10 text-center"><h2 className="text-xl font-semibold text-slate-950">{t('analysis.resultUnavailable')}</h2><p className="mt-2 text-sm text-slate-500">{t('analysis.resultUnavailableDesc')}</p><Link to="/reviewer/analyze"><Button className="mt-6">{t('dashboard.analyzeAProduct')}</Button></Link></Card></div>

  const statuses = new Map(validationFields.map((field) => [field.field, field]))
  const currentAnalysis = Object.fromEntries(Object.entries(buildFinalAnalysis()).map(([fieldName, fieldData]) => {
    const validationData = statuses.get(fieldName)
    return [fieldName, validationData && fieldData && typeof fieldData === 'object' && !Array.isArray(fieldData) ? { ...fieldData, status: validationData.status } : fieldData]
  }))
  const keyFields = ['category', 'subcategory', 'gender', 'color', 'brand', 'material'].filter((key) => currentAnalysis[key])

  return <div className="analysis-result-page analysis-workspace space-y-5">
    <AnalysisHeader counts={reviewCounts} />

    <section className="analysis-hero-grid">
      <Card className="analysis-image-card p-4"><div className="analysis-image-frame"><img src={preview} alt={filename} className="analysis-hero-image" /></div><div className="analysis-file-meta"><p>{filename}</p><span>{productId ? t('analysis.imageSaved') : t('analysis.imageNotSaved')}</span></div></Card>
      <Card className="analysis-hero-info p-5"><div className="analysis-hero-statuses"><div><span>{t('analysis.aiAnalysis')}</span><StatusBadge status={reviewStatus} /></div><div><span>{t('common.publication')}</span><StatusBadge status={publicationStatus} /></div></div><div className="analysis-hero-heading"><p className="analysis-section-kicker">{t('analysis.heroKicker')}</p><h2>{t('analysis.heroTitle')}</h2><p>{t('analysis.heroSubtitle')}</p></div><div className="analysis-key-fields">{keyFields.map((key) => <div key={key}><span>{fieldLabel(key)}</span><strong>{displayValue(currentAnalysis[key]?.value, currentAnalysis[key]?.status, t)}</strong></div>)}</div><div className="analysis-saved-line"><span className={productId ? 'analysis-saved-dot' : 'analysis-unsaved-dot'} />{productId ? t('analysis.savedRecord') : t('analysis.notPersisted')}</div></Card>
    </section>

    {saveMessage && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{saveMessage}</div>}
    {saveError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{saveError}</div>}

    <AttributeTable analysis={currentAnalysis} />
    <CatalogFieldsEditor value={catalogFields} onChange={setCatalogFields} title="Catalog fields" />
    <DescriptionCard value={currentAnalysis.description} />
    <KeywordList keywords={currentAnalysis.keywords || []} />
    <ReviewSummary counts={reviewCounts} />
    <ReviewPanel analysis={currentAnalysis} editedValues={editedValues} onChange={handleFieldEdit} />

    <Card className="analysis-actions-card p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-slate-950">{t('analysis.reviewActions')}</p><p className="mt-1 text-sm text-slate-500">{productId ? t('analysis.reviewActionsSaved') : t('analysis.reviewActionsUnsaved')}</p></div><div className="flex flex-wrap gap-2"><Button className="analysis-save-button" onClick={() => saveProduct(reviewStatus)} disabled={saving || !productId}>{t('analysis.saveChanges')}</Button>{productId && <Link to={`/reviewer/catalog/${productId}`} className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-teal-200 hover:bg-teal-50">{t('analysis.openWorkflow')}</Link>}{productId && <Button variant="secondary" onClick={() => navigate(`/reviewer/catalog/${productId}`)}>{t('analysis.viewCatalogRecord')}</Button>}</div></div>{saving && <p className="mt-4 text-center text-sm text-slate-500">{t('analysis.updating')}</p>}</Card>

  </div>
}
