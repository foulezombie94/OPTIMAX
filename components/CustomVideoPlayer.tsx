'use client';

import React, { useRef, useState, useEffect } from 'react';

const formatTime = (time: number) => {
  if (isNaN(time)) return '00:00';
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default function CustomVideoPlayer({ src, className = "" }: { src: string, className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true); // Commence en chargement
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [showSeekAnimation, setShowSeekAnimation] = useState<'forward' | 'backward' | null>(null);

  // Tooltip de survol sur la barre de temps
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting && videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      });
    }, { threshold: 0.2 });

    const currentRef = containerRef.current;
    if (currentRef) observer.observe(currentRef);
    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const total = videoRef.current.duration || 1;
      setCurrentTime(current);
      setProgress((current / total) * 100);
    }
  };

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(err => console.error(err));
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const isRightSide = x > rect.width / 2;

      if (isRightSide) {
        videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
        setShowSeekAnimation('forward');
      } else {
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
        setShowSeekAnimation('backward');
      }
      setTimeout(() => setShowSeekAnimation(null), 500);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen().catch(err => console.error(err));
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  const handleProgressClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (progressRef.current && videoRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      const newTime = percentage * (videoRef.current.duration || 1);
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      setProgress(percentage * 100);
    }
  };

  const handleProgressMouseMove = (e: React.MouseEvent) => {
    if (progressRef.current && videoRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const percentage = x / rect.width;
      setHoverPosition(percentage * 100);
      setHoverTime(percentage * (videoRef.current.duration || 1));
    }
  };

  const handleProgressMouseLeave = () => {
    setHoverTime(null);
  };

  return (
    <div 
      ref={containerRef}
      className={`relative group overflow-hidden bg-[#111] cursor-pointer select-none ${className} transition-all duration-500`} 
      onClick={handlePlayPause}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setIsHovering(false);
        setHoverTime(null);
      }}
    >
      <video
        ref={videoRef}
        src={src}
        className={`w-full h-full object-cover transition-opacity duration-700 ${isBuffering && !isPlaying ? 'opacity-0' : 'opacity-100'}`}
        playsInline
        muted={isMuted}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={() => setIsBuffering(false)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        loop
        preload="metadata"
      />

      {/* État de chargement (Buffering) */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] pointer-events-none z-10">
          <div className="w-10 h-10 border-[3px] border-white/20 border-t-[#f23c57] rounded-full animate-spin shadow-[0_0_15px_rgba(242,60,87,0.5)]"></div>
        </div>
      )}

      {/* Animation Double Tap */}
      {showSeekAnimation && (
        <div className={`absolute top-0 bottom-0 w-1/2 flex items-center justify-center bg-white/20 animate-pulse pointer-events-none z-10 ${showSeekAnimation === 'backward' ? 'left-0 rounded-r-[100%]' : 'right-0 rounded-l-[100%]'}`}>
          <div className="flex flex-col items-center gap-1 opacity-80">
            <span className="material-symbols-outlined text-white text-[32px] animate-bounce">
              {showSeekAnimation === 'backward' ? 'fast_rewind' : 'fast_forward'}
            </span>
            <span className="text-white font-bold text-[14px]">
              {showSeekAnimation === 'backward' ? '-10s' : '+10s'}
            </span>
          </div>
        </div>
      )}

      {/* Bouton Play Central (Masqué en Buffering et en Lecture) */}
      {!isPlaying && !isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none transition-opacity duration-300 z-10">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)] transform transition-all duration-300 group-hover:scale-110">
            <span className="material-symbols-outlined text-white text-[36px] ml-1 opacity-90 drop-shadow-md" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
          </div>
        </div>
      )}

      {/* Gradient d'assombrissement supérieur pour le bouton Fullscreen */}
      <div className={`absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/60 to-transparent transition-opacity duration-300 z-10 pointer-events-none ${isPlaying && !isHovering ? 'opacity-0' : 'opacity-100'}`}></div>

      {/* Bouton Fullscreen (Top Right) */}
      <div 
        className={`absolute top-2 right-2 transition-opacity duration-300 z-20 ${isPlaying && !isHovering ? 'opacity-0' : 'opacity-100'}`}
      >
        <button 
          onClick={toggleFullscreen}
          className="w-8 h-8 bg-black/30 hover:bg-black/60 rounded-full flex items-center justify-center backdrop-blur-md transition-all text-white/90 hover:text-white"
        >
          <span className="material-symbols-outlined text-[20px]">
            {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
          </span>
        </button>
      </div>

      {/* CONTROLES DU BAS */}
      <div 
        className={`absolute bottom-0 left-0 right-0 pt-16 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end transition-opacity duration-300 z-20 ${isPlaying && !isHovering ? 'opacity-0' : 'opacity-100'}`}
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex items-center justify-between mb-3 px-3">
          <div className="text-white font-mono text-[11px] font-bold tracking-wider drop-shadow-md">
            {formatTime(currentTime)} <span className="text-white/50 mx-1">/</span> <span className="text-white/70">{formatTime(duration)}</span>
          </div>

          <button 
            onClick={toggleMute}
            className="w-7 h-7 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md transition-all text-white border border-white/10"
          >
            <span className="material-symbols-outlined text-[15px]">
              {isMuted ? 'volume_off' : 'volume_up'}
            </span>
          </button>
        </div>

        {/* Barre de Progression Interactive */}
        <div 
          ref={progressRef}
          className="w-full h-1.5 bg-white/20 relative cursor-pointer group/progress transition-all hover:h-2.5"
          onClick={handleProgressClick}
          onMouseMove={handleProgressMouseMove}
          onMouseLeave={handleProgressMouseLeave}
        >
          {/* Tooltip de temps au survol */}
          {hoverTime !== null && (
            <div 
              className="absolute bottom-full mb-2 -translate-x-1/2 bg-black/80 text-white text-[10px] font-bold py-1 px-2 rounded-md shadow-lg pointer-events-none transition-opacity duration-150"
              style={{ left: `${hoverPosition}%` }}
            >
              {formatTime(hoverTime)}
              {/* Petit triangle sous la tooltip */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black/80"></div>
            </div>
          )}

          <div 
            className="h-full bg-[#f23c57] relative shadow-[0_0_12px_rgba(242,60,87,0.6)]"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)] opacity-0 group-hover/progress:opacity-100 transition-opacity duration-200"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
