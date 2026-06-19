"use client";

import { useRouter } from 'next/navigation';

export default function ProfileBackButton() {
  const router = useRouter();

  const handleBack = () => {
    if (window.history.length > 2) {
      router.back();
    } else {
      router.push('/community');
    }
  };

  return (
    <button 
      onClick={handleBack}
      className="inline-flex items-center gap-2 text-on-surface-variant hover:text-emerald-400 transition-colors font-label-md mt-4 bg-transparent border-none cursor-pointer outline-none"
    >
      <span className="material-symbols-outlined text-[18px]">arrow_back</span> Retour
    </button>
  );
}
