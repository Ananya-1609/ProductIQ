import { FileCheck2, ImagePlus, LoaderCircle, UploadCloud, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/common/Button'
import { analyzeProduct } from '../services/api'
import { useLanguage } from '../context/useLanguage'

const MAX_SIZE = 10 * 1024 * 1024

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Unable to prepare the image preview.'))
    reader.readAsDataURL(file)
  })
}

function formatFileSize(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function AnalyzeProduct({ basePath = '/reviewer' }) {
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  function selectFile(nextFiles) {
    const candidate = nextFiles?.[0]
    if (!candidate) return
    if (!candidate.type.startsWith('image/')) { setError(t('analyze.errorType')); return }
    if (candidate.size > MAX_SIZE) { setError(t('analyze.errorSize')); return }
    setError('')
    if (preview) URL.revokeObjectURL(preview)
    setFile(candidate)
    setPreview(URL.createObjectURL(candidate))
  }

  async function submit(event) {
    event.preventDefault()
    if (!file || loading) return
    setLoading(true)
    setError('')
    try {
      const result = await analyzeProduct(file)
      const storedPreview = await fileToDataUrl(file)
      if (basePath === '/seller') navigate('/seller/products')
      else navigate('/reviewer/analysis', { state: { result, preview: storedPreview, filename: file.name } })
    } catch (cause) {
      setError(cause.userMessage || cause.response?.data?.detail || cause.message || t('analyze.errorGeneric'))
    } finally {
      setLoading(false)
    }
  }

  return <div className="analyze-page">
    <section className="analyze-intro"><p className="analyze-eyebrow">{t('analyze.eyebrow')}</p><h1>{t('analyze.title')}</h1><p>{t('analyze.subtitle')}</p></section>
    <form onSubmit={submit} className="analyze-form">
      <div className={`analyze-dropzone ${dragging ? 'analyze-dropzone-dragging' : ''} ${preview ? 'analyze-dropzone-preview' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); selectFile(event.dataTransfer.files) }} onClick={() => !preview && inputRef.current?.click()}>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => selectFile(event.target.files)} />
        {preview ? <><img src={preview} alt={t('analyze.previewAlt')} className="analyze-preview" /><div className="analyze-preview-overlay"><div><p>{file.name}</p><span>{formatFileSize(file.size)}</span></div><div className="analyze-preview-actions"><button type="button" aria-label={t('analyze.removeImage')} onClick={(event) => { event.stopPropagation(); setFile(null); setPreview('') }}><X size={16} /></button><button type="button" onClick={(event) => { event.stopPropagation(); inputRef.current?.click() }}>{t('analyze.changeImage')}</button></div></div></> : <div className="analyze-empty"><span className="analyze-upload-icon"><UploadCloud size={28} /></span><h2>{t('analyze.dropTitle')}</h2><p>{t('analyze.dropSubtitle')}</p><button type="button" onClick={(event) => { event.stopPropagation(); inputRef.current?.click() }}>{t('analyze.browse')}</button><small><FileCheck2 size={14} />{t('analyze.fileHint')} <span>•</span> {t('analyze.maxSize')}</small></div>}
      </div>
      {error && <p className="analyze-error" role="alert">{error}</p>}
      <div className="analyze-action"><Button type="submit" className="analyze-submit" disabled={!file || loading}>{loading ? <><LoaderCircle size={17} className="animate-spin" />{t('analyze.submitting')}</> : <><ImagePlus size={17} />{t('analyze.submit')}</>}</Button></div>
    </form>
  </div>
}
