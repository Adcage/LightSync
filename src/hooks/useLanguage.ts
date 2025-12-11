import { useTranslation } from 'react-i18next'
import { setConfigValue } from '../utils/store'

export const useLanguage = () => {
  const { i18n } = useTranslation()

  const setLanguage = async (language: string) => {
    await i18n.changeLanguage(language)
    await setConfigValue('language', language)
  }

  return {
    language: i18n.language,
    setLanguage,
  }
}
