import ConfidenceIndicator from '../common/ConfidenceIndicator'
import StatusBadge from '../common/StatusBadge'
import EvidencePanel from './EvidencePanel'
import { displayValue } from '../../utils/statusUtils'
import { useLanguage } from '../../context/useLanguage'
export default function AttributeCard({ label, data, compact = false }) { const { t } = useLanguage(); const status = String(data?.status || 'UNKNOWN').toUpperCase(); const emphasis = status === 'REVIEW' ? 'border-amber-300 bg-amber-50/30' : status === 'UNKNOWN' ? 'border-slate-200 bg-slate-50/50' : 'border-slate-200 bg-white'; return <article className={`rounded-2xl border p-4 ${emphasis}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className={`mt-2 truncate font-semibold text-slate-900 ${compact ? 'text-sm' : ''}`}>{displayValue(data?.value, data?.status, t)}</p></div><StatusBadge status={data?.status} /></div><div className="mt-4"><ConfidenceIndicator value={data?.confidence} /></div><EvidencePanel evidence={data?.evidence} /></article> }
