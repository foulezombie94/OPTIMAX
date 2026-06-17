"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations } from '@/locales/translations';

export const SUPPORTED_LANGUAGES = [
  { code: 'fr', name: 'Français' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'zh', name: '中文' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'ar', name: 'العربية' },
  { code: 'pt', name: 'Português' },
];

type TranslationContextType = {
  currentLanguage: string;
  setLanguage: (lang: string) => void;
  t: (text: string) => string;
};

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState('fr');

  useEffect(() => {
    const saved = localStorage.getItem('optimax-lang');
    if (saved && SUPPORTED_LANGUAGES.some(l => l.code === saved)) {
      setCurrentLanguage(saved);
    }
  }, []);

  const setLanguage = (lang: string) => {
    setCurrentLanguage(lang);
    localStorage.setItem('optimax-lang', lang);
  };

  const t = (text: string) => {
    if (currentLanguage === 'fr' || !text) return text;
    
    // Instant lookup from the static dictionary
    return translations[currentLanguage]?.[text] || text;
  };

  return (
    <TranslationContext.Provider value={{ currentLanguage, setLanguage, t }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}
