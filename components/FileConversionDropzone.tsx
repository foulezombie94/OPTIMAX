'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { saveOptimization } from '@/app/actions/optimizations';
import { useTranslation } from '@/contexts/TranslationContext';
import { checkIsPro } from '@/utils/isPro';

type ConversionStatus = 'idle' | 'converting' | 'done' | 'error';

const FORMATS = {
  image: [
    { value: 'image/webp', label: 'WEBP', ext: 'webp' },
    { value: 'image/png', label: 'PNG', ext: 'png' },
    { value: 'image/jpeg', label: 'JPG', ext: 'jpg' },
    { value: 'image/bmp', label: 'BMP', ext: 'bmp' },
    { value: 'application/pdf', label: 'Document PDF', ext: 'pdf' }
  ],
  video: [
    { value: 'video/mp4', label: 'MP4', ext: 'mp4' },
    { value: 'video/webm', label: 'WEBM', ext: 'webm' },
    { value: 'video/x-matroska', label: 'MKV', ext: 'mkv' },
    { value: 'video/x-msvideo', label: 'AVI', ext: 'avi' },
    { value: 'video/quicktime', label: 'MOV', ext: 'mov' },
    { value: 'video/x-flv', label: 'FLV', ext: 'flv' },
    { value: 'image/gif', label: 'GIF Animé', ext: 'gif' },
    { value: 'audio/mpeg', label: 'MP3 (Audio)', ext: 'mp3' }
  ],
  audio: [
    { value: 'audio/mpeg', label: 'MP3', ext: 'mp3' },
    { value: 'audio/wav', label: 'WAV', ext: 'wav' },
    { value: 'audio/ogg', label: 'OGG', ext: 'ogg' },
    { value: 'audio/flac', label: 'FLAC', ext: 'flac' },
    { value: 'audio/aac', label: 'AAC', ext: 'aac' },
    { value: 'audio/mp4', label: 'M4A', ext: 'm4a' }
  ],
  document: [
    { value: 'application/zip', label: 'Extraire en Images (ZIP)', ext: 'zip' }
  ]
};

