import { LoaderCircle } from 'lucide-react'
import { useLanguage } from '../../context/useLanguage'
export default function LoadingState({ label }) { const { t } = useLanguage(); const text = label || t('common.loading'); return <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500"><LoaderCircle size={17} className="animate-spin text-teal-700" />{text}</div> }
