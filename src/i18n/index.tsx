// src/i18n/index.tsx
'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { EN_TEXT } from '@/config/ui-text.en'
import { ES_TEXT } from '@/config/ui-text.es'
import { API_BASE_ROOT, DEFAULT_LANG } from '@/lib/constants'
import { api } from '@/lib/http'

export type SupportedLang = 'en' | 'es'

const LANG_STORAGE_KEY = 'app.lang'

function getInitialLang(): SupportedLang {
  if (typeof window === 'undefined') return DEFAULT_LANG as SupportedLang
  const saved = window.localStorage.getItem(LANG_STORAGE_KEY)
  if (saved === 'en' || saved === 'es') return saved
  return DEFAULT_LANG as SupportedLang
}

// Allow either locale object (they share the same shape, but string literals differ)
export type I18nTexts = typeof EN_TEXT | typeof ES_TEXT

export interface LanguageContextValue {
  lang: SupportedLang
  setLang: (lang: SupportedLang) => void
  TEXT: I18nTexts
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<SupportedLang>(getInitialLang())

  // Persist language and update Axios baseURL when language changes
  useEffect(() => {
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, lang)
    } catch {
      // Ignore localStorage errors (e.g., when disabled or quota exceeded)
    }
    // Update Axios base URL dynamically to include locale prefix
    // Use Texas Patrol backend with selected language
    api.defaults.baseURL = `${API_BASE_ROOT}${lang}/`
  }, [lang])

  const TEXT = useMemo(() => (lang === 'es' ? ES_TEXT : EN_TEXT), [lang])

  const value = useMemo<LanguageContextValue>(() => ({ lang, setLang, TEXT }), [lang, TEXT])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useI18n(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useI18n must be used within LanguageProvider')
  return ctx
}
