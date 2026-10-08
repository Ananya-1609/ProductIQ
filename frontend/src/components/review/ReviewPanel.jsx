import { PencilLine } from 'lucide-react'
import Card from '../common/Card'
import EditableField from './EditableField'
import { useLanguage } from '../../context/useLanguage'

export default function ReviewPanel({ analysis, editedValues, onChange }) {
  const { t } = useLanguage()
  const fields = Object.entries(analysis || {}).filter(([, value]) => value && typeof value === 'object' && !Array.isArray(value))
  return <Card id="human-review" className="analysis-human-review p-5"><div className="analysis-section-heading"><div className="flex items-center gap-2"><PencilLine size={17} className="text-teal-700" aria-hidden="true" /><div><p className="analysis-section-kicker">{t('review.humanLoopKicker')}</p><h2>{t('review.humanLoopTitle')}</h2></div></div><p>{t('review.humanLoopSubtitle')}</p></div><div className="review-fields-table"><div className="review-fields-header"><span>{t('common.field')}</span><span>{t('common.currentValue')}</span><span>{t('common.status')}</span><span>{t('common.action')}</span></div>{fields.map(([key, value]) => <EditableField key={key} label={key} aiValue={value.value} currentValue={editedValues?.[key] ?? value.value} status={value.status} onSave={(next) => onChange(key, next)} />)}</div></Card>
}
