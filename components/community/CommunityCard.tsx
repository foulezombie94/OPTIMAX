import Link from 'next/link';
import { ThreeViewer } from '@/components/OptimizationsGrid';
import { PublicOptimization } from './types';

type CommunityCardProps = {
  item: PublicOptimization;
  isLiked: boolean;
  onOpen: (item: PublicOptimization) => void;
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

export function CommunityCard({ item, isLiked, onOpen, onLike, onShare }: CommunityCardProps) {
  // Premium Emerald theme for 3D Cards
  const themeColor = 'from-emerald-500/5 to-teal-500/5 hover:border-emerald-500/30 tech-card-glow';
  const badgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  const cardIcon = 'view_in_ar';
  const fileTypeLabel = item.fileTypeLabel || '3D';

  return (
    <article 
      className={`relative glass-panel rounded-3xl overflow-hidden group transition-all duration-500 hover:-translate-y-2 bg-[#141419]/40 flex flex-col justify-between border border-white/5 ${themeColor}`}
    >
      <Link 
        href={`/community?show=${item.id}`}
        onClick={(e) => {
          e.preventDefault();
          onOpen(item);
        }}
        shallow
        className="absolute inset-0 z-10"
        aria-label={`Voir le modèle 3D: ${item.file_name}`}
      />
      {/* Model Thumbnail container */}
      <div className="relative w-full h-60 bg-gradient-to-tr flex flex-col items-center justify-center overflow-hidden border-b border-white/5">
        {/* Pulse glow overlay */}
        <div className="absolute w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none animate-pulse-glow"></div>
        
        <div className="absolute inset-0 tech-grid opacity-[0.25] pointer-events-none mix-blend-overlay"></div>
        
        {item.preview_url ? (
          <div className="absolute inset-0 w-full h-full pointer-events-none">
            <ThreeViewer src={item.preview_url} fileType={item.file_type} showLegend={false} />
          </div>
        ) : (
          /* Floating model symbol */
          <span 
            className="material-symbols-outlined text-[76px] text-emerald-400/80 group-hover:text-emerald-300 drop-shadow-[0_0_20px_rgba(78,222,163,0.35)] transition-all duration-700 ease-out group-hover:scale-110 animate-float-gentle"
          >
            {cardIcon}
          </span>
        )}
        
        {/* Format pill */}
        <span className={`absolute top-4 right-4 border px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-md ${badgeColor}`}>
          {fileTypeLabel}
        </span>

        {/* File Size Badge */}
        <div className="absolute bottom-4 left-4 bg-background/70 backdrop-blur-md border border-white/5 px-3.5 py-1.5 rounded-xl text-on-surface-variant text-[11px] font-semibold flex items-center gap-1.5 shadow-md select-none">
          <span className="material-symbols-outlined text-[14px] text-emerald-400">save</span>
          {formatBytes(item.compressed_size)}
        </div>
      </div>

      {/* Body Content */}
      <div className="p-6 space-y-5 flex-grow flex flex-col justify-between">
        <div className="space-y-1">
          <h3 className="font-label-lg text-label-lg text-on-surface truncate group-hover:text-emerald-400 transition-colors font-bold tracking-tight" title={item.file_name}>
            {item.file_name}
          </h3>
          <p className="text-body-sm text-on-surface-variant flex items-center gap-1.5">
            par <Link href={`/u/${item.creator_name || item.user_id}`} onClick={(e) => e.stopPropagation()} className="relative z-20 text-on-surface font-semibold hover:text-emerald-300 transition-colors">@{item.creator_name || 'créateur'}</Link>
            {item.creator_is_pro && (
              <span className="bg-tertiary/20 text-tertiary border border-tertiary/30 px-1.5 py-0.5 rounded-md text-[9px] font-bold tracking-wider uppercase select-none">
                PRO
              </span>
            )}
          </p>
        </div>

        {/* Stats footer & Interventions */}
        <div className="flex justify-between items-center border-t border-white/5 pt-4">
          {/* Social counts */}
          <div className="flex gap-4.5 text-on-surface-variant text-[12px] font-semibold">
            <span className="flex items-center gap-1" title="Vues">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant/70">visibility</span>
              <span>{item.views || 0}</span>
            </span>
            <span className="flex items-center gap-1" title="J'aime">
              <span className="material-symbols-outlined text-[16px] text-error">favorite</span>
              <span>{item.likes || 0}</span>
            </span>
          </div>

          {/* Interactive Buttons */}
          <div className="flex gap-2">
            <button
              onClick={(e) => onLike(e, item)}
              className={`relative z-20 p-2.5 rounded-xl border transition-all flex items-center justify-center active:scale-90 ${isLiked ? 'bg-error/10 border-error/30 text-error shadow-[0_0_15px_rgba(255,100,100,0.1)]' : 'glass-panel text-on-surface-variant hover:text-error hover:bg-error/5 hover:border-error/20'}`}
              title={isLiked ? 'Déjà aimé' : 'Aimer la création'}
            >
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: isLiked ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
            </button>
            <button
              onClick={(e) => onShare(e, item)}
              className="relative z-20 p-2.5 rounded-xl border glass-panel text-on-surface-variant hover:text-emerald-400 hover:bg-emerald-500/5 hover:border-emerald-500/20 transition-all flex items-center justify-center active:scale-90"
              title="Partager la création"
            >
              <span className="material-symbols-outlined text-[18px]">share</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
