'use client';

import { motion, Variants } from 'framer-motion';

export function CommunityHeader() {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20, filter: 'blur(10px)' },
    show: { 
      opacity: 1, 
      y: 0, 
      filter: 'blur(0px)',
      transition: { type: 'spring', bounce: 0.4, duration: 1 }
    },
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="text-center max-w-3xl mx-auto space-y-6 relative pt-10 pb-6"
    >
      {/* Animated Auras */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1],
          rotate: [0, 90, 0]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-500/20 rounded-[100%] blur-[120px] pointer-events-none"
      />
      
      <motion.div variants={itemVariants} className="relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(16,185,129,0.15)] select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          Showroom Virtuel Premium
        </div>
      </motion.div>
      
      <motion.h1 
        variants={itemVariants}
        className="relative z-10 font-display text-[42px] sm:text-[56px] md:text-[80px] font-black text-on-surface tracking-tighter leading-[1.1] bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-white/40 drop-shadow-sm break-words"
      >
        Galerie de la <br />
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-600 drop-shadow-[0_0_30px_rgba(16,185,129,0.3)]">
          Communauté
        </span>
      </motion.h1>
      
      <motion.p 
        variants={itemVariants}
        className="relative z-10 text-[16px] md:text-[18px] text-on-surface-variant max-w-2xl mx-auto leading-relaxed font-light"
      >
        Découvrez les modèles 3D optimisés et partagés publiquement par nos créateurs. Inspectez les fichiers en temps réel avec notre visualiseur <strong className="text-emerald-400/80 font-semibold">WebGL natif</strong>.
      </motion.p>
    </motion.div>
  );
}
