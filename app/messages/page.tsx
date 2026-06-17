'use client';

import { useState } from 'react';

export default function MessagesIndex() {
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState('Prêt pour la simulation');
  const [optimizedSize, setOptimizedSize] = useState(184.2);
  const originalSize = 184.2;

  // Run the simulation workflow
  const startSimulation = () => {
    if (status === 'running') return;
    
    setStatus('running');
    setProgress(0);
    setCurrentStage('Lecture des métadonnées...');
    setOptimizedSize(originalSize);

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 2;
      setProgress(currentProgress);

      if (currentProgress < 25) {
        setCurrentStage('Analyse des sommets (mesh)...');
        // minor fluctuations
        setOptimizedSize(parseFloat((originalSize - (currentProgress * 0.4)).toFixed(1)));
      } else if (currentProgress < 55) {
        setCurrentStage('Simplification géométrique...');
        // reduce size significantly
        const ratio = (currentProgress - 25) / 30; // 0 to 1
        const target = originalSize - (originalSize - 82.5) * ratio;
        setOptimizedSize(parseFloat(target.toFixed(1)));
      } else if (currentProgress < 80) {
        setCurrentStage('Compression des textures (KTX2)...');
        const ratio = (currentProgress - 55) / 25; // 0 to 1
        const target = 82.5 - (82.5 - 34.1) * ratio;
        setOptimizedSize(parseFloat(target.toFixed(1)));
      } else if (currentProgress < 100) {
        setCurrentStage('Optimisation finale GLB...');
        const ratio = (currentProgress - 80) / 20; // 0 to 1
        const target = 34.1 - (34.1 - 18.2) * ratio;
        setOptimizedSize(parseFloat(target.toFixed(1)));
      } else {
        clearInterval(interval);
        setProgress(100);
        setCurrentStage('Optimisation terminée !');
        setOptimizedSize(18.2);
        setStatus('done');
      }
    }, 80);
  };

  const compressionRatio = parseFloat(((1 - optimizedSize / originalSize) * 100).toFixed(1));

  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white via-slate-50/60 to-blue-50/40 p-6 md:p-10 select-none font-sans relative overflow-hidden">
      
      {/* Premium Technical Grid Mask */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40 pointer-events-none"></div>

      {/* Decorative ambient glowing blur blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-blue-400/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-indigo-400/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Dual Column Layout container */}
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        
        {/* Left Column: Heading and feature cards */}
        <div className="lg:col-span-7 flex flex-col text-left space-y-6">
          
          {/* Badge & Icon Title */}
          <div className="flex items-center gap-3.5">
            {/* Animated Ring Gradient Icon */}
            <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 via-indigo-500/20 to-purple-500/20 rounded-xl blur-sm animate-pulse"></div>
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-indigo-500/10 rounded-xl border border-blue-500/20"></div>
              <div className="w-9 h-9 bg-white border border-slate-200 rounded-lg flex items-center justify-center shadow-sm relative z-10 transition-transform hover:scale-105 duration-300">
                <span className="material-symbols-outlined text-[20px] bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 font-bold">
                  chat_bubble
                </span>
              </div>
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider text-blue-600 uppercase bg-blue-50 border border-blue-100/50 px-2.5 py-0.5 rounded-full">
                Workspace Collaboratif
              </span>
            </div>
          </div>

          {/* Core Headlines */}
          <div>
            <h1 className="text-[28px] md:text-[32px] font-black text-slate-900 tracking-tight leading-tight mb-3">
              Sélectionnez une discussion pour commencer
            </h1>
            <p className="text-[14px] text-slate-500 leading-relaxed max-w-lg">
              Choisissez un créateur ou un client dans la barre latérale pour initier un échange sécurisé, réviser des livrables 3D et gérer vos contrats.
            </p>
          </div>

          {/* Grid of beautifully designed feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            
            {/* Card 1 */}
            <div className="p-4 bg-white/80 border border-slate-100/80 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.015)] hover:border-slate-200 hover:bg-white hover:shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition-all duration-300 group">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100/30 mb-3 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-blue-600 text-[18px] font-bold">verified_user</span>
              </div>
              <h4 className="text-[13px] font-bold text-slate-800">Messagerie Sécurisée</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Chiffrement et intégrité absolue pour vos échanges de projets.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-4 bg-white/80 border border-slate-100/80 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.015)] hover:border-slate-200 hover:bg-white hover:shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition-all duration-300 group">
              <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center border border-emerald-100/30 mb-3 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-emerald-600 text-[18px] font-bold">view_in_ar</span>
              </div>
              <h4 className="text-[13px] font-bold text-slate-800">Partage 3D Intégré</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Visualisez et révisez les fichiers STL, OBJ et GLB reçus.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-4 bg-white/80 border border-slate-100/80 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.015)] hover:border-slate-200 hover:bg-white hover:shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition-all duration-300 group">
              <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center border border-purple-100/30 mb-3 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-purple-600 text-[18px] font-bold">bolt</span>
              </div>
              <h4 className="text-[13px] font-bold text-slate-800">Liquid-Fast Rendering</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Optimisez la taille et la fluidité de vos livrables 3D.
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-4 bg-white/80 border border-slate-100/80 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.015)] hover:border-slate-200 hover:bg-white hover:shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition-all duration-300 group">
              <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center border border-amber-100/30 mb-3 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-amber-600 text-[18px] font-bold">payments</span>
              </div>
              <h4 className="text-[13px] font-bold text-slate-800">Devis & Contrats</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Envoyez des propositions financières reliées à vos livrables.
              </p>
            </div>

          </div>

        </div>

        {/* Right Column: Interactive 3D Simulator widget */}
        <div className="lg:col-span-5 w-full flex justify-center">
          
          <div className="w-full max-w-sm bg-white border border-slate-250/60 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden relative">
            {/* Header top bar */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200/60 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
              </div>
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                OptiMax Core v2.4
              </span>
            </div>

            {/* Simulator screen body */}
            <div className="p-5 flex flex-col items-center">
              
              {/* Rotating wireframe preview box */}
              <div className="w-full h-44 bg-slate-900 rounded-xl relative flex items-center justify-center overflow-hidden mb-4 shadow-inner">
                {/* Tech grid overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:1rem_1rem]"></div>
                
                {/* 3D wireframe mesh simulation */}
                <div className="relative z-10 flex flex-col items-center">
                  <svg className={`w-24 h-24 text-blue-500/40 ${status === 'running' ? 'animate-[spin_4s_linear_infinite]' : 'animate-[spin_12s_linear_infinite]'}`} viewBox="0 0 100 100">
                    <polygon points="50,15 90,35 90,75 50,95 10,75 10,35" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 2" />
                    <polygon points="50,15 50,95" fill="none" stroke="currentColor" strokeWidth="0.6" />
                    <polygon points="10,35 90,75" fill="none" stroke="currentColor" strokeWidth="0.6" />
                    <polygon points="90,35 10,75" fill="none" stroke="currentColor" strokeWidth="0.6" />
                    
                    {/* Inner core shape representing compression */}
                    <circle cx="50" cy="55" r={status === 'running' ? 18 : 28} fill="none" stroke="url(#gradient3d)" strokeWidth="1.5" className="transition-all duration-700" />
                    <defs>
                      <linearGradient id="gradient3d" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                {/* Animated status tags */}
                <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded border border-white/10 text-[9px] text-blue-400 font-mono tracking-wider">
                  MESH: ACTIVE
                </div>

                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded border border-white/10 text-[9px] text-emerald-400 font-mono tracking-wider">
                  FPS: 60.0
                </div>

                {status === 'running' && (
                  <div className="absolute inset-0 bg-blue-600/5 flex items-center justify-center">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-[bounce_2s_infinite]"></div>
                  </div>
                )}
              </div>

              {/* Dynamic File Statistics */}
              <div className="w-full space-y-2.5 mb-4">
                
                {/* File name */}
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-slate-400 font-medium">Fichier d&apos;essai</span>
                  <span className="text-slate-700 font-bold font-mono">engine_manifold_v2.obj</span>
                </div>

                {/* Original vs Optimized Size */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 border border-slate-100 p-2 rounded-lg text-left">
                    <span className="block text-[10px] text-slate-400 uppercase font-semibold">Taille Initiale</span>
                    <span className="text-[14px] font-black text-slate-700 font-mono">{originalSize} MB</span>
                  </div>
                  <div className={`border p-2 rounded-lg text-left transition-colors duration-300 ${
                    status === 'done' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <span className="block text-[10px] text-slate-400 uppercase font-semibold">Taille Optimisée</span>
                    <span className={`text-[14px] font-black font-mono transition-colors ${
                      status === 'done' ? 'text-emerald-600' : 'text-slate-700'
                    }`}>{optimizedSize} MB</span>
                  </div>
                </div>

                {/* Reduction Ratio Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-slate-400">Ratio de compression</span>
                    <span className={status === 'done' ? 'text-emerald-600' : 'text-blue-600'}>
                      {status === 'idle' ? '0.0%' : `-${compressionRatio}%`}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 rounded-full ${
                        status === 'done' ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                      }`}
                      style={{ width: `${status === 'idle' ? 0 : compressionRatio}%` }}
                    ></div>
                  </div>
                </div>

              </div>

              {/* Progress and status line */}
              <div className="w-full flex items-center justify-between text-[11px] font-medium border-t border-slate-100 pt-3.5 mb-4">
                <span className="text-slate-400">Statut du moteur</span>
                <span className={`font-mono font-bold ${
                  status === 'running' ? 'text-blue-600' : status === 'done' ? 'text-emerald-600' : 'text-slate-500'
                }`}>
                  {currentStage}
                </span>
              </div>

              {/* Action Button */}
              <button 
                onClick={startSimulation}
                disabled={status === 'running'}
                className={`w-full py-2.5 px-4 rounded-xl text-[13px] font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
                  status === 'running' 
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    : status === 'done'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-[0_4px_12px_rgba(16,185,129,0.2)]'
                    : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-[0_4px_12px_rgba(15,23,42,0.15)]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px] animate-none">
                  {status === 'running' ? 'sync' : status === 'done' ? 'check_circle' : 'play_arrow'}
                </span>
                {status === 'running' 
                  ? `Optimisation en cours... ${progress}%`
                  : status === 'done'
                  ? 'Recommencer le test'
                  : 'Simuler une optimisation'
                }
              </button>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
