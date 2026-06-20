'use client';

import React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
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
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-6"
      >
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500/20 blur-[30px] rounded-full animate-pulse-glow"></div>
          <span className="relative material-symbols-outlined text-emerald-400 text-[64px] animate-spin">autorenew</span>
        </div>
        <p className="text-on-surface-variant font-medium tracking-widest uppercase text-[12px]">Chargement du showroom 3D...</p>
      </motion.div>
    );
  }

  if (filteredItems.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }} 
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", bounce: 0.5 }}
        className="glass-panel rounded-[40px] p-16 text-center opacity-80 flex flex-col items-center justify-center min-h-[400px] bg-[#121216]/50 border-white/5 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute inset-0 tech-grid opacity-10 mix-blend-overlay"></div>
        <span className="material-symbols-outlined text-[80px] text-on-surface-variant/30 mb-6 animate-float-gentle">search_off</span>
        <h3 className="font-display text-[28px] text-on-surface mb-3 font-black">Aucun modèle 3D trouvé</h3>
        <p className="text-on-surface-variant text-[15px] font-medium max-w-sm">Essayez d'ajuster vos termes de recherche ou vos filtres pour découvrir de nouvelles créations.</p>
      </motion.div>
    );
  }

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 60, scale: 0.9 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', bounce: 0.4, duration: 0.8 } },
  };

  return (
    <div className="space-y-16">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
      >
        <AnimatePresence mode="popLayout">
          {filteredItems.slice(0, visibleLimit).map((item, index) => (
            <motion.div 
              key={item.id} 
              variants={itemVariants}
              layout
              className={index === 0 ? 'md:col-span-2' : ''}
            >
              <CommunityCard
                item={item}
                isFirst={index === 0}
                isLiked={likedItems.includes(item.id)}
                onOpen={onOpen}
                onLike={onLike}
                onShare={onShare}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Pagination / Load More */}
      {filteredItems.length > visibleLimit && (
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex justify-center pt-8 pb-12"
        >
          <button
            onClick={() => setVisibleLimit(prev => prev + 6)}
            className="group relative px-10 py-4 rounded-full bg-[#16161c] border border-white/10 hover:border-emerald-500/50 text-on-surface hover:text-emerald-400 transition-all duration-500 font-label-md text-label-md flex items-center gap-3 overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            <span className="material-symbols-outlined text-[22px] group-hover:rotate-90 transition-transform duration-500">add_circle</span>
            <span className="tracking-wide">Découvrir plus d'œuvres</span>
          </button>
        </motion.div>
      )}
    </div>
  );
}
