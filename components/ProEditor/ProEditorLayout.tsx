'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useEditorStore, Asset, Clip, EffectType, Effect } from '@/stores/editorStore';

export default function ProEditorLayout() {
  const store = useEditorStore();
  
  // UI States
  const [isPlaying, setIsPlaying] = useState(false);
  const [leftTab, setLeftTab] = useState<'media' | 'effects' | 'titles' | 'giphy'>('media');
  const [giphyQuery, setGiphyQuery] = useState('');
  const [giphyCategory, setGiphyCategory] = useState<'trending' | 'search' | 'stickers' | 'emojis' | 'random'>('trending');
  const [giphyResults, setGiphyResults] = useState<any[]>([]);
  const [isSearchingGiphy, setIsSearchingGiphy] = useState(false);
  const [activeTool, setActiveTool] = useState<'selection' | 'razor'>('selection');
  
  // Dragging State
  const [draggingClip, setDraggingClip] = useState<{ id: string, startX: number, startY: number, initialStart: number, initialTrackId: string } | null>(null);
  const playheadRef = useRef<number>(store.playhead);
  const lastUpdateRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('../../utils/ffmpegWorker.ts', import.meta.url));
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Sync ref with store for animation frame
  useEffect(() => {
    playheadRef.current = store.playhead;
  }, [store.playhead]);

  // Main playback loop
  useEffect(() => {
    let animationId: number;
    
    const loop = (timestamp: number) => {
      if (!lastUpdateRef.current) lastUpdateRef.current = timestamp;
      const delta = (timestamp - lastUpdateRef.current) / 1000;
      lastUpdateRef.current = timestamp;

      if (isPlaying) {
        let newTime = playheadRef.current + delta;
        if (newTime > store.duration) {
          newTime = 0;
          setIsPlaying(false);
        }
        store.setPlayhead(newTime);
      }
      animationId = requestAnimationFrame(loop);
    };

    if (isPlaying) {
      lastUpdateRef.current = performance.now();
      animationId = requestAnimationFrame(loop);
    }

    return () => cancelAnimationFrame(animationId);
  }, [isPlaying, store.duration, store]);

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const type = file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'image';
      const url = URL.createObjectURL(file);
      
      if (type === 'video' || type === 'audio') {
        const media = document.createElement(type);
        media.onloadedmetadata = () => {
          store.addAsset({
            id: Math.random().toString(36).substring(7),
            file, url, type, name: file.name,
            duration: media.duration
          });
        };
        media.src = url;
      } else {
        store.addAsset({
          id: Math.random().toString(36).substring(7),
          file, url, type, name: file.name, duration: 5 // Default 5s for image
        });
      }
    });
  };

  const addAssetToTimeline = (asset: Asset) => {
    // Find first available track
    const track = store.tracks.find(t => t.type === asset.type || (asset.type === 'image' && t.type === 'video'));
    if (!track) return;

    store.addClip({
      id: Math.random().toString(36).substring(7),
      type: 'media',
      assetId: asset.id,
      trackId: track.id,
      start: store.playhead,
      end: store.playhead + Math.min(asset.duration, 10), // Limit initial clip to 10s or duration
      trimIn: 0,
      trimOut: Math.min(asset.duration, 10),
      volume: 1,
      transform: { scale: 1, posX: 0, posY: 0, opacity: 1, brightness: 1, contrast: 1, saturation: 1 },
      effects: []
    });
  };

  const selectedClip = store.clips.find(c => c.id === store.selectedClipId);
  const activeClips = store.clips.filter(c => store.playhead >= c.start && store.playhead < c.end);

  useEffect(() => {
    if (leftTab !== 'giphy') return;
    const fetchGiphy = async () => {
      setIsSearchingGiphy(true);
      try {
        const apiKey = 'O6w4ZuU9GgaeCZsibeHrGm3dazVeFkFC';
        let url = '';
        if (giphyCategory === 'trending') url = `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=20`;
        else if (giphyCategory === 'search' && giphyQuery) url = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(giphyQuery)}&limit=20`;
        else if (giphyCategory === 'stickers') url = `https://api.giphy.com/v1/stickers/trending?api_key=${apiKey}&limit=20`;
        else if (giphyCategory === 'emojis') url = `https://api.giphy.com/v2/emoji?api_key=${apiKey}&limit=20`;
        else if (giphyCategory === 'random') {
           const res = await fetch(`https://api.giphy.com/v1/gifs/random?api_key=${apiKey}`);
           const json = await res.json();
           setGiphyResults(json.data ? [json.data] : []);
           setIsSearchingGiphy(false);
           return;
        }
        if (url) {
          const res = await fetch(url);
          const json = await res.json();
          setGiphyResults(json.data || []);
        } else {
          setGiphyResults([]);
        }
      } catch (err) {
        console.error("Giphy fetch error", err);
      }
      setIsSearchingGiphy(false);
    };
    const debounce = setTimeout(fetchGiphy, 500);
    return () => clearTimeout(debounce);
  }, [leftTab, giphyCategory, giphyQuery]);

  const addGiphyToTimeline = async (gifData: any) => {
    const mp4Url = gifData.images?.original_mp4?.mp4 || gifData.images?.original?.mp4;
    if (!mp4Url) {
      alert("No MP4 format available for this GIF.");
      return;
    }
    const res = await fetch(mp4Url);
    const blob = await res.blob();
    const file = new File([blob], `${gifData.title || 'giphy'}.mp4`, { type: 'video/mp4' });
    const assetId = Math.random().toString(36).substring(7);
    const url = URL.createObjectURL(file);
    const asset: Asset = { id: assetId, type: 'video', name: gifData.title || 'Giphy', url, duration: 3, file };
    store.addAsset(asset);
    
    const track = store.tracks.find(t => t.type === 'video');
    if (!track) return;

    store.addClip({
      id: Math.random().toString(36).substring(7),
      type: 'media',
      trackId: track.id,
      assetId,
      start: store.playhead,
      end: store.playhead + 3,
      trimIn: 0,
      trimOut: 3,
      transform: { scale: 1, posX: 0, posY: 0, opacity: 1, brightness: 1, contrast: 1, saturation: 1 },
      volume: 1,
      effects: []
    });
  };

  const formatTime = (time: number) => {
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 30); // 30fps frames
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`;
  };

  const startExport = async () => {
    if (!workerRef.current || store.clips.length === 0) return;
    
    // We can't pass File objects directly if they are stored in the store without a structured clone,
    // but the store holds File objects natively. 
    
    const worker = workerRef.current;
    await new Promise<void>((resolve, reject) => {
      worker.onmessage = (e: any) => {
        const { type, progress: p, blob, error } = e.data;
        if (type === 'progress') console.log('Export progress:', p);
        else if (type === 'done') {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'optimax_ultimate_export.mp4';
          a.click();
          resolve();
        } else if (type === 'error') {
          console.error('Export error:', error);
          reject(new Error(error));
        }
      };
      
      // Serialize timeline for the worker
      const payload = {
        type: 'pro_nle_export',
        duration: store.duration,
        clips: store.clips.map(c => {
          const asset = store.assets.find(a => a.id === c.assetId);
          return {
            ...c,
            file: asset?.file,
            type: asset?.type
          };
        }).filter(c => c.file) // Only clips with valid files
      };
      
      worker.postMessage(payload);
    });
  };

  // Interactive Timeline Logic
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (draggingClip && containerRef.current) {
        const timelineWidth = containerRef.current.getBoundingClientRect().width - 150; // minus track header width
        const pixelsPerSecond = timelineWidth / store.duration;
        const deltaX = e.clientX - draggingClip.startX;
        const deltaSeconds = deltaX / pixelsPerSecond;
        
        // Very basic vertical track change (mock logic for prototype)
        const deltaY = e.clientY - draggingClip.startY;
        let newTrackId = draggingClip.initialTrackId;
        if (deltaY > 50) newTrackId = 'a1'; // Dragged down roughly
        else if (deltaY < -50) newTrackId = 'v2'; // Dragged up roughly
        else newTrackId = 'v1';

        store.moveClip(draggingClip.id, deltaSeconds, newTrackId);
      }
    };

    const handleGlobalMouseUp = () => {
      if (draggingClip) setDraggingClip(null);
    };

    if (draggingClip) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggingClip, store]);

  const handleClipMouseDown = (e: React.MouseEvent, clip: Clip) => {
    e.stopPropagation();
    store.setSelectedClip(clip.id);

    if (activeTool === 'razor') {
      if (containerRef.current) {
        const timelineRect = containerRef.current.getBoundingClientRect();
        const offsetX = e.clientX - (timelineRect.left + 150);
        const timelineWidth = timelineRect.width - 150;
        const clickTime = (offsetX / timelineWidth) * store.duration;
        store.splitClip(clip.id, clickTime);
      }
    } else if (activeTool === 'selection') {
      setDraggingClip({ 
        id: clip.id, 
        startX: e.clientX, 
        startY: e.clientY,
        initialStart: clip.start, 
        initialTrackId: clip.trackId 
      });
    }
  };

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - 150;
      if (x > 0) {
        const clickTime = (x / (rect.width - 150)) * store.duration;
        store.setPlayhead(Math.max(0, clickTime));
      }
    }
  };

  return (
    <div className="h-full w-full flex flex-col font-sans bg-[#111111] text-[#E0E0E0] select-none">
      {/* Header */}
      <header className="h-12 border-b border-[#2A2A2A] bg-[#181818] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-[#A0A0A0] hover:text-white transition-colors flex items-center">
            <span className="material-symbols-outlined text-[18px]">home</span>
          </Link>
          <div className="font-semibold text-sm tracking-wide">Optimax Ultimate NLE</div>
        </div>
        <div className="flex gap-2">
          <button className="bg-[#2A2A2A] hover:bg-[#3A3A3A] text-xs px-4 py-1.5 rounded transition-colors">
            Render Timeline
          </button>
          <button onClick={startExport} className="bg-primary text-white text-xs px-4 py-1.5 rounded transition-colors shadow-lg">
            Export Project
          </button>
        </div>
      </header>

      {/* Top Workspace (Bin, Monitors, Inspector) */}
      <div className="flex-1 flex min-h-[50%] overflow-hidden">
        
        {/* Left Sidebar (Media / Effects) */}
        <div className="w-72 border-r border-[#2A2A2A] bg-[#1E1E1E] flex flex-col">
          <div className="h-8 bg-[#252525] flex border-b border-[#2A2A2A]">
            <button 
              onClick={() => setLeftTab('media')}
              className={`flex-1 text-[10px] font-semibold tracking-wider ${leftTab === 'media' ? 'text-white border-b-2 border-primary' : 'text-[#A0A0A0] hover:text-white'}`}
            >MEDIA</button>
            <button 
              onClick={() => setLeftTab('effects')}
              className={`flex-1 text-[10px] font-semibold tracking-wider ${leftTab === 'effects' ? 'text-white border-b-2 border-primary' : 'text-[#A0A0A0] hover:text-white'}`}
            >EFFECTS</button>
            <button 
              onClick={() => setLeftTab('titles')}
              className={`flex-1 text-[10px] font-semibold tracking-wider ${leftTab === 'titles' ? 'text-white border-b-2 border-primary' : 'text-[#A0A0A0] hover:text-white'}`}
            >TITLES</button>
            <button 
              onClick={() => setLeftTab('giphy')}
              className={`flex-1 text-[10px] font-semibold tracking-wider ${leftTab === 'giphy' ? 'text-white border-b-2 border-primary' : 'text-[#A0A0A0] hover:text-white'}`}
            >GIPHY</button>
          </div>
          <div className="p-3 flex-1 overflow-y-auto flex flex-col gap-2">
            {leftTab === 'media' && (
              <>
                <label className="border border-dashed border-[#444] rounded p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-[#252525] transition-colors">
                  <span className="material-symbols-outlined text-[#888] mb-1 text-[20px]">add_photo_alternate</span>
                  <span className="text-xs text-[#888]">Import Media</span>
                  <input type="file" multiple className="hidden" accept="video/*,audio/*,image/*" onChange={handleFileImport} />
                </label>
                {store.assets.map(asset => (
                  <div key={asset.id} className="bg-[#252525] p-2 rounded flex items-center gap-2 group border border-transparent hover:border-[#444]">
                    <div className="w-10 h-8 bg-black rounded flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[#555] text-[16px]">
                        {asset.type === 'video' ? 'movie' : asset.type === 'audio' ? 'music_note' : 'image'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{asset.name}</p>
                      <p className="text-[10px] text-[#888]">{asset.duration.toFixed(1)}s</p>
                    </div>
                    <button 
                      onClick={() => addAssetToTimeline(asset)}
                      className="opacity-0 group-hover:opacity-100 p-1 bg-primary text-white rounded transition-opacity"
                    >
                      <span className="material-symbols-outlined text-[14px]">add</span>
                    </button>
                  </div>
                ))}
              </>
            )}
            {leftTab === 'effects' && (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { type: 'blur', icon: 'blur_on', label: 'Blur' },
                  { type: 'grayscale', icon: 'filter_b_and_w', label: 'Grayscale' },
                  { type: 'sepia', icon: 'filter_vintage', label: 'Sepia' },
                  { type: 'invert', icon: 'invert_colors', label: 'Invert' },
                  { type: 'vhs', icon: 'electric_bolt', label: 'VHS / Glitch' }
                ].map(ef => (
                  <div 
                    key={ef.type}
                    onClick={() => store.selectedClipId && store.addEffectToClip(store.selectedClipId, ef.type as EffectType)}
                    className={`bg-[#252525] border border-[#333] hover:border-primary p-3 rounded flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer ${!store.selectedClipId ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <span className="material-symbols-outlined text-[#A0A0A0]">{ef.icon}</span>
                    <span className="text-[10px] text-[#A0A0A0]">{ef.label}</span>
                  </div>
                ))}
                {!store.selectedClipId && <p className="col-span-2 text-center text-[10px] text-error mt-4">Select a clip first</p>}
              </div>
            )}
            {leftTab === 'titles' && (
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => store.addTextClip()}
                  className="bg-[#252525] border border-[#333] hover:border-primary p-4 rounded flex flex-col items-center justify-center gap-2 transition-colors"
                >
                  <span className="material-symbols-outlined text-white text-[24px]">title</span>
                  <span className="text-xs font-semibold text-white">Basic Title</span>
                </button>
              </div>
            )}
            {leftTab === 'giphy' && (
              <div className="flex flex-col gap-3 h-full">
                <div className="flex flex-wrap gap-1">
                  {(['trending', 'search', 'stickers', 'emojis', 'random'] as const).map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setGiphyCategory(cat)}
                      className={`text-[9px] px-2 py-1 rounded capitalize ${giphyCategory === cat ? 'bg-primary text-white' : 'bg-[#333] text-[#A0A0A0] hover:bg-[#444]'}`}
                    >{cat}</button>
                  ))}
                </div>
                {giphyCategory === 'search' && (
                  <input 
                    type="text" 
                    placeholder="Search GIFs..." 
                    value={giphyQuery}
                    onChange={(e) => setGiphyQuery(e.target.value)}
                    className="w-full bg-[#111] border border-[#333] rounded px-2 py-1.5 text-xs text-white"
                  />
                )}
                <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2 pr-1">
                  {isSearchingGiphy ? (
                    <p className="text-xs text-[#666] col-span-2 text-center mt-4">Loading...</p>
                  ) : giphyResults.length > 0 ? (
                    giphyResults.map(gif => (
                      <div 
                        key={gif.id} 
                        className="relative group cursor-pointer aspect-square bg-[#111] rounded overflow-hidden border border-transparent hover:border-primary transition-colors"
                        onClick={() => addGiphyToTimeline(gif)}
                      >
                        <img 
                          src={gif.images?.fixed_height_small?.url || gif.images?.original?.url} 
                          alt={gif.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="material-symbols-outlined text-white text-[24px]">add_circle</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#666] col-span-2 text-center mt-4">No results</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Program Monitor */}
        <div className="flex-1 bg-black relative flex flex-col border-r border-[#2A2A2A]">
          <div className="h-8 bg-[#252525] flex items-center justify-center border-b border-[#2A2A2A] gap-4">
             <span className="text-xs font-code text-[#A0A0A0]">{formatTime(store.playhead)}</span>
          </div>
          <div className="flex-1 relative flex items-center justify-center overflow-hidden p-4" ref={containerRef}>
            {/* Render active clips */}
            <div className="relative aspect-video w-full max-w-full max-h-full bg-[#111] overflow-hidden shadow-2xl">
              {/* Reverse sort to render V1 at bottom, V2 on top */}
              {activeClips.sort((a, b) => {
                const trkA = store.tracks.findIndex(t => t.id === a.trackId);
                const trkB = store.tracks.findIndex(t => t.id === b.trackId);
                return trkB - trkA;
              }).map(clip => {
                let cssEffects = clip.effects.map(ef => {
                  if (ef.type === 'blur') return `blur(${ef.intensity * 20}px)`;
                  if (ef.type === 'grayscale') return `grayscale(${ef.intensity * 100}%)`;
                  if (ef.type === 'sepia') return `sepia(${ef.intensity * 100}%)`;
                  if (ef.type === 'invert') return `invert(${ef.intensity * 100}%)`;
                  if (ef.type === 'vhs') return `hue-rotate(${ef.intensity * 90}deg) contrast(${1 + ef.intensity})`;
                  return '';
                }).join(' ');

                const style: React.CSSProperties = {
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  transform: `translate(${clip.transform.posX * 100}%, ${clip.transform.posY * 100}%) scale(${clip.transform.scale})`,
                  opacity: clip.transform.opacity,
                  filter: `brightness(${clip.transform.brightness}) contrast(${clip.transform.contrast}) saturate(${clip.transform.saturation}) ${cssEffects}`
                };

                if (clip.type === 'text' && clip.textData) {
                  return (
                    <div 
                      key={clip.id} 
                      className="flex items-center justify-center"
                      style={{
                        ...style,
                        color: clip.textData.color,
                        fontSize: `${clip.textData.fontSize}px`,
                        fontWeight: 'bold',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                      }}
                    >
                      {clip.textData.content}
                    </div>
                  );
                }

                const asset = store.assets.find(a => a.id === clip.assetId);
                if (!asset || asset.type === 'audio') return null;

                const timeInAsset = (store.playhead - clip.start) + clip.trimIn;
                
                return (
                  <VideoFrameSync 
                    key={clip.id} 
                    src={asset.url} 
                    time={timeInAsset} 
                    style={style} 
                    type={asset.type} 
                  />
                );
              })}
            </div>
          </div>
          {/* Playback Controls */}
          <div className="h-12 bg-[#1E1E1E] border-t border-[#2A2A2A] flex items-center justify-center gap-4">
            <button onClick={() => store.setPlayhead(0)} className="text-[#A0A0A0] hover:text-white"><span className="material-symbols-outlined">skip_previous</span></button>
            <button onClick={() => setIsPlaying(!isPlaying)} className="text-white bg-[#333] hover:bg-[#444] rounded-full w-8 h-8 flex items-center justify-center">
              <span className="material-symbols-outlined">{isPlaying ? 'pause' : 'play_arrow'}</span>
            </button>
          </div>
        </div>

        {/* Inspector (Effect Controls) */}
        <div className="w-80 bg-[#1E1E1E] flex flex-col">
          <div className="h-8 bg-[#252525] flex items-center px-3 border-b border-[#2A2A2A]">
            <span className="text-xs font-semibold tracking-wider text-[#A0A0A0]">EFFECT CONTROLS</span>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            {selectedClip ? (
              <div className="flex flex-col gap-6">
                
                {selectedClip.type === 'text' && selectedClip.textData && (
                  <div>
                    <h4 className="text-[10px] font-bold text-[#888] mb-3">ESSENTIAL GRAPHICS</h4>
                    <div className="space-y-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-[#A0A0A0]">Text</span>
                        <input 
                          type="text" 
                          value={selectedClip.textData.content} 
                          onChange={(e) => store.updateTextData(selectedClip.id, { content: e.target.value })}
                          className="w-full bg-[#111] border border-[#333] rounded px-2 py-1 text-xs text-white"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-[#A0A0A0]">Color</span>
                        <input 
                          type="color" 
                          value={selectedClip.textData.color} 
                          onChange={(e) => store.updateTextData(selectedClip.id, { color: e.target.value })}
                          className="w-full bg-[#111] border border-[#333] rounded h-8 p-1 cursor-pointer"
                        />
                      </div>
                      <Slider label="Font Size" value={selectedClip.textData.fontSize} min={10} max={200} step={1} onChange={(v) => store.updateTextData(selectedClip.id, { fontSize: v })} />
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-[10px] font-bold text-[#888] mb-3">TRANSITIONS</h4>
                  <div className="space-y-3">
                    <Slider label="Fade In (s)" value={selectedClip.transitionIn || 0} min={0} max={5} step={0.1} onChange={(v) => store.updateTransitions(selectedClip.id, { transitionIn: v })} />
                    <Slider label="Fade Out (s)" value={selectedClip.transitionOut || 0} min={0} max={5} step={0.1} onChange={(v) => store.updateTransitions(selectedClip.id, { transitionOut: v })} />
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold text-[#888] mb-3">TRANSFORM</h4>
                  <div className="space-y-3">
                    <Slider label="Scale" value={selectedClip.transform.scale} min={0} max={3} step={0.01} onChange={(v) => store.updateClipTransform(selectedClip.id, { scale: v })} />
                    <Slider label="Position X" value={selectedClip.transform.posX} min={-1} max={1} step={0.01} onChange={(v) => store.updateClipTransform(selectedClip.id, { posX: v })} />
                    <Slider label="Position Y" value={selectedClip.transform.posY} min={-1} max={1} step={0.01} onChange={(v) => store.updateClipTransform(selectedClip.id, { posY: v })} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-[10px] font-bold text-[#888]">OPACITY</h4>
                    <button 
                      onClick={() => store.addKeyframe(selectedClip.id, store.playhead, { opacity: selectedClip.transform.opacity })}
                      className="text-[10px] bg-[#333] hover:bg-primary px-2 py-0.5 rounded text-white flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[12px]">add_circle</span> Add Keyframe
                    </button>
                  </div>
                  <Slider label="Opacity" value={selectedClip.transform.opacity} min={0} max={1} step={0.01} onChange={(v) => store.updateClipTransform(selectedClip.id, { opacity: v })} />
                  
                  {selectedClip.keyframes && selectedClip.keyframes.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <span className="text-[10px] text-[#A0A0A0]">Keyframes:</span>
                      {selectedClip.keyframes.map(kf => (
                        <div key={kf.id} className="flex justify-between items-center text-[10px] bg-[#222] px-2 py-1 rounded">
                          <span className="text-white">t={kf.time.toFixed(1)}s ({(kf.opacity! * 100).toFixed(0)}%)</span>
                          <button onClick={() => store.removeKeyframe(selectedClip.id, kf.id)} className="text-error hover:text-red-400">
                            <span className="material-symbols-outlined text-[12px]">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-[#888] mb-3">LUMETRI COLOR</h4>
                  <div className="space-y-3">
                    <Slider label="Brightness" value={selectedClip.transform.brightness} min={0} max={2} step={0.05} onChange={(v) => store.updateClipTransform(selectedClip.id, { brightness: v })} />
                    <Slider label="Contrast" value={selectedClip.transform.contrast} min={0} max={2} step={0.05} onChange={(v) => store.updateClipTransform(selectedClip.id, { contrast: v })} />
                    <Slider label="Saturation" value={selectedClip.transform.saturation} min={0} max={3} step={0.05} onChange={(v) => store.updateClipTransform(selectedClip.id, { saturation: v })} />
                  </div>
                </div>
                {selectedClip.effects.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold text-[#888] mb-3">APPLIED EFFECTS</h4>
                    <div className="space-y-3 border-t border-[#333] pt-3">
                      {selectedClip.effects.map(ef => (
                        <div key={ef.id} className="bg-[#252525] p-3 rounded flex flex-col gap-2">
                          <div className="flex justify-between items-center text-xs text-white">
                            <span className="capitalize">{ef.type}</span>
                            <button onClick={() => store.removeEffect(selectedClip.id, ef.id)} className="text-[#888] hover:text-error"><span className="material-symbols-outlined text-[14px]">close</span></button>
                          </div>
                          <Slider label="Intensity" value={ef.intensity} min={0} max={1} step={0.01} onChange={(v) => store.updateEffect(selectedClip.id, ef.id, v)} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-[#666] text-center mt-10">Select a clip in the timeline.</div>
            )}
          </div>
        </div>

      </div>

      {/* Timeline Panel */}
      <div className="h-64 border-t border-[#2A2A2A] bg-[#1E1E1E] flex flex-col shrink-0 relative overflow-hidden">
        
        {/* Timeline Tools */}
        <div className="h-10 bg-[#252525] border-b border-[#333] flex items-center px-4 gap-4 shrink-0 z-50">
          <div className="flex bg-[#111] rounded p-1">
            <button 
              onClick={() => setActiveTool('selection')}
              className={`p-1.5 rounded flex items-center justify-center ${activeTool === 'selection' ? 'bg-primary text-white' : 'text-[#888] hover:text-white'}`}
              title="Selection Tool (V)"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_selector_tool</span>
            </button>
            <button 
              onClick={() => setActiveTool('razor')}
              className={`p-1.5 rounded flex items-center justify-center ${activeTool === 'razor' ? 'bg-primary text-white' : 'text-[#888] hover:text-white'}`}
              title="Razor Tool (C)"
            >
              <span className="material-symbols-outlined text-[18px]">content_cut</span>
            </button>
          </div>
          <div className="w-[1px] h-4 bg-[#444]"></div>
          <span className="text-[10px] text-[#A0A0A0]">{activeTool === 'selection' ? 'Drag clips to move them' : 'Click on a clip to split it'}</span>
        </div>

        {/* Playhead Marker */}
        <div 
          className="absolute top-10 bottom-0 w-[1px] bg-red-500 z-50 pointer-events-none" 
          style={{ left: `${(store.playhead / store.duration) * 100}%`, marginLeft: '96px' }} // 96px is track header width
        >
          <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-red-500 -ml-[5.5px]" />
        </div>

        {/* Tracks Area */}
        <div className="flex-1 overflow-y-auto" onClick={handleTimelineClick} ref={containerRef}>
          {store.tracks.map(track => (
            <div key={track.id} className="flex border-b border-[#2A2A2A] h-16 group">
              {/* Track Header */}
              <div className="w-24 bg-[#252525] border-r border-[#111] flex items-center px-2 shrink-0 z-40 relative">
                <span className="text-[10px] font-bold text-[#888]">{track.name}</span>
              </div>
              {/* Track Content */}
              <div className="flex-1 bg-[#1A1A1A] relative cursor-crosshair">
                {/* Time Ruler (only on first track) */}
                {store.tracks.indexOf(track) === 0 && (
                   <div className="absolute top-0 left-0 right-0 h-4 bg-[#252525] border-b border-[#111] flex pointer-events-none">
                     {/* Simplified ruler */}
                   </div>
                )}
                {/* Clips */}
                {store.clips.filter(c => c.trackId === track.id).map(clip => {
                  const asset = store.assets.find(a => a.id === clip.assetId);
                  const left = `${(clip.start / store.duration) * 100}%`;
                  const width = `${((clip.end - clip.start) / store.duration) * 100}%`;
                  const isSelected = store.selectedClipId === clip.id;
                  
                  return (
                    <div 
                      key={clip.id}
                      onMouseDown={(e) => handleClipMouseDown(e, clip)}
                      className={`absolute top-1 bottom-1 rounded border overflow-hidden flex flex-col justify-center px-2
                        ${isSelected ? 'border-white z-20 shadow-[0_0_0_1px_white]' : 'border-black/50 z-10 hover:border-[#666]'}
                        ${track.type === 'video' ? 'bg-[#3A5A80]' : 'bg-[#3A805A]'}
                        ${activeTool === 'razor' ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
                      style={{ left, width }}
                    >
                      <span className="text-[10px] text-white/80 truncate pointer-events-none px-1">
                        {clip.type === 'text' ? `T: ${clip.textData?.content}` : asset?.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Component to handle frame-accurate video syncing
function VideoFrameSync({ src, time, style, type }: { src: string, time: number, style: React.CSSProperties, type: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (type === 'video' && ref.current) {
      // Small optimization: only update if delta is significant to avoid stuttering
      if (Math.abs(ref.current.currentTime - time) > 0.05) {
        ref.current.currentTime = time;
      }
    }
  }, [time, type]);

  if (type === 'image') return <img src={src} style={style} alt="" />;
  return <video ref={ref} src={src} style={style} muted playsInline />;
}

// UI Helper
function Slider({ label, value, min, max, step, onChange }: { label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[10px] text-[#A0A0A0]">
        <span>{label}</span>
        <span className="font-code text-primary">{value.toFixed(2)}</span>
      </div>
      <input 
        type="range" min={min} max={max} step={step} 
        value={value} onChange={e => onChange(Number(e.target.value))} 
        className="w-full accent-primary h-1 bg-[#333] rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full" 
      />
    </div>
  );
}
