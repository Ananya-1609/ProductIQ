import { PencilLine, Save } from 'lucide-react'
import Button from '../common/Button'

export default function ReviewActions({ onSave, onEdit, disabled }) {
  return <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur">
    <Button onClick={onSave} disabled={disabled}><Save size={17} />Save review edits</Button>
    <Button variant="ghost" onClick={onEdit}><PencilLine size={17} />Edit product data</Button>
  </div>
}