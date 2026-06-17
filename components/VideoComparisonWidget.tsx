'use client';

import { useState, useEffect } from 'react';

export default function VideoComparisonWidget({ 
  originalFile, 
  compressedFile 
}: { 
  originalFile: File | null, 
  compressedFile: File | Blob | null 
}) {
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
    <div className="glass-panel rounded-xl flex-1 flex flex-col gap-4 p-4 min-h-[300px]">
      <div className="grid grid-cols-2 gap-4 h-full">
        {/* Original */}
        <div className="relative flex flex-col rounded-lg overflow-hidden bg-black/50 border border-outline-variant/30">
          <div className="absolute top-3 left-3 z-20 px-2 py-1 rounded bg-black/60 backdrop-blur-md border border-white/10 font-label-md text-label-md text-on-surface pointer-events-none">
            Original ({originalSize}MB)
          </div>
          <video 
            src={originalUrl} 
            controls 
            className="w-full h-full object-contain" 
            muted
            loop
          />
        </div>

        {/* Optimized */}
        <div className="relative flex flex-col rounded-lg overflow-hidden bg-black/50 border border-outline-variant/30">
          <div className="absolute top-3 right-3 z-20 px-2 py-1 rounded bg-black/60 backdrop-blur-md border border-white/10 font-label-md text-label-md text-primary pointer-events-none">
            Optimized ({compressedSize}MB)
          </div>
          <video 
            src={compressedUrl} 
            controls 
            className="w-full h-full object-contain" 
            autoPlay 
            muted
            loop
          />
        </div>
      </div>
    </div>
  );
}
