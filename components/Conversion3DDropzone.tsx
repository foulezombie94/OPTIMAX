'use client';

import { useState, useRef, useEffect } from 'react';
import { saveOptimization } from '@/app/actions/optimizations';
import { createClient } from '@/utils/supabase/client';
import { useTranslation } from '@/contexts/TranslationContext';

type ConversionStatus = 'idle' | 'converting' | 'done' | 'error';

export default function Conversion3DDropzone({ 
  onConversionComplete, 
  onConversionStart, 
  onReset 
}: { 
  onConversionComplete?: (original: File, converted: File | Blob) => void,
  onConversionStart?: (original: File) => void,
  onReset?: () => void
}) {
  const { t } = useTranslation();
  const [isDragActive, setIsDragActive] = useState(false);
  const [status, setStatus] = useState<ConversionStatus>('idle');
  const [originalFiles, setOriginalFiles] = useState<{file: File, path: string}[]>([]);
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [target3DFormat, setTarget3DFormat] = useState<string>('glb');
  const [convertedFile, setConvertedFile] = useState<File | Blob | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [progress, setProgress] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPro, setIsPro] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    return () => {
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

  const traverseFileTree = (item: any, path: string): Promise<{file: File, path: string}[]> => {
    return new Promise((resolve) => {
      if (item.isFile) {
        item.file((file: File) => {
          resolve([{ file, path: path + file.name }]);
        });
      } else if (item.isDirectory) {
        const dirReader = item.createReader();
        dirReader.readEntries(async (entries: any[]) => {
          const promises = entries.map(entry => traverseFileTree(entry, path + item.name + '/'));
          const results = await Promise.all(promises);
          const files: {file: File, path: string}[] = [];
          results.forEach(res => files.push(...res));
          resolve(files);
        });
      } else {
        resolve([]);
      }
    });
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    
    const files: {file: File, path: string}[] = [];
    if (e.dataTransfer.items) {
      const items = Array.from(e.dataTransfer.items);
      const promises = items.map(item => {
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry();
          if (entry) {
            return traverseFileTree(entry, '');
          }
        }
        return Promise.resolve([]);
      });
      const results = await Promise.all(promises);
      results.forEach(res => files.push(...res));
    } else if (e.dataTransfer.files) {
      Array.from(e.dataTransfer.files).forEach(file => {
        files.push({ file, path: file.webkitRelativePath || file.name });
      });
    }
    
    handleFilesSelection(files);
  };

  const handleClick = () => {
    if (status === 'idle') {
      fileInputRef.current?.click();
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesObj = Array.from(e.target.files).map(file => ({
        file,
        path: file.webkitRelativePath || file.name
      }));
      handleFilesSelection(filesObj);
    }
  };

  const handleFilesSelection = (files: {file: File, path: string}[]) => {
    if (files.length === 0) return;

    const totalSize = files.reduce((acc, f) => acc + f.file.size, 0);
    if (totalSize > 48 * 1024 * 1024) {
      setErrorMsg(t('La taille du fichier dépasse la limite de 500 Mo.'));
      setStatus('error');
      return;
    }

    let main3DFile = files.find(f => f.file.name.match(/\.(obj|fbx|stl|glb|gltf|ply|dae)$/i));
    const zipFile = files.find(f => f.file.name.endsWith('.zip'));

    if (!main3DFile && zipFile) {
      main3DFile = zipFile;
    }

    if (!main3DFile) {
      setErrorMsg(t('Veuillez inclure au moins un modèle 3D valide (.obj, .fbx, .stl...) ou un fichier .zip'));
      setStatus('error');
      return;
    }

    setOriginalFiles(files);
    setMainFile(main3DFile.file);
    setStatus('idle');
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

  const startConversion = async () => {
    if (!mainFile || originalFiles.length === 0) return;

    if (!checkLimit()) {
      const limit = isLoggedIn ? 30 : 5;
      setErrorMsg(t(`Vous avez atteint la limite de ${limit} fichiers par jour. Passez à l'illimité pour 2$/mois.`));
      setStatus('error');
      return;
    }

    setStatus('converting');
    setErrorMsg('');
    setConvertedFile(null);
    onConversionStart?.(mainFile);

    try {
      setProgress(10);
      
      const formData = new FormData();
      formData.append('targetFormat', target3DFormat);
      
      if (originalFiles.length === 1 && originalFiles[0].file.name.endsWith('.zip')) {
        formData.append('file', originalFiles[0].file);
      } else {
        originalFiles.forEach(item => {
          formData.append('files', item.file);
          formData.append('paths', item.path);
        });
      }
      
      setProgress(30);
      
      const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData
      });
      
      setProgress(70);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || t('Erreur lors de la conversion backend'));
      }
      
      const finalBlob = await response.blob();
      setProgress(90);
      
      if (finalBlob.size > 48 * 1024 * 1024) {
        setErrorMsg(t("Les fichiers médias (images/vidéos) ne sont pas autorisés dans la section 3D. Veuillez utiliser l'onglet Médias."));
        setStatus('error');
        return;
      }
      
      setConvertedFile(finalBlob);
      onConversionComplete?.(mainFile, finalBlob);
      
      // Upload the actual final converted file (finalBlob) to storage as preview
      let previewUrl: string | undefined = undefined;
      try {
        previewUrl = await uploadPreview(finalBlob, `converted_${mainFile.name.split('.')[0]}.${target3DFormat}`);
      } catch (e) {
        console.error('Failed to upload preview:', e);
      }
      try {
        await saveOptimization(mainFile.name, originalFiles.reduce((acc, f) => acc + f.file.size, 0), finalBlob.size, `model/${target3DFormat}`, previewUrl);
      } catch (e) {
        console.error('Failed to save optimization to database:', e);
      }
      
      setProgress(100);
      incrementUsage();
      setStatus('done');
    } catch (error: any) {
      console.error('Conversion error', error);
      setErrorMsg(error.message || t('Erreur lors de la conversion'));
      setStatus('error');
    }
  };

  const downloadFile = () => {
    if (!convertedFile || !mainFile) return;
    const url = URL.createObjectURL(convertedFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optimax_converted_${mainFile.name.split('.')[0]}.${target3DFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="lg:col-span-7 dropzone-container group h-full">
      <div 
        className={`glass-panel dropzone-glow rounded-xl h-full min-h-[400px] flex flex-col items-center justify-center p-8 relative overflow-hidden cursor-pointer transition-colors ${isDragActive ? 'border-tertiary bg-tertiary/5' : ''}`}
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
          accept=".obj,.fbx,.stl,.glb,.gltf,.ply,.dae,.mtl,.jpg,.png,.jpeg,.zip"
          multiple
          // @ts-ignore
          webkitdirectory=""
        />

        <div className="absolute inset-0 tech-grid opacity-20 pointer-events-none mix-blend-overlay"></div>
        
        {mainFile && originalFiles?.length > 0 && status === 'idle' && (
          <div className="relative z-10 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h2 className="text-headline-md font-headline-md text-on-surface mb-6 text-center">{t('Conversion 3D')}</h2>
            <div className="flex flex-col items-center gap-2 text-on-surface mb-6 justify-center">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[32px] text-tertiary">view_in_ar</span>
                <span className="font-label-lg">{mainFile.name}</span>
              </div>
              {originalFiles.length > 1 && (
                <span className="text-body-sm text-tertiary bg-tertiary/10 px-2 py-0.5 rounded border border-tertiary/20">
                  + {originalFiles.length - 1} {t('fichier(s) associé(s)')}
                </span>
              )}
            </div>
            <label className="block text-body-md text-on-surface-variant mb-2">{t('Format de destination')}</label>
            <select 
              value={target3DFormat} 
              onChange={(e) => setTarget3DFormat(e.target.value)}
              className="w-full bg-surface-dim border border-white/10 rounded-lg p-3 text-on-surface focus:outline-none focus:border-tertiary transition-colors mb-6"
            >
              <option value="glb">{t('GLB (Optimisé pour le Web)')}</option>
              <option value="gltf">{t('GLTF (Format standard)')}</option>
              <option value="obj">{t('OBJ (Universel)')}</option>
              <option value="stl">{t('STL (Impression 3D)')}</option>
            </select>
            <div className="flex gap-4">
              <button onClick={() => { setOriginalFiles([]); setMainFile(null); }} className="flex-1 px-4 py-2 glass-panel rounded-lg text-on-surface hover:bg-white/5 transition-colors">{t('Annuler')}</button>
              <button onClick={startConversion} className="flex-1 px-4 py-2 bg-tertiary text-on-surface rounded-lg hover:brightness-110 transition-colors shadow-lg">{t('Convertir')}</button>
            </div>
          </div>
        )}

        {status === 'idle' && (!originalFiles || originalFiles.length === 0) && (
          <div className="relative z-10 flex flex-col items-center gap-6 text-center pointer-events-none">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full animate-[spin_10s_linear_infinite] opacity-30 group-hover:opacity-100 group-hover:text-tertiary transition-opacity duration-500" viewBox="0 0 100 100">
                <circle cx="50" cy="50" fill="none" r="48" stroke="currentColor" strokeDasharray="10 6" strokeWidth="2"></circle>
              </svg>
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-tertiary transition-colors duration-300" style={{ fontSize: '48px' }}>view_in_ar</span>
            </div>
            <div>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-2">{t('Déposez votre modèle 3D ici')}</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">{t('ou cliquez pour parcourir vos dossiers locaux')}</p>
            </div>
          </div>
        )}

        {status === 'converting' && (
          <div className="relative z-10 flex flex-col items-center gap-4">
            <span className="material-symbols-outlined text-tertiary animate-spin" style={{ fontSize: '48px' }}>autorenew</span>
            <p className="font-headline-md text-on-surface">Conversion de {mainFile?.name}...</p>
            {progress > 0 && <p className="font-body-md text-tertiary">{progress}%</p>}
          </div>
        )}

        {status === 'done' && (
          <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <span className="material-symbols-outlined text-tertiary" style={{ fontSize: '48px' }}>check_circle</span>
            <div className="text-center">
              <h3 className="font-headline-md text-on-surface mb-1">Conversion Réussie</h3>
              <p className="font-body-md text-on-surface-variant">
                Le fichier a été converti en .{target3DFormat}
              </p>
            </div>
            <button 
              onClick={downloadFile}
              className="w-full py-3 rounded-full bg-tertiary text-on-surface font-label-md hover:brightness-110 transition-colors"
            >
              Télécharger
            </button>
            <button 
              onClick={() => { setStatus('idle'); setOriginalFiles([]); setMainFile(null); setConvertedFile(null); onReset?.(); }}
              className="text-tertiary hover:brightness-110 font-label-md mt-2"
            >
              Convertir un autre fichier
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="relative z-10 flex flex-col items-center gap-4 text-center">
            <span className="material-symbols-outlined text-error" style={{ fontSize: '48px' }}>error</span>
            <p className="font-headline-md text-error">{errorMsg}</p>
            <button 
              onClick={(e) => { e.stopPropagation(); setStatus('idle'); setOriginalFiles([]); setMainFile(null); }}
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
