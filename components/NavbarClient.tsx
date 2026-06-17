"use client";

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation, SUPPORTED_LANGUAGES } from '@/contexts/TranslationContext';
// Note: We'll pass a logout action or handle logout client-side, but standard forms work too.

type NavbarClientProps = {
  user: { email?: string; id: string } | null;
  isPro: boolean;
  username: string;
};

export default function NavbarClient({ user, isPro, username }: NavbarClientProps) {
  const { t, currentLanguage, setLanguage } = useTranslation();
  const pathname = usePathname();
  const isMessagesPage = pathname?.startsWith('/messages');
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setIsLangMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLangName = SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage)?.name || 'Français';

  return (
    <div className={`fixed ${isMessagesPage ? 'top-0' : 'top-6'} left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-5xl z-50`}>
      <nav className="bg-[#00020A] shadow-[0_20px_40px_rgba(0,0,0,0.8)] rounded-full px-6 py-3 flex justify-between items-center border border-white/5 transition-all duration-300">
        
        {/* Left side: Logo and Links */}
        <div className="flex items-center gap-12 pointer-events-auto">
          <Link href="/" className="font-headline-md text-headline-md font-black flex items-center gap-2 text-on-surface hover:opacity-80 transition-opacity">
            <img 
              src="/logo.png" 
              alt="OptiMax Logo" 
              className="h-10 w-auto object-contain drop-shadow-lg" 
            />
          </Link>

          {/* Navigation links */}
          <div className="hidden md:flex gap-8 items-center uppercase text-[12.5px] tracking-[0.12em] font-black text-on-surface">
            <Link href="/" className="hover:text-primary transition-colors">
              {t("Espace")}
            </Link>
            <Link href="/community" className="hover:text-primary transition-colors">
              {t("Communauté")}
            </Link>
            {user && (
              <Link href="/messages" className="hover:text-primary transition-colors">
                {t("Messages")}
              </Link>
            )}
          </div>
        </div>

        {/* Right controls */}
        <div className="pointer-events-auto flex items-center gap-4">
          <div className="border border-white/10 rounded-full px-4 py-1.5 flex items-center gap-4 bg-white/5 relative">
            
            {/* Language Dropdown */}
            <div className="relative" ref={langMenuRef}>
              <button 
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center gap-1 text-on-surface hover:text-primary transition-colors"
                title={currentLangName}
              >
                <span className="material-symbols-outlined text-[18px]">language</span>
                <span className="uppercase text-xs font-bold">{currentLanguage}</span>
                <span className="material-symbols-outlined text-[16px]">keyboard_arrow_down</span>
              </button>
              
              {isLangMenuOpen && (
                <div className="absolute top-full mt-4 right-0 w-40 bg-surface/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl overflow-hidden py-2 flex flex-col z-50">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        setIsLangMenuOpen(false);
                      }}
                      className={`px-4 py-2 text-left text-sm font-bold transition-colors hover:bg-white/10 ${currentLanguage === lang.code ? 'text-primary' : 'text-on-surface'}`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* User / Profile */}
            {user ? (
              <Link href="/profile" className="text-on-surface hover:text-primary transition-colors flex items-center" title={`${t("Profil")} (${username})`}>
                <span className="material-symbols-outlined text-[20px]">person</span>
              </Link>
            ) : (
              <Link href="/login" className="text-on-surface hover:text-primary transition-colors flex items-center" title={t("Connexion")}>
                <span className="material-symbols-outlined text-[20px]">login</span>
              </Link>
            )}

            {/* Cart / Pricing */}
            <Link href="/pricing" className="text-on-surface hover:text-primary transition-colors flex items-center relative" title={t("Tarifs")}>
              <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
              {isPro && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 border-2 border-surface"></span>
              )}
            </Link>
            
            {/* Logout (if logged in) */}
            {user && (
              <form action="/auth/signout" method="post" className="flex items-center">
                <button type="submit" className="text-on-surface hover:text-error transition-colors flex items-center" title={t("Déconnexion")}>
                  <span className="material-symbols-outlined text-[20px] ml-1">logout</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}
