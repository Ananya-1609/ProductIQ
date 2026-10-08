import { Circle, CircleAlert, CircleCheck } from 'lucide-react'
import { useLanguage } from '../../context/useLanguage'

export default function StatusBadge({ status = 'UNKNOWN' }) {
  const key = String(status).toUpperCase()
  const { statusLabel } = useLanguage()
  const styles = { ACCEPT: 'border-emerald-200 bg-emerald-50 text-emerald-700', REVIEW: 'border-amber-200 bg-amber-50 text-amber-700', UNKNOWN: 'border-slate-200 bg-slate-50 text-slate-500', DRAFT: 'border-slate-200 bg-slate-50 text-slate-600', PENDING_REVIEW: 'border-amber-200 bg-amber-50 text-amber-700', APPROVED: 'border-indigo-200 bg-indigo-50 text-indigo-700', REJECTED: 'border-rose-200 bg-rose-50 text-rose-700', PUBLISHED: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
  const Icon = ['ACCEPT', 'APPROVED', 'PUBLISHED'].includes(key) ? CircleCheck : ['REVIEW', 'PENDING_REVIEW'].includes(key) ? CircleAlert : Circle
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold tracking-wide ${styles[key] || styles.UNKNOWN}`}><Icon size={13} />{statusLabel(status)}</span>
}
