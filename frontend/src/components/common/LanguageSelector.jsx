import { ChevronDown, Globe } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../../context/useLanguage'

export default function LanguageSelector({ className = '' }) {
  const { language, setLanguage, languages, t } = useLanguage()
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const active = languages.find((item) => item.code === language) || languages[0]

  useEffect(() => {
    if (!open) return undefined
    function handlePointer(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false)
    }
    function handleKey(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  function choose(code) {
    setLanguage(code)
    setOpen(false)
  }

  return <div ref={containerRef} className={`language-select ${className}`}>
    <button
      type="button"
      className="language-select-button"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-label={t('action.selectLanguage')}
      onClick={() => setOpen((value) => !value)}
    >
      <Globe size={16} aria-hidden="true" />
      <strong className="language-select-code">{active.short}</strong>
      <ChevronDown size={14} aria-hidden="true" className={`language-select-caret ${open ? 'language-select-caret-open' : ''}`} />
    </button>
    {open && <ul className="language-select-menu" role="listbox" aria-label={t('action.selectLanguage')}>
      {languages.map((item) => <li key={item.code} role="none">
        <button
          type="button"
          role="option"
          aria-selected={item.code === language}
          className={`language-select-option ${item.code === language ? 'language-select-option-active' : ''}`}
          onClick={() => choose(item.code)}
        >
          <span>{item.native}</span>
        </button>
      </li>)}
    </ul>}
  </div>
}
