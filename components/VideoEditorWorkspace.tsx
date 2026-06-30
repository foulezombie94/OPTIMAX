'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { createClient } from '@/utils/supabase/client';
import { saveOptimization } from '@/app/actions/optimizations';
import { checkIsPro } from '@/utils/isPro';

export default function VideoEditorWorkspace({ 
  onEditComplete 
}: { 
  onEditComplete?: (original: File, edited: File | Blob, ext: string) => void
}) {
  const { t } = useTranslation();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [duration, setDuration] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [crop, setCrop] = useState<string>('original');
  const [filter, setFilter] = useState<string>('none');
  const [status, setStatus] = useState<'idle' | 'editing' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPro, setIsPro] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then((res: any) => {
      const session = res?.data?.session;
      setIsLoggedIn(!!session);
      if (session?.user) {
        supabase.from('profiles').select('is_pro, pro_until').eq('id', session.user.id).single().then(({ data }: { data: any }) => {
          setIsPro(checkIsPro(data));
        });
      }
    });

    workerRef.current = new Worker(new URL('../utils/ffmpegWorker.ts', import.meta.url));
    return () => {
      workerRef.current?.terminate();
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('video/')) {
      setErrorMsg(t('Veuillez sélectionner un fichier vidéo.'));
      setStatus('error');
      return;
    }
    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setStatus('idle');
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setStartTime(0);
      setEndTime(videoRef.current.duration);
    }
  };

  const startEditing = async () => {
    if (!videoFile || !workerRef.current) return;
    setStatus('editing');
    setProgress(0);
    setErrorMsg('');

    const worker = workerRef.current;
    await new Promise<void>((resolve, reject) => {
      worker.onmessage = (e) => {
        const { type, progress: p, blob, error } = e.data;
        if (type === 'progress') setProgress(p);
        else if (type === 'done') {
          setStatus('done');
          onEditComplete?.(videoFile, blob, videoFile.name.split('.').pop() || 'mp4');
          saveOptimization(videoFile.name, videoFile.size, blob.size, 'video_edit').catch(console.error);
          resolve();
        } else if (type === 'error') {
          setErrorMsg(error);
          setStatus('error');
          reject(new Error(error));
        }
      };
      
      worker.postMessage({ 
        type: 'edit', 
        file: videoFile, 
        startTime, 
        endTime, 
        crop, 
        filter,
        targetExt: videoFile.name.split('.').pop() || 'mp4'
      });
    });
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!videoFile) {
    return (
      <div className="lg:col-span-7 glass-panel dropzone-glow rounded-xl h-full min-h-[400px] flex flex-col items-center justify-center p-8 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
        <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={e => e.target.files && handleFile(e.target.files[0])} />
        <span className="material-symbols-outlined text-primary mb-4" style={{ fontSize: '48px' }}>movie_edit</span>
        <h2 className="font-headline-md text-on-surface mb-2">{t('Importer une vidéo pour le montage')}</h2>
        <p className="text-on-surface-variant">{t('Couper, recadrer et appliquer des filtres rapidement.')}</p>
      </div>
    );
  }

  if (status === 'editing') {
    return (
      <div className="lg:col-span-7 glass-panel rounded-xl h-full min-h-[400px] flex flex-col items-center justify-center">
        <span className="material-symbols-outlined text-primary animate-spin mb-4" style={{ fontSize: '48px' }}>autorenew</span>
        <h2 className="font-headline-md text-on-surface">Création du montage...</h2>
        <p className="text-primary mt-2">{Math.round(progress * 100)}%</p>
      </div>
    );
  }

  return (
    <div className="lg:col-span-7 glass-panel rounded-xl flex flex-col overflow-hidden h-full">
      {/* Player Area */}
      <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden">
        <video 
          ref={videoRef} 
          src={videoUrl} 
          className="max-h-full max-w-full" 
          controls 
          onLoadedMetadata={handleLoadedMetadata}
          style={{
            filter: filter === 'grayscale' ? 'grayscale(100%)' : filter === 'contrast' ? 'contrast(150%)' : 'none',
            objectFit: crop === 'original' ? 'contain' : 'cover',
            aspectRatio: crop === '16:9' ? '16/9' : crop === '9:16' ? '9/16' : crop === '1:1' ? '1/1' : 'auto'
          }}
        />
      </div>

      {/* Editor Controls */}
      <div className="p-6 flex flex-col gap-6 flex-1 overflow-y-auto">
        
        {/* Timeline Trimming */}
        <div className="flex flex-col gap-2">
          <label className="font-label-md text-on-surface flex justify-between">
            <span>{t('Découpage (Trimming)')}</span>
            <span className="text-primary">{formatTime(endTime - startTime)}</span>
          </label>
          <div className="flex items-center gap-4">
            <span className="text-sm font-code w-12 text-on-surface-variant">{formatTime(startTime)}</span>
            <input 
              type="range" 
              min={0} max={duration} step={0.1}
              value={startTime}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val < endTime) { setStartTime(val); videoRef.current && (videoRef.current.currentTime = val); }
              }}
              className="flex-1 accent-primary"
            />
            <input 
              type="range" 
              min={0} max={duration} step={0.1}
              value={endTime}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val > startTime) setEndTime(val);
              }}
              className="flex-1 accent-primary"
            />
            <span className="text-sm font-code w-12 text-on-surface-variant text-right">{formatTime(endTime)}</span>
          </div>
        </div>

        {/* Cropping Options */}
        <div className="flex flex-col gap-2">
          <label className="font-label-md text-on-surface">{t('Recadrage (Ratio)')}</label>
          <div className="flex gap-2">
            {[
              { id: 'original', label: 'Original', icon: 'crop_original' },
              { id: '16:9', label: 'YouTube (16:9)', icon: 'crop_16_9' },
              { id: '9:16', label: 'Reels (9:16)', icon: 'smartphone' },
              { id: '1:1', label: 'Carré (1:1)', icon: 'crop_square' }
            ].map(c => (
              <button 
                key={c.id} 
                onClick={() => setCrop(c.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 p-3 rounded-lg border transition-colors ${crop === c.id ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant text-on-surface-variant hover:border-outline'}`}
              >
                <span className="material-symbols-outlined text-[20px]">{c.icon}</span>
                <span className="text-xs">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-2">
          <label className="font-label-md text-on-surface">{t('Filtres Rapides')}</label>
          <div className="flex gap-2">
            {[
              { id: 'none', label: 'Aucun' },
              { id: 'grayscale', label: 'Noir & Blanc' },
              { id: 'contrast', label: 'Contraste Élevé' }
            ].map(f => (
              <button 
                key={f.id} 
                onClick={() => setFilter(f.id)}
                className={`flex-1 p-2 rounded-lg text-sm font-label-md border transition-colors ${filter === f.id ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {errorMsg && <div className="p-3 bg-error/10 text-error rounded-lg text-sm">{errorMsg}</div>}

        <div className="mt-auto pt-4 flex gap-4">
          <button onClick={() => { setVideoFile(null); setVideoUrl(''); }} className="flex-1 py-3 rounded-full border border-outline-variant text-on-surface font-label-md hover:bg-surface-container transition-colors">
            {t('Annuler')}
          </button>
          <button onClick={startEditing} className="flex-1 py-3 rounded-full bg-primary text-on-primary font-label-md hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-lg">
            {t('Exporter la vidéo')}
          </button>
        </div>

      </div>
    </div>
  );
}
