import { Check, CircleAlert, CircleHelp } from 'lucide-react'
import { useLanguage } from '../../context/useLanguage'

export default function AnalysisHeader({ counts }) {
  const { t } = useLanguage()
  const items = [
    { label: 'common.acceptedFields', value: counts.accepted, icon: Check, tone: 'analysis-summary-accepted' },
    { label: 'common.needsReview', value: counts.review, icon: CircleAlert, tone: 'analysis-summary-review' },
    { label: 'common.unknown', value: counts.unknown, icon: CircleHelp, tone: 'analysis-summary-unknown' },
  ]

  return <div className="analysis-page-header border-b border-slate-200 pb-4">
    <p className="text-sm font-semibold text-teal-700">{t('analysis.eyebrow')}</p>
    <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{t('analysis.title')}</h2>
    <p className="mt-1 text-sm text-slate-500">{t('analysis.subtitle')}</p>
    <div className="analysis-summary-grid mt-5">{items.map(({ label, value, icon: Icon, tone }) => <div key={label} className="analysis-summary-card"><span className={tone}><Icon size={14} aria-hidden="true" /></span><div><p>{value}</p><small>{t(label)}</small></div></div>)}</div>
  </div>
}
