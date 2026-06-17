"use client";

import { useTranslation } from '@/contexts/TranslationContext';

export default function T({ children }: { children: string }) {
  const { t } = useTranslation();
  return <>{t(children)}</>;
}
