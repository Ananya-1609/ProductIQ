import { useEffect, useRef } from 'react'
import { Check, X } from 'lucide-react'
import Button from '../common/Button'
import { useLanguage } from '../../context/useLanguage'

export default function ConfirmationModal({ open, onCancel, onConfirm }) {
  const { t } = useLanguage()
  const cancelRef = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    cancelRef.current?.focus()
    function closeOnEscape(event) { if (event.key === 'Escape') onCancel() }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [open, onCancel])
  if (!open) return null
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel() }}><div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="approval-title" aria-describedby="approval-copy"><div className="flex items-start justify-between gap-4"><div className="grid size-10 place-items-center rounded-full bg-teal-50 text-teal-700"><Check size={19} aria-hidden="true" /></div><button type="button" onClick={onCancel} aria-label={t('common.close')} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800"><X size={18} /></button></div><h2 id="approval-title" className="mt-5 text-lg font-semibold text-slate-950">{t('review.confirmTitle')}</h2><p id="approval-copy" className="mt-2 text-sm leading-6 text-slate-500">{t('review.confirmCopy')}</p><div className="mt-6 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onCancel} ref={cancelRef}>{t('common.cancel')}</Button><Button type="button" onClick={onConfirm}>{t('review.approve')}</Button></div></div></div>
}