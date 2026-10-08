import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  LANGUAGES,
  attributeLabel,
  categoryLabel,
  statusLabel,
  translate,
} from '../i18n/translations'
import { LanguageContext } from './languageContext'

function readStoredLanguage() {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (stored && LANGUAGES.some((language) => language.code === stored)) return stored
  } catch {
    // Ignore storage access errors (e.g. privacy mode) and fall back to default.
  }
  return DEFAULT_LANGUAGE
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(readStoredLanguage)

  useEffect(() => {
    document.documentElement.lang = language
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
    } catch {
      // Ignore storage write errors; the active language still works in-memory.
    }
  }, [language])

  const setLanguage = useCallback((nextLanguage) => {
    if (LANGUAGES.some((languageItem) => languageItem.code === nextLanguage)) {
      setLanguageState(nextLanguage)
    }
  }, [])

  const value = useMemo(() => ({
    language,
    setLanguage,
    languages: LANGUAGES,
    t: (key, params) => translate(language, key, params),
    statusLabel: (value) => statusLabel(language, value),
    categoryLabel: (value) => categoryLabel(language, value),
    fieldLabel: (key) => attributeLabel(language, key),
  }), [language, setLanguage])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
