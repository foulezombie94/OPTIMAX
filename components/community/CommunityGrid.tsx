import React from 'react';
import { PublicOptimization } from './types';
import { CommunityCard } from './CommunityCard';

type CommunityGridProps = {
  loading: boolean;
  filteredItems: PublicOptimization[];
  visibleLimit: number;
  setVisibleLimit: React.Dispatch<React.SetStateAction<number>>;
  likedItems: string[];
  onOpen: (item: PublicOptimization) => void;
  onLike: (e: React.MouseEvent, item: PublicOptimization) => void;
  onShare: (e: React.MouseEvent, item: PublicOptimization) => void;
};

export function CommunityGrid({
  loading,
  filteredItems,
  visibleLimit,
  setVisibleLimit,
  likedItems,
  onOpen,
  onLike,
  onShare
}: CommunityGridProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] text-center space-y-4">
        <span className="material-symbols-outlined text-emerald-400 text-[56px] animate-spin">autorenew</span>
        <p className="text-on-surface-variant font-medium tracking-wide">Chargement du showroom 3D...</p>
      </div>
    );
  }

  if (filteredItems.length === 0) {
    return (
      <div className="glass-panel rounded-3xl p-16 text-center opacity-80 flex flex-col items-center justify-center min-h-[350px] bg-surface/20 border-white/5">
        <span className="material-symbols-outlined text-[72px] text-on-surface-variant/40 mb-4 animate-bounce">search_off</span>
        <h3 className="font-headline-md text-headline-md text-on-surface mb-2 font-bold">Aucun modèle 3D trouvé</h3>
        <p className="text-on-surface-variant text-body-md font-light">Essayez d'ajuster vos termes de recherche.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredItems.slice(0, visibleLimit).map(item => (
          <CommunityCard
            key={item.id}
            item={item}
            isLiked={likedItems.includes(item.id)}
            onOpen={onOpen}
            onLike={onLike}
            onShare={onShare}
          />
        ))}
      </div>

      {/* Pagination / Load More */}
      {filteredItems.length > visibleLimit && (
        <div className="flex justify-center pt-6">
          <button
            onClick={() => setVisibleLimit(prev => prev + 6)}
            className="px-9 py-4 rounded-full bg-gradient-to-tr from-surface-container to-surface-container-high border border-white/10 hover:border-emerald-500/40 text-on-surface hover:text-emerald-400 transition-all duration-300 font-label-md text-label-md flex items-center gap-2 hover:shadow-[0_0_30px_rgba(78,222,163,0.18)] active:scale-95 hover:-translate-y-0.5"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            Voir plus de créations
          </button>
        </div>
      )}
    </div>
  );
}
