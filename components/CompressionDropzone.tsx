'use client';

import { useState, useRef, useEffect } from 'react';
import imageCompression from 'browser-image-compression';
import { saveOptimization } from '@/app/actions/optimizations';
import { createClient } from '@/utils/supabase/client';
import { useTranslation } from '@/contexts/TranslationContext';

type CompressionStatus = 'idle' | 'compressing' | 'done' | 'error';

export default function CompressionDropzone({ 
  onOptimizationComplete, 
  onOptimizationStart, 
  onReset 
}: { 
  onOptimizationComplete?: (original: File, compressed: File | Blob) => void,
  onOptimizationStart?: (original: File) => void,
  onReset?: () => void
}) {
  const { t } = useTranslation();
  const [isDragActive, setIsDragActive] = useState(false);
  const [status, setStatus] = useState<CompressionStatus>('idle');
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [compressedFile, setCompressedFile] = useState<File | Blob | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [progress, setProgress] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPro, setIsPro] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const supabase = createClient();
    
    const fetchProStatus = async (userId: string) => {
      try {
        const { data } = await supabase.from('profiles').select('is_pro').eq('id', userId).single();
        setIsPro(!!data?.is_pro);
      } catch (e) {
        console.error('Error fetching pro status', e);
      }
    };

    supabase.auth.getSession().then((res: any) => {
      const session = res?.data?.session;
      setIsLoggedIn(!!session);
      if (session?.user) {
        fetchProStatus(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setIsLoggedIn(!!session);
      if (session?.user) {
        fetchProStatus(session.user.id);
      } else {
        setIsPro(false);
      }
    });

    workerRef.current = new Worker(new URL('../utils/ffmpegWorker.ts', import.meta.url));
    return () => {
      workerRef.current?.terminate();
      subscription.unsubscribe();
    };
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const checkLimit = (): boolean => {
    if (isPro) return true;
    try {
      const today = new Date().toISOString().split('T')[0];
      const usage = JSON.parse(localStorage.getItem('optimax_usage') || '{}');
      if (usage.date !== today) {
        localStorage.setItem('optimax_usage', JSON.stringify({ date: today, count: 0 }));
        return true;
      }
      const limit = isLoggedIn ? 30 : 5;
      return usage.count < limit;
    } catch {
      return true;
    }
  };

  const incrementUsage = () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const usage = JSON.parse(localStorage.getItem('optimax_usage') || '{}');
      localStorage.setItem('optimax_usage', JSON.stringify({ 
        date: today, 
        count: (usage.date === today ? usage.count : 0) + 1 
      }));
    } catch (e) {
      console.error('Failed to update usage', e);
    }
  };

  const uploadPreview = async (fileBlob: File | Blob, originalName: string): Promise<string | undefined> => {
    if (!isLoggedIn) return undefined;
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return undefined;

      // Ensure we don't upload full videos as previews to save space (for now)
      if (fileBlob.type.startsWith('video/')) return undefined;

      // Prevent StorageApiError: exceeded max size (50MB limit)
      const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50MB
      if (fileBlob.size > MAX_UPLOAD_SIZE) {
        console.warn(`File too large for preview upload (${(fileBlob.size / 1024 / 1024).toFixed(1)}MB > 50MB), skipping.`);
        return undefined;
      }

      const fileExt = originalName.split('.').pop();
      const fileName = `${session.user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('optimizations')
        .upload(fileName, fileBlob, { contentType: fileBlob.type });
        
      if (error) {
        console.error('Upload error:', error);
        return undefined;
      }
      
      const { data: publicUrlData } = supabase.storage
        .from('optimizations')
        .getPublicUrl(fileName);
        
      return publicUrlData.publicUrl;
    } catch (e) {
      console.error('Failed to upload preview', e);
      return undefined;
    }
  };

  const handleFile = async (file: File) => {
    // Reject 3D model files in the Media tab
    if (file.name.match(/\.(obj|fbx|stl|glb|gltf|ply|dae)$/i) || file.type.startsWith('model/')) {
      setErrorMsg(t("Les modèles 3D ne sont pas autorisés dans la section Media. Veuillez utiliser l'onglet Modèles 3D."));
      setStatus('error');
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      setErrorMsg(t('La taille du fichier dépasse la limite de 500 Mo.'));
      setStatus('error');
      return;
    }

    if (!checkLimit()) {
      const limit = isLoggedIn ? 30 : 5;
      setErrorMsg(t(`Vous avez atteint la limite de ${limit} fichiers par jour. Passez à l'illimité pour 2$/mois.`));
      setStatus('error');
      return;
    }

    setOriginalFile(file);
    setStatus('compressing');
    setErrorMsg('');
    setCompressedFile(null);
    onOptimizationStart?.(file);

    try {
      setProgress(0);
      if (file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
        const options = {
          maxSizeMB: file.size / 1024 / 1024 > 5 ? 3 : 1, // Moins agressif pour les gros fichiers
          maxWidthOrHeight: 3840, // Support 4K
          useWebWorker: true,
          initialQuality: 0.85, // Conserver la qualité visuelle
        };
        const compressedBlob = await imageCompression(file, options);
        setCompressedFile(compressedBlob);
        onOptimizationComplete?.(file, compressedBlob);
        const previewUrl = await uploadPreview(compressedBlob, file.name);
        saveOptimization(file.name, file.size, compressedBlob.size, file.type, previewUrl).catch(console.error);
      } else if (file.type.startsWith('video/')) {
        if (!workerRef.current) {
          workerRef.current = new Worker(new URL('../utils/ffmpegWorker.ts', import.meta.url));
        }
        const worker = workerRef.current;
        
        await new Promise<void>((resolve, reject) => {
          worker.onmessage = (e) => {
            const { type, progress: p, blob, error } = e.data;
            if (type === 'progress') {
              setProgress(p);
            } else if (type === 'done') {
              setCompressedFile(blob);
              onOptimizationComplete?.(file, blob);
              saveOptimization(file.name, file.size, blob.size, file.type).catch(console.error);
              resolve();
            } else if (type === 'error') {
              reject(new Error(error));
            }
          };
          worker.postMessage({ type: 'compress', file });
        });
      } else {
        // Accept SVGs sans compression pour le moment
        await new Promise(resolve => setTimeout(resolve, 500));
        setCompressedFile(file);
        onOptimizationComplete?.(file, file);
        const previewUrl = await uploadPreview(file, file.name);
        saveOptimization(file.name, file.size, file.size, file.type, previewUrl).catch(console.error);
      }
      incrementUsage();
      setStatus('done');
    } catch (error: any) {
      console.error('Compression error', error);
      setErrorMsg(error.message || t('Erreur lors de la compression'));
      setStatus('error');
    }
  };

  const downloadFile = () => {
    if (!compressedFile || !originalFile) return;
    const url = URL.createObjectURL(compressedFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optimax_${originalFile.name}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="lg:col-span-7 dropzone-container group h-full">
      <div 
        className={`glass-panel dropzone-glow rounded-xl h-full min-h-[400px] flex flex-col items-center justify-center p-8 relative overflow-hidden cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/5' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileInput}
          accept="image/*,video/*"
        />

        <div className="absolute inset-0 tech-grid opacity-20 pointer-events-none mix-blend-overlay"></div>
        
        {status === 'idle' && (
          <div className="relative z-10 flex flex-col items-center gap-6 text-center pointer-events-none">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full animate-[spin_10s_linear_infinite] opacity-30 group-hover:opacity-100 group-hover:text-primary transition-opacity duration-500" viewBox="0 0 100 100">
                <circle cx="50" cy="50" fill="none" r="48" stroke="currentColor" strokeDasharray="10 6" strokeWidth="2"></circle>
              </svg>
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors duration-300" style={{ fontSize: '48px' }}>cloud_upload</span>
            </div>
            <div>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-2">{t('Déposez votre fichier ici')}</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">{t('ou cliquez pour parcourir vos dossiers locaux')}</p>
            </div>
            <div className="flex gap-3 mt-4">
              <span className="px-3 py-1 rounded-full bg-surface-container-high border border-outline-variant font-code text-code text-on-surface-variant group-hover:border-primary/30 group-hover:text-primary transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">html</span> SVG
              </span>
              <span className="px-3 py-1 rounded-full bg-surface-container-high border border-outline-variant font-code text-code text-on-surface-variant group-hover:border-primary/30 group-hover:text-primary transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">image</span> WebP
              </span>
              <span className="px-3 py-1 rounded-full bg-surface-container-high border border-outline-variant font-code text-code text-on-surface-variant group-hover:border-primary/30 group-hover:text-primary transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">photo</span> PNG
              </span>
              <span className="px-3 py-1 rounded-full bg-surface-container-high border border-outline-variant font-code text-code text-on-surface-variant group-hover:border-primary/30 group-hover:text-primary transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">movie</span> MP4
              </span>
            </div>
          </div>
        )}

        {status === 'compressing' && (
          <div className="relative z-10 flex flex-col items-center gap-4">
            <span className="material-symbols-outlined text-primary animate-spin" style={{ fontSize: '48px' }}>autorenew</span>
            <p className="font-headline-md text-on-surface">Compression de {originalFile?.name}...</p>
            {progress > 0 && <p className="font-body-md text-primary">{Math.round(progress * 100)}%</p>}
          </div>
        )}

        {status === 'done' && (
          <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <span className="material-symbols-outlined text-tertiary" style={{ fontSize: '48px' }}>check_circle</span>
            <div className="text-center">
              <h3 className="font-headline-md text-on-surface mb-1">Optimisation réussie</h3>
              <p className="font-body-md text-on-surface-variant">
                Réduit de {(originalFile!.size / 1024 / 1024).toFixed(2)} Mo à {(compressedFile!.size / 1024 / 1024).toFixed(2)} Mo
              </p>
            </div>
            <button 
              onClick={downloadFile}
              className="w-full py-3 rounded-full bg-primary text-on-primary font-label-md hover:bg-primary-container hover:text-on-primary-container transition-colors"
            >
              Télécharger le fichier optimisé
            </button>
            <button 
              onClick={() => { setStatus('idle'); setOriginalFile(null); setCompressedFile(null); onReset?.(); }}
              className="text-primary hover:text-primary-container font-label-md mt-2"
            >
              Optimiser un autre fichier
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="relative z-10 flex flex-col items-center gap-4 text-center">
            <span className="material-symbols-outlined text-error" style={{ fontSize: '48px' }}>error</span>
            <p className="font-headline-md text-error">{errorMsg}</p>
            <button 
              onClick={(e) => { e.stopPropagation(); setStatus('idle'); }}
              className="mt-4 px-6 py-2 rounded-full border border-outline-variant hover:bg-surface-container transition-colors"
            >
              Réessayer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