export default function FileConversionDropzone({ 
  onConversionComplete, 
  onConversionStart, 
  onReset 
}: { 
  onConversionComplete?: (original: File, converted: File | Blob, ext: string) => void,
  onConversionStart?: (original: File) => void,
  onReset?: () => void
}) {
  const { t } = useTranslation();
  const [isDragActive, setIsDragActive] = useState(false);
  const [status, setStatus] = useState<ConversionStatus>('idle');
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [convertedFile, setConvertedFile] = useState<File | Blob | null>(null);
  const [convertedExt, setConvertedExt] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [progress, setProgress] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPro, setIsPro] = useState(false);
  
  const [targetFormat, setTargetFormat] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const supabase = createClient();
    
    const fetchProStatus = async (userId: string) => {
      try {
        const { data } = await supabase.from('profiles').select('is_pro, pro_until').eq('id', userId).single();
        setIsPro(checkIsPro(data));
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
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
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

  const handleFileSelect = (file: File) => {
    if (file.name.match(/\.(obj|fbx|stl|glb|gltf|ply|dae)$/i) || file.type.startsWith('model/')) {
      setErrorMsg(t("Les modèles 3D ne sont pas autorisés dans la section de conversion média."));
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
    setStatus('idle');
    setErrorMsg('');
    setConvertedFile(null);
    onReset?.();
    
    // Auto-select a target format that is different from the source
    let fileTypeGroup = null;
    if (file.type.startsWith('image/')) fileTypeGroup = 'image';
    else if (file.type.startsWith('video/')) fileTypeGroup = 'video';
    else if (file.type.startsWith('audio/')) fileTypeGroup = 'audio';
    else if (file.type === 'application/pdf') fileTypeGroup = 'document';

    if (fileTypeGroup && FORMATS[fileTypeGroup as keyof typeof FORMATS]) {
      const available = FORMATS[fileTypeGroup as keyof typeof FORMATS];
      const different = available.find(f => f.value !== file.type) || available[0];
      setTargetFormat(different.value);
    } else {
      setErrorMsg(t('Type de fichier non supporté pour la conversion.'));
      setStatus('error');
      setOriginalFile(null);
    }
  };

  const startConversion = async () => {
    if (!originalFile || !targetFormat) return;
    
    setStatus('converting');
    setErrorMsg('');
    setProgress(0);
    onConversionStart?.(originalFile);

    const targetOption = [...FORMATS.image, ...FORMATS.video, ...FORMATS.audio, ...FORMATS.document].find(f => f.value === targetFormat);
    const targetExt = targetOption?.ext || 'bin';
    setConvertedExt(targetExt);

    try {
      if (originalFile.type === 'application/pdf') {
        // Convert PDF to Images (ZIP)
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/legacy/build/pdf.worker.min.mjs`;
        
        const arrayBuffer = await originalFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        const JSZip = (await import('adm-zip')).default;
        const zip = new JSZip();
        
        for (let i = 1; i <= pdf.numPages; i++) {
          setProgress(i / pdf.numPages);
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2.0 }); // High quality
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          await page.render({ canvasContext: context!, viewport: viewport } as any).promise;
          const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Canvas error')), 'image/jpeg', 0.9);
          });
          
          const buf = await blob.arrayBuffer();
          zip.addFile(`page_${i}.jpg`, Buffer.from(buf));
        }
        
        const zipBuffer = zip.toBuffer();
        const zipBlob = new Blob([zipBuffer], { type: 'application/zip' });
        
        setConvertedFile(zipBlob);
        onConversionComplete?.(originalFile, zipBlob, targetExt);
        saveOptimization(originalFile.name, originalFile.size, zipBlob.size, targetFormat).catch(console.error);
        incrementUsage();
        setStatus('done');
        
      } else if (originalFile.type.startsWith('image/')) {
        // Image conversion
        const img = new Image();
        const url = URL.createObjectURL(originalFile);
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = url;
        });
        URL.revokeObjectURL(url);
        
        if (targetExt === 'pdf') {
          // Image to PDF
          const { jsPDF } = await import('jspdf');
          const pdf = new jsPDF({
            orientation: img.width > img.height ? 'landscape' : 'portrait',
            unit: 'px',
            format: [img.width, img.height]
          });
          
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx!.drawImage(img, 0, 0);
          
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          pdf.addImage(imgData, 'JPEG', 0, 0, img.width, img.height);
          
          const pdfBlob = pdf.output('blob');
          setProgress(1);
          setConvertedFile(pdfBlob);
          onConversionComplete?.(originalFile, pdfBlob, targetExt);
          saveOptimization(originalFile.name, originalFile.size, pdfBlob.size, targetFormat).catch(console.error);
          incrementUsage();
          setStatus('done');
          
        } else {
          // Image to Image
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error("Could not get canvas context");
          ctx.drawImage(img, 0, 0);
          
          const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((b) => {
              if (b) resolve(b);
              else reject(new Error("Canvas toBlob failed"));
            }, targetFormat, 0.9);
          });
          
          setProgress(1);
          setConvertedFile(blob);
          onConversionComplete?.(originalFile, blob, targetExt);
          saveOptimization(originalFile.name, originalFile.size, blob.size, targetFormat).catch(console.error);
          incrementUsage();
          setStatus('done');
        }
      } else if (originalFile.type.startsWith('video/') || originalFile.type.startsWith('audio/')) {
        // Video/Audio conversion using FFmpeg
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
              setConvertedFile(blob);
              onConversionComplete?.(originalFile, blob, targetExt);
              saveOptimization(originalFile.name, originalFile.size, blob.size, targetFormat).catch(console.error);
              resolve();
            } else if (type === 'error') {
              reject(new Error(error));
            }
          };
          worker.postMessage({ type: 'convert', file: originalFile, targetFormat, targetExt });
        });
        
        incrementUsage();
        setStatus('done');
      }
    } catch (error: any) {
      console.error('Conversion error', error);
      setErrorMsg(error.message || t('Erreur lors de la conversion'));
      setStatus('error');
    }
  };

  const downloadFile = () => {
    if (!convertedFile || !originalFile) return;
    const url = URL.createObjectURL(convertedFile);
    const a = document.createElement('a');
    a.href = url;
    const baseName = originalFile.name.substring(0, originalFile.name.lastIndexOf('.')) || originalFile.name;
    a.download = `${baseName}_converted.${convertedExt}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderFormatOptions = () => {
    if (!originalFile) return null;
    
    let group = FORMATS.image;
    if (originalFile.type.startsWith('video/')) group = FORMATS.video;
    else if (originalFile.type.startsWith('audio/')) group = FORMATS.audio;
    else if (originalFile.type === 'application/pdf') group = FORMATS.document;

    return (
      <div className="flex flex-col items-center gap-4 mt-6 z-20 w-full max-w-sm relative" onClick={e => e.stopPropagation()}>
        <div className="w-full">
          <label className="block text-on-surface-variant text-sm mb-2 text-center">{t('Format cible')}</label>
          <select 
            value={targetFormat} 
            onChange={(e) => setTargetFormat(e.target.value)}
            className="w-full bg-surface-container border border-outline-variant rounded-lg p-3 text-on-surface focus:outline-none focus:border-primary"
          >
            {group.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
        <button 
          onClick={startConversion}
          className="w-full py-3 rounded-full bg-primary text-on-primary font-label-md hover:bg-primary-container hover:text-on-primary-container transition-colors"
        >
          {t('Convertir')}
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); setStatus('idle'); setOriginalFile(null); onReset?.(); }}
          className="text-on-surface-variant hover:text-on-surface text-sm mt-2"
        >
          {t('Annuler')}
        </button>
      </div>
    );
  };

  return (
    <div className="lg:col-span-7 dropzone-container group h-full">
      <div 
        className={`glass-panel dropzone-glow rounded-xl h-full min-h-[400px] flex flex-col items-center justify-center p-8 relative overflow-hidden transition-colors ${!originalFile ? 'cursor-pointer' : ''} ${isDragActive ? 'border-primary bg-primary/5' : ''}`}
        onDragOver={!originalFile ? handleDragOver : undefined}
        onDragLeave={!originalFile ? handleDragLeave : undefined}
        onDrop={!originalFile ? handleDrop : undefined}
        onClick={!originalFile ? handleClick : undefined}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileInput}
          accept="image/*,video/*,audio/*,application/pdf"
        />

        <div className="absolute inset-0 tech-grid opacity-20 pointer-events-none mix-blend-overlay"></div>
        
        {status === 'idle' && !originalFile && (
          <div className="relative z-10 flex flex-col items-center gap-6 text-center pointer-events-none">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full animate-[spin_10s_linear_infinite] opacity-30 group-hover:opacity-100 group-hover:primary transition-opacity duration-500" viewBox="0 0 100 100">
                <circle cx="50" cy="50" fill="none" r="48" stroke="currentColor" strokeDasharray="10 6" strokeWidth="2"></circle>
              </svg>
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors duration-300" style={{ fontSize: '48px' }}>transform</span>
            </div>
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface mb-2">{t('Convertir des fichiers')}</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">{t('Glissez et déposez ou cliquez pour parcourir')}</p>
            </div>
          </div>
        )}

        {status === 'idle' && originalFile && (
          <div className="relative z-10 flex flex-col items-center text-center">
             <div className="mb-4">
              <span className="material-symbols-outlined text-primary mb-2" style={{ fontSize: '32px' }}>description</span>
              <p className="font-headline-sm text-on-surface">{originalFile.name}</p>
              <p className="text-sm text-on-surface-variant">{(originalFile.size / 1024 / 1024).toFixed(2)} Mo</p>
            </div>
            {renderFormatOptions()}
          </div>
        )}

        {status === 'converting' && (
          <div className="relative z-10 flex flex-col items-center gap-4">
            <span className="material-symbols-outlined text-primary animate-spin" style={{ fontSize: '48px' }}>autorenew</span>
            <p className="font-headline-md text-on-surface">Conversion de {originalFile?.name}...</p>
            {progress > 0 && <p className="font-body-md text-primary">{Math.round(progress * 100)}%</p>}
          </div>
        )}

        {status === 'done' && (
          <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <span className="material-symbols-outlined text-tertiary" style={{ fontSize: '48px' }}>check_circle</span>
            <div className="text-center">
              <h2 className="font-headline-md text-on-surface mb-1">Conversion réussie</h2>
              <p className="font-body-md text-on-surface-variant">
                Converti en {convertedExt.toUpperCase()} ({(convertedFile!.size / 1024 / 1024).toFixed(2)} Mo)
              </p>
            </div>
            <button 
              onClick={downloadFile}
              className="w-full py-3 rounded-full bg-primary text-on-primary font-label-md hover:bg-primary-container hover:text-on-primary-container transition-colors"
            >
              Télécharger le fichier converti
            </button>
            <button 
              onClick={() => { setStatus('idle'); setOriginalFile(null); setConvertedFile(null); onReset?.(); }}
              className="text-primary hover:text-primary-container font-label-md mt-2"
            >
              Convertir un autre fichier
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="relative z-10 flex flex-col items-center gap-4 text-center" onClick={e => e.stopPropagation()}>
            <span className="material-symbols-outlined text-error" style={{ fontSize: '48px' }}>error</span>
            <p className="font-headline-md text-error">{errorMsg}</p>
            <button 
              onClick={() => { setStatus('idle'); setOriginalFile(null); }}
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
