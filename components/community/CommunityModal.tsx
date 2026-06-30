import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ThreeViewer } from '@/components/OptimizationsGrid';
import { PublicOptimization } from './types';
import { getOptimizationDetails } from '@/app/actions/community';

type CommunityModalProps = {
  item: PublicOptimization | null;
  isClosing: boolean;
  onClose: () => void;
  likedItems: string[];
  onLike: (e: React.MouseEvent, item: PublicOptimization) => void;
  onShare: (e: React.MouseEvent, item: PublicOptimization) => void;
};

const formatBytes = (bytes: number) => {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'Ko', 'Mo', 'Go', 'To'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export function CommunityModal({ item: initialItem, isClosing, onClose, likedItems, onLike, onShare }: CommunityModalProps) {
  const [item, setItem] = useState<PublicOptimization | null>(initialItem);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [isCheckingPurchase, setIsCheckingPurchase] = useState(true);

  useEffect(() => {
    setItem(initialItem);
    setHasPurchased(false);
    if (initialItem) {
      // Check purchase status and get full details if needed
      setIsCheckingPurchase(true);
      getOptimizationDetails(initialItem.id).then((res) => {
        if (res.data) {
          setItem({ ...initialItem, ...res.data });
        }
        if (res.hasPurchased) {
          setHasPurchased(true);
        }
        setIsCheckingPurchase(false);
      });

      const header = document.getElementById('main-header');
      if (header) {
        header.style.transform = 'translate(-50%, -150%)'; // -50% for the left-1/2 -translate-x-1/2
        header.style.opacity = '0';
        header.style.pointerEvents = 'none';
      }
    }
    
    return () => {
      const header = document.getElementById('main-header');
      if (header) {
        header.style.transform = '';
        header.style.opacity = '1';
        header.style.pointerEvents = 'auto';
      }
    };
  }, [initialItem]);

  if (!item) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/85 backdrop-blur-md transition-opacity duration-250 ease-out ${isClosing ? 'opacity-0' : 'opacity-100 animate-fade-in'}`} onClick={onClose}>
      <div 
        className={`glass-panel w-full max-w-6xl max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-[32px] flex flex-col md:flex-row relative bg-[#101014]/95 shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-white/10 transition-all duration-250 ease-out ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100 animate-scale-in'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          className="absolute top-4 right-4 md:top-5 md:right-5 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-surface/50 text-on-surface hover:bg-surface border border-white/5 transition-colors focus:outline-none active:scale-95"
          onClick={onClose}
        >
          <span className="material-symbols-outlined text-[22px]">close</span>
        </button>
        
        {/* Media Visualizer (Left Panel) */}
        <div className="w-full md:w-2/3 h-[50vh] md:h-[600px] min-h-[300px] shrink-0 bg-[#070709] flex items-center justify-center relative overflow-hidden">
          {/* Tech scan grid lines */}
          <div className="absolute inset-0 tech-grid opacity-30 pointer-events-none"></div>
          
          {item.price && item.price > 0 && !hasPurchased ? (
            <div className="flex flex-col items-center justify-center space-y-4 text-center p-8 relative z-10">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-tertiary/10 flex items-center justify-center border border-primary/30 shadow-[0_0_30px_rgba(16,185,129,0.2)] mb-2">
                <span className="material-symbols-outlined text-[48px] text-emerald-400">lock</span>
              </div>
              <h3 className="font-display font-black text-2xl text-on-surface">Modèle Premium</h3>
              <p className="text-on-surface-variant font-medium max-w-sm">
                Achetez ce modèle pour débloquer la vue 3D interactive et télécharger les fichiers sources.
              </p>
            </div>
          ) : item.preview_url ? (
            <ThreeViewer src={item.preview_url} fileType={item.file_type} />
          ) : isCheckingPurchase ? (
            <div className="flex flex-col items-center justify-center space-y-4 text-center p-8">
              <span className="material-symbols-outlined text-[48px] text-emerald-400 animate-spin">autorenew</span>
            </div>
          ) : null}
          
          {/* Visualizer Badge */}
          {item.preview_url && (
            <div className="absolute bottom-5 left-5 bg-background/70 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full text-on-surface-variant text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 select-none shadow-lg z-20">
              <span className="material-symbols-outlined text-[15px] text-emerald-400">view_in_ar</span>
              Rendu WebGL 3D
            </div>
          )}
        </div>
        
        {/* Details & Interactive Actions (Right Panel) */}
        <div className="w-full md:w-1/3 p-5 sm:p-6 md:p-8 flex flex-col justify-between border-l border-white/5 bg-[#121217]/50">
          <div className="space-y-6">
            <div className="space-y-1.5">
              {item.creator_is_pro && (
                <div className="inline-flex items-center gap-1.5 text-[10px] text-tertiary bg-tertiary/10 border border-tertiary/20 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider select-none">
                  <span className="material-symbols-outlined text-[12px] fill-1">bolt</span> Créateur PRO
                </div>
              )}
              <h2 className="font-display text-2xl font-bold text-on-surface break-all leading-tight tracking-tight" title={item.file_name}>
                {item.file_name}
              </h2>
              <p className="text-body-sm text-on-surface-variant">
                partagé par <Link href={`/u/${item.creator_name || item.user_id}`} onClick={(e) => e.stopPropagation()} className="text-emerald-400 font-semibold hover:text-emerald-300 transition-colors cursor-pointer">@{item.creator_name || 'créateur'}</Link>
              </p>
            </div>
            
            {/* Statistics Counters */}
            <div className="grid grid-cols-3 gap-2 bg-white/[0.01] border border-white/5 p-3 rounded-2xl text-center shadow-inner">
              <div className="space-y-0.5">
                <span className="material-symbols-outlined text-blue-400 text-[18px]">visibility</span>
                <p className="text-body-sm font-bold text-on-surface">{item.views || 0}</p>
                <p className="text-[9px] text-on-surface-variant uppercase font-bold tracking-wider">Vues</p>
              </div>
              <div className="space-y-0.5">
                <span className="material-symbols-outlined text-error text-[18px]">favorite</span>
                <p className="text-body-sm font-bold text-on-surface">{item.likes || 0}</p>
                <p className="text-[9px] text-on-surface-variant uppercase font-bold tracking-wider">J'aime</p>
              </div>
              <div className="space-y-0.5">
                <span className="material-symbols-outlined text-primary text-[18px]">share</span>
                <p className="text-body-sm font-bold text-on-surface">{item.shares || 0}</p>
                <p className="text-[9px] text-on-surface-variant uppercase font-bold tracking-wider">Partages</p>
              </div>
            </div>
            
            {/* File Metadata */}
            <div className="space-y-3 pt-1 text-body-sm">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-on-surface-variant">Taille du modèle</span>
                <span className="font-medium text-on-surface">{formatBytes(item.compressed_size)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-on-surface-variant">Format du fichier</span>
                <span className="font-medium text-on-surface uppercase">{item.file_type.split('/')[1]}</span>
              </div>
            </div>
          </div>

          {/* Primary Interaction Buttons */}
          <div className="space-y-3 pt-6 border-t border-white/5 mt-6">
            <div className="flex gap-3">
              <button
                onClick={(e) => onLike(e, item)}
                className={`flex-1 py-3.5 rounded-2xl border font-label-md text-label-md flex items-center justify-center gap-1.5 transition-all active:scale-95 ${likedItems.includes(item.id) ? 'bg-error/15 border-error/30 text-error' : 'glass-panel text-on-surface hover:text-error hover:bg-error/5 hover:border-error/20'}`}
              >
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: likedItems.includes(item.id) ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
                {likedItems.includes(item.id) ? 'Aimé' : 'J\'aime'}
              </button>
              <button
                onClick={(e) => onShare(e, item)}
                className="flex-1 py-3.5 border glass-panel text-on-surface hover:text-emerald-400 hover:bg-emerald-500/5 hover:border-emerald-500/20 transition-all font-label-md text-label-md flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">share</span>
                Partager
              </button>
            </div>
            
            {/* Direct Download or Purchase Button */}
            {item.price && item.price > 0 && !hasPurchased ? (
              <Link
                href={`/checkout/${item.id}`}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-neutral-900 font-label-md text-label-md font-bold flex items-center justify-center gap-2 select-none shadow-[0_4px_20px_rgba(78,222,163,0.25)] hover:shadow-[0_4px_35px_rgba(78,222,163,0.4)] active:scale-[0.98] transition-all hover:brightness-110 disabled:opacity-70 disabled:active:scale-100 disabled:pointer-events-none"
              >
                <span className="material-symbols-outlined text-[18px] font-bold">shopping_cart</span>
                Acheter avec Stripe - {item.price} €
              </Link>
            ) : item.preview_url ? (
              <a
                href={item.preview_url}
                download={`optimax_${item.file_name}`}
                className="w-full py-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-on-surface font-label-md text-label-md font-bold flex items-center justify-center gap-2 select-none active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined text-[18px] font-bold text-emerald-400">download</span>
                Télécharger le modèle 3D
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
