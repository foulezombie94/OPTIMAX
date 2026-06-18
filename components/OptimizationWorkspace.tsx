'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const CompressionDropzone = dynamic(() => import('./CompressionDropzone'), { ssr: false });
const Conversion3DDropzone = dynamic(() => import('./Conversion3DDropzone'), { ssr: false });
const ComparisonWidget = dynamic(() => import('./ComparisonWidget'), { ssr: false });
const VideoComparisonWidget = dynamic(() => import('./VideoComparisonWidget'), { ssr: false });
const ThreeViewer = dynamic(() => import('./OptimizationsGrid').then((mod) => mod.ThreeViewer), { ssr: false });
import { useTranslation } from '@/contexts/TranslationContext';

export default function OptimizationWorkspace() {
  const { t } = useTranslation();
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [compressedFile, setCompressedFile] = useState<File | Blob | null>(null);
  const [activeTab, setActiveTab] = useState<'media' | '3d'>('media');
  const [preview3DUrl, setPreview3DUrl] = useState<string>('');

  useEffect(() => {
    if (compressedFile && activeTab === '3d') {
      const url = URL.createObjectURL(compressedFile);
      setPreview3DUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPreview3DUrl('');
    }
  }, [compressedFile, activeTab]);

  const calculateRatio = () => {
    if (!originalFile || !compressedFile || originalFile.size === 0) return 0;
    return Math.round((1 - compressedFile.size / originalFile.size) * 100);
  };

  const calculateSavedSpace = () => {
    if (!originalFile || !compressedFile) return 0;
    return ((originalFile.size - compressedFile.size) / 1024 / 1024).toFixed(1);
  };

  const ratio = calculateRatio();
  const savedSpace = calculateSavedSpace();
  
  const isVideo = originalFile?.type.startsWith('video/');

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
      {/* Left: Dropzone Area */}
      <div className="lg:col-span-7 flex flex-col gap-4 h-full">
        <div className="flex bg-surface-dim p-1 rounded-xl w-fit">
          <button 
            onClick={() => { setActiveTab('media'); setOriginalFile(null); setCompressedFile(null); }}
            className={`px-6 py-2 rounded-lg font-label-md transition-colors ${activeTab === 'media' ? 'bg-primary text-white shadow-md' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            {t('Médias (Images & Vidéos)')}
          </button>
          <button 
            onClick={() => { setActiveTab('3d'); setOriginalFile(null); setCompressedFile(null); }}
            className={`px-6 py-2 rounded-lg font-label-md transition-colors ${activeTab === '3d' ? 'bg-tertiary text-on-surface shadow-md' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            {t('Modèles 3D')}
          </button>
        </div>
        
        {activeTab === 'media' ? (
          <CompressionDropzone 
            onOptimizationStart={(file) => {
              setOriginalFile(file);
              setCompressedFile(null);
            }}
            onOptimizationComplete={(original, compressed) => {
              setOriginalFile(original);
              setCompressedFile(compressed);
            }}
            onReset={() => {
              setOriginalFile(null);
              setCompressedFile(null);
            }}
          />
        ) : (
          <Conversion3DDropzone 
            onConversionStart={(file) => {
              setOriginalFile(file);
              setCompressedFile(null);
            }}
            onConversionComplete={(original, compressed) => {
              setOriginalFile(original);
              setCompressedFile(compressed);
            }}
            onReset={() => {
              setOriginalFile(null);
              setCompressedFile(null);
            }}
          />
        )}
      </div>

      {/* Right: Post-Upload Comparison Interactive */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        {/* Optimization Stats Card */}
        <div className="glass-panel rounded-xl p-6 flex items-center justify-between">
          <div>
            <div className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-1">
              {activeTab === 'media' ? t('RATIO DE COMPRESSION') : t('VARIATION DE POIDS')}
            </div>
            <div className="font-display text-[40px] leading-[1.2] font-bold text-tertiary flex items-baseline gap-1">
              {compressedFile ? Math.max(0, ratio) : '--'}<span className="font-code text-[14px] text-on-surface-variant">%</span>
            </div>
          </div>
          <div className="text-right">
            <div className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-1">{t('ESPACE ÉCONOMISÉ')}</div>
            <div className="font-display text-[40px] leading-[1.2] font-bold text-primary flex items-baseline gap-1 justify-end">
              {compressedFile ? Math.max(0, Number(savedSpace)) : '--'}<span className="font-code text-[14px] text-on-surface-variant">Mo</span>
            </div>
          </div>
        </div>

        {compressedFile && activeTab === 'media' && !isVideo && (
          <ComparisonWidget originalFile={originalFile} compressedFile={compressedFile} />
        )}
        
        {compressedFile && activeTab === 'media' && isVideo && (
          <VideoComparisonWidget originalFile={originalFile} compressedFile={compressedFile} />
        )}

        {compressedFile && activeTab === '3d' && preview3DUrl && (
          <div className="glass-panel rounded-xl flex-1 relative overflow-hidden min-h-[350px] flex flex-col bg-[#070709]">
            <div className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded bg-black/60 backdrop-blur-md border border-white/10 font-label-md text-label-md text-on-surface pointer-events-none flex items-center gap-1.5 shadow-lg">
              <span className="material-symbols-outlined text-[16px] text-tertiary">view_in_ar</span>
              Aperçu 3D Converti
            </div>
            <div className="flex-1 w-full h-full min-h-[350px]">
              <ThreeViewer 
                src={preview3DUrl} 
                fileType={compressedFile.type || 'model/gltf-binary'} 
                showLegend={true} 
              />
            </div>
          </div>
        )}

        {!compressedFile && (
          <div className="glass-panel rounded-xl flex-1 flex items-center justify-center opacity-70 min-h-[300px]">
            <p className="font-label-md text-on-surface-variant">{t('En attente de fichier...')}</p>
          </div>
        )}
      </div>
    </section>
  );
}
