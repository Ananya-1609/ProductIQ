import Button from './Button'
import { useLanguage } from '../../context/useLanguage'
export default function ErrorState({ message, onRetry }) { const { t } = useLanguage(); const text = message || t('error.somethingWentWrong'); return <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5"><p className="font-semibold text-rose-800">{t('error.unableToLoadView')}</p><p className="mt-1 text-sm text-rose-700">{text}</p>{onRetry && <Button variant="secondary" onClick={onRetry} className="mt-4">{t('common.tryAgain')}</Button>}</div> }
