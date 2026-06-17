'use client';

import { useState, useRef, useEffect } from 'react';

export default function ComparisonWidget({ 
  originalFile, 
  compressedFile 
}: { 
  originalFile: File | null, 
  compressedFile: File | Blob | null 
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let percentage = ((clientX - rect.left) / rect.width) * 100;
    if (percentage < 0) percentage = 0;
    if (percentage > 100) percentage = 100;
    setSliderPosition(percentage);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    handleMove(e.touches[0].clientX);
  };

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: true });
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  const [originalUrl, setOriginalUrl] = useState<string>('');
  const [compressedUrl, setCompressedUrl] = useState<string>('');

  useEffect(() => {
    if (originalFile) {
      const url = URL.createObjectURL(originalFile);
      setOriginalUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [originalFile]);

  useEffect(() => {
    if (compressedFile) {
      const url = URL.createObjectURL(compressedFile);
      setCompressedUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [compressedFile]);

  if (!originalFile || !compressedFile || !originalUrl || !compressedUrl) return null;

  const originalSize = (originalFile.size / 1024 / 1024).toFixed(1);
  const compressedSize = (compressedFile.size / 1024 / 1024).toFixed(1);

  return (
    <div 
      className="glass-panel rounded-xl flex-1 relative overflow-hidden h-64 lg:h-auto min-h-[300px]" 
      ref={containerRef}
      onMouseDown={(e) => {
        setIsDragging(true);
        handleMove(e.clientX);
      }}
      onTouchStart={(e) => {
        setIsDragging(true);
        handleMove(e.touches[0].clientX);
      }}
      style={{ userSelect: 'none' }}
    >
      {/* Labels */}
      <div className="absolute top-4 left-4 z-20 px-2 py-1 rounded bg-black/50 backdrop-blur-md border border-white/10 font-label-md text-label-md text-on-surface pointer-events-none">Original ({originalSize}MB)</div>
      <div className="absolute top-4 right-4 z-20 px-2 py-1 rounded bg-black/50 backdrop-blur-md border border-white/10 font-label-md text-label-md text-primary pointer-events-none">Optimized ({compressedSize}MB)</div>
      
      {/* Underlay (Optimized) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <img 
          alt="Optimized Image" 
          className="w-full h-full object-cover" 
          src={compressedUrl}
        />
      </div>
      
      {/* Overlay (Original) */}
      <div 
        className="absolute inset-0 pointer-events-none border-r-2 border-primary" 
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`, borderRightWidth: sliderPosition < 100 ? '2px' : '0px' }}
      >
        <img 
          alt="Original Image" 
          className="w-full h-full object-cover filter contrast-75 brightness-90 sepia-[.2]" 
          src={originalUrl}
        />
      </div>
      
      {/* Slider Handle */}
      <div 
        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-[32px] h-[32px] bg-surface-container-highest border-2 border-primary rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(0,0,0,0.5),_0_0_15px_var(--color-primary-container)] z-10 pointer-events-none" 
        style={{ left: `${sliderPosition}%` }}
      >
        <span className="material-symbols-outlined text-[16px] text-on-surface">swap_horiz</span>
      </div>
    </div>
  );
}
