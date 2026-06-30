'use client';

export default function MessagesIndex() {
  return (
    <div className="flex-1 w-full h-full flex flex-col items-center justify-center bg-black/40 relative overflow-hidden select-none">
      
      {/* Subtle ambient light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div className="flex flex-col items-center justify-center text-center z-10 p-8 max-w-md animate-in fade-in slide-in-from-bottom-4 duration-1000">
        
        {/* Sleek icon container */}
        <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent opacity-50 group-hover:opacity-80 transition-opacity duration-500"></div>
          <span className="material-symbols-outlined text-4xl text-white/80 group-hover:scale-110 transition-transform duration-500" style={{ fontVariationSettings: "'FILL' 1" }}>
            forum
          </span>
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-3 tracking-tight">
          Vos discussions
        </h1>
        <p className="text-[#8e8e93] text-[15px] leading-relaxed font-medium">
          Sélectionnez un contact dans le menu latéral pour démarrer une conversation, partager des fichiers 3D ou gérer vos contrats en toute sécurité.
        </p>
      </div>
      
    </div>
  );
}
