import { PencilLine } from 'lucide-react'
import { useState } from 'react'
import Button from '../common/Button'
import StatusBadge from '../common/StatusBadge'
import { useLanguage } from '../../context/useLanguage'

export default function EditableField({ label, aiValue, currentValue, status, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(currentValue ?? '')
  const modified = currentValue !== aiValue
  const { t, fieldLabel } = useLanguage()
  const labelText = fieldLabel(label)

  function cancel() {
    setDraft(currentValue ?? '')
    setEditing(false)
  }

  return <div className="review-field-row">
    <div className="review-field-name">{labelText}</div>
    <div className="review-field-current">{editing ? <div className="review-field-editor"><span className="review-field-ai">{t('common.aiGeneratedValue', { value: aiValue || t('common.notVisible') })}</span><input aria-label={`${t('common.edit')} ${labelText}`} autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} /><div><Button type="button" className="px-3 py-1.5 text-xs" onClick={() => { onSave(draft); setEditing(false) }}>{t('common.save')}</Button><Button type="button" variant="ghost" className="px-2 text-xs" onClick={cancel}>{t('common.cancel')}</Button></div></div> : <><span>{currentValue || t('common.notVisible')}</span>{modified && <small>{t('common.aiValue', { value: aiValue || t('common.notVisible') })}</small>}</>}</div>
    <div className="review-field-status"><StatusBadge status={status} /></div>
    <div className="review-field-action">{!editing && <Button type="button" variant="ghost" className="px-2 py-1.5 text-xs" onClick={() => setEditing(true)}><PencilLine size={14} />{t('common.edit')}</Button>}</div>
  </div>
}
