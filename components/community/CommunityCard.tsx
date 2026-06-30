'use client';

import Link from 'next/link';
import { ThreeViewer } from '@/components/OptimizationsGrid';
import { PublicOptimization } from './types';
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate } from 'framer-motion';
import { useRef, useState } from 'react';

type CommunityCardProps = {
  item: PublicOptimization;
  isLiked: boolean;
  onOpen: (item: PublicOptimization) => void;
  onLike: (e: React.MouseEvent, item: PublicOptimization) => void;
  onShare: (e: React.MouseEvent, item: PublicOptimization) => void;
  isFirst?: boolean;
};

const formatBytes = (bytes: number) => {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'Ko', 'Mo', 'Go', 'To'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export function CommunityCard({ item, isLiked, onOpen, onLike, onShare, isFirst = false }: CommunityCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Framer Motion 3D Tilt values
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 40 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 40 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], ["0%", "100%"]);
  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], ["0%", "100%"]);
  
  const glareBackground = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.15) 0%, transparent 60%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const themeColor = 'from-[#1a1a24]/80 to-[#101018]/80 hover:border-emerald-500/30 tech-card-glow';
  const fileTypeLabel = item.fileTypeLabel || '3D';

  return (
    <motion.article 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className={`relative rounded-[32px] overflow-hidden group transition-colors duration-500 bg-gradient-to-br flex flex-col justify-between border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.4)] ${themeColor} ${isFirst ? 'md:col-span-2' : ''}`}
    >
      {/* Dynamic Glare Overlay */}
      <motion.div 
        style={{ background: glareBackground, opacity: isHovered ? 1 : 0 }}
        className="absolute inset-0 z-50 pointer-events-none mix-blend-overlay transition-opacity duration-500"
      />

      <Link 
        href={`/community?show=${item.id}`}
        onClick={(e) => {
          e.preventDefault();
          onOpen(item);
        }}
        shallow
        className="absolute inset-0 z-10"
        aria-label={`Voir le modèle: ${item.file_name}`}
      />
      
      {/* Media Container with 3D Popout effect */}
      <div 
        style={{ transform: "translateZ(30px)" }}
        className={`relative w-full bg-gradient-to-tr flex flex-col items-center justify-center overflow-hidden border-b border-white/5 ${isFirst ? 'h-72 md:h-96' : 'h-64'}`}
      >
        <div className="absolute w-48 h-48 bg-emerald-500/10 rounded-full blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
        <div className="absolute inset-0 tech-grid opacity-[0.25] pointer-events-none mix-blend-overlay"></div>
        
        {item.preview_url ? (
          <div className="absolute inset-0 w-full h-full pointer-events-none">
            <ThreeViewer src={item.preview_url} fileType={item.file_type} showLegend={false} />
          </div>
        ) : (
          <span className="material-symbols-outlined text-[80px] text-emerald-400/80 group-hover:text-emerald-300 drop-shadow-[0_0_30px_rgba(78,222,163,0.35)] transition-all duration-700 ease-out group-hover:scale-110">
            view_in_ar
          </span>
        )}
        
        <div className="absolute top-5 right-5 flex flex-col gap-2 items-end">
          <span className="bg-background/50 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.15em] text-white">
            {fileTypeLabel}
          </span>
          {item.price && item.price > 0 ? (
            <span className="bg-primary/20 backdrop-blur-md border border-primary/30 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wider text-primary shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              {item.price} €
            </span>
          ) : null}
        </div>

        <div className="absolute bottom-5 left-5 bg-background/70 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl text-on-surface-variant text-[12px] font-bold flex items-center gap-2 shadow-[0_10px_20px_rgba(0,0,0,0.5)] select-none">
          <span className="material-symbols-outlined text-[16px] text-emerald-400">save</span>
          {formatBytes(item.compressed_size)}
        </div>
      </div>

      {/* Body Content */}
      <div 
        style={{ transform: "translateZ(20px)" }}
        className="p-7 space-y-6 flex-grow flex flex-col justify-between bg-black/20"
      >
        <div className="space-y-2">
          <h3 className={`font-display font-black text-on-surface truncate group-hover:text-emerald-400 transition-colors tracking-tight ${isFirst ? 'text-[28px]' : 'text-[22px]'}`} title={item.file_name}>
            {item.file_name}
          </h3>
          <p className="text-[13px] text-on-surface-variant/80 flex items-center gap-1.5 font-medium">
            par <Link href={`/u/${item.creator_name || item.user_id}`} onClick={(e) => e.stopPropagation()} className="relative z-20 text-on-surface hover:text-emerald-300 transition-colors">@{item.creator_name || 'créateur'}</Link>
            {item.creator_is_pro && (
              <span className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase select-none">
                PRO
              </span>
            )}
          </p>
        </div>

        <div className="flex justify-between items-center border-t border-white/5 pt-5">
          <div className="flex gap-5 text-on-surface-variant text-[13px] font-bold">
            <span className="flex items-center gap-1.5" title="Vues">
              <span className="material-symbols-outlined text-[18px] opacity-70">visibility</span>
              <span>{item.views || 0}</span>
            </span>
            <span className="flex items-center gap-1.5" title="J'aime">
              <span className="material-symbols-outlined text-[18px] text-error/90">favorite</span>
              <span>{item.likes || 0}</span>
            </span>
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={(e) => onLike(e, item)}
              className={`relative z-20 w-10 h-10 rounded-xl border transition-all flex items-center justify-center active:scale-90 ${isLiked ? 'bg-error/15 border-error/40 text-error shadow-[0_0_20px_rgba(255,100,100,0.2)]' : 'bg-white/5 border-white/10 text-on-surface hover:text-error hover:bg-error/10 hover:border-error/30'}`}
            >
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: isLiked ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
            </button>
            <button
              onClick={(e) => onShare(e, item)}
              className="relative z-20 w-10 h-10 rounded-xl border bg-white/5 border-white/10 text-on-surface hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all flex items-center justify-center active:scale-90"
            >
              <span className="material-symbols-outlined text-[18px]">share</span>
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
