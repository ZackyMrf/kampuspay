import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { LANGUAGE_STORAGE_KEY, LANGUAGES, translations } from './translations'

const LanguageContext = createContext(null)

function getInitialLanguage() {
  const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
  if (saved && LANGUAGES[saved]) return saved
  return 'id'
}

function interpolate(template, values = {}) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? '')
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(getInitialLanguage)

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
    document.documentElement.lang = language
  }, [language])

  const value = useMemo(() => {
    const t = (key, values) => {
      const template = translations[language]?.[key] || translations.en[key] || key
      return values ? interpolate(template, values) : template
    }

    return {
      language,
      locale: LANGUAGES[language].locale,
      setLanguage,
      toggleLanguage: () => setLanguage((current) => (current === 'id' ? 'en' : 'id')),
      t,
    }
  }, [language])

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useI18n must be used inside LanguageProvider')
  return context
}
