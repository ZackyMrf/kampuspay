import { useI18n } from '../i18n/LanguageProvider'

export default function LanguageToggle({ full = false }) {
  const { language, setLanguage, t } = useI18n()

  return (
    <div className={`language-toggle ${full ? 'language-toggle-full' : ''}`} aria-label={t('common.language')}>
      <button
        type="button"
        className={language === 'id' ? 'active' : ''}
        onClick={() => setLanguage('id')}
        aria-pressed={language === 'id'}
      >
        ID
      </button>
      <button
        type="button"
        className={language === 'en' ? 'active' : ''}
        onClick={() => setLanguage('en')}
        aria-pressed={language === 'en'}
      >
        EN
      </button>
    </div>
  )
}
