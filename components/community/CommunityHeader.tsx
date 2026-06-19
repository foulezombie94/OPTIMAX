export function CommunityHeader() {
  return (
    <div className="text-center max-w-3xl mx-auto space-y-5 relative">
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest select-none">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
        Showroom Virtuel
      </div>
      
      <h1 className="font-display text-[36px] sm:text-[48px] md:text-[68px] font-black text-on-surface tracking-tighter leading-none bg-clip-text text-transparent bg-gradient-to-r from-primary via-tertiary to-secondary break-words">
        Galerie de la Communauté
      </h1>
      <p className="text-body-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed font-light">
        Découvrez les modèles 3D optimisés et partagés publiquement par nos créateurs. Inspectez les fichiers en temps réel avec notre visualiseur WebGL natif.
      </p>
    </div>
  );
}
