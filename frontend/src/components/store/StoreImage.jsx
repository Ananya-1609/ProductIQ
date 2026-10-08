import { Image as ImageIcon } from 'lucide-react'
import { useState } from 'react'
import { useLanguage } from '../../context/useLanguage'

export default function StoreImage({ src, alt, className = '' }) {
  const { t } = useLanguage()
  const [failed, setFailed] = useState(false)
  if (!src || failed) return <div className={`store-image-fallback ${className}`}><ImageIcon size={26} strokeWidth={1.4} aria-hidden="true" /><span>{t('common.imageUnavailable')}</span></div>
  return <img src={src} alt={alt} className={`store-image ${className}`} onError={() => setFailed(true)} />
}
