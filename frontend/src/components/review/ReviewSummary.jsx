import Card from '../common/Card'
import { useLanguage } from '../../context/useLanguage'

export default function ReviewSummary({ counts }) {
  const { t } = useLanguage()
  return <Card className="p-5"><h3 className="font-semibold text-slate-950">{t('review.summaryTitle')}</h3><div className="mt-4 grid gap-3 sm:grid-cols-3"><div><p className="text-2xl font-semibold text-emerald-700">{counts.accepted}</p><p className="text-xs font-medium text-slate-500">{t('common.acceptedFields')}</p></div><div><p className="text-2xl font-semibold text-amber-700">{counts.review}</p><p className="text-xs font-medium text-slate-500">{t('common.needsReview')}</p></div><div><p className="text-2xl font-semibold text-slate-600">{counts.unknown}</p><p className="text-xs font-medium text-slate-500">{t('common.unknown')}</p></div></div></Card>
}