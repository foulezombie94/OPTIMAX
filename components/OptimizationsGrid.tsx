'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import { toggleOptimizationPrivacy } from '@/app/actions/optimizations';

type Optimization = {
  id: string;
  file_name: string;
  original_size: number;
  compressed_size: number;
  file_type: string;
  created_at: string;
  preview_url?: string;
  is_public?: boolean;
  views?: number;
  likes?: number;
  shares?: number;
};

// Interactive WebGL 3D model viewer supporting GLB, GLTF, OBJ, and STL
export function ThreeViewer({ 
  src, 
  fileType, 
  showLegend = true 
}: { 
  src: string; 
  fileType: string; 
  showLegend?: boolean; 
}) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    let scene: any, camera: any, renderer: any, controls: any, animationFrameId: any;
    let isDestroyed = false;

    const init = async () => {
      try {
        const THREE = await import('three');
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
        
        // Setup scene
        scene = new THREE.Scene();

        // Setup camera
        const width = currentMount.clientWidth || 350;
        const height = currentMount.clientHeight || 350;
        camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
        camera.position.set(0, 0, 5);
        scene.add(camera); // Add camera to scene to allow camera-attached lights

        // Setup renderer
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        if (isDestroyed) {
          renderer.dispose();
          renderer.forceContextLoss();
          return;
        }
        currentMount.appendChild(renderer.domElement);

        // Setup controls
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;

        // Setup lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        // Headlight attached to camera (always lights the side the user is looking at!)
        const cameraLight = new THREE.DirectionalLight(0xffffff, 0.8);
        cameraLight.position.set(0, 0, 1);
        camera.add(cameraLight);

        // Fixed directional light for nice depth/rim shadow definition
        const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.4);
        dirLight1.position.set(5, 10, 7);
        scene.add(dirLight1);

        const dirLight2 = new THREE.DirectionalLight(0x10b981, 0.35); // Premium subtle emerald-green rim light matching OptiMax theme
        dirLight2.position.set(-5, -5, -5);
        scene.add(dirLight2);

        // Add a subtle grid helper on the floor for orientation and angles
        const gridHelper = new THREE.GridHelper(30, 30, 0x10b981, 0x3f3f46);
        if (gridHelper.material) {
          (gridHelper.material as any).opacity = 0.25;
          (gridHelper.material as any).transparent = true;
        }
        scene.add(gridHelper);

        // Load model based on type — guard against null src
        if (!src) {
          console.warn('ThreeViewer: No source URL provided, skipping model load');
          // Still run animate loop for the grid/scene
          const animate = () => {
            if (isDestroyed) return;
            animationFrameId = requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
          };
          animate();
          return;
        }
        const lowerSrc = src.toLowerCase();
        const safeFileType = (fileType || '').toLowerCase();
        let loader: any;
        let object: any;

        const centerObject = (obj: any) => {
          const box = new THREE.Box3().setFromObject(obj);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());

          // Center the object relative to coordinates origin
          obj.position.x += (obj.position.x - center.x);
          obj.position.y += (obj.position.y - center.y);
          obj.position.z += (obj.position.z - center.z);

          // If the model is tall (e.g. humanoid/character), target the upper chest/face region (Y > X and Y > Z)
          let targetY = 0;
          if (size.y > size.x && size.y > size.z) {
            targetY = size.y * 0.22; // Offset focus slightly upwards towards the face
          }
          controls.target.set(0, targetY, 0);
          
          // Prevent camera clipping when zooming extremely close (make perspective near clipping very small)
          const maxDim = Math.max(size.x, size.y, size.z);
          camera.near = Math.max(0.0001, Math.min(0.005, maxDim * 0.0005));
          camera.far = Math.max(1000, maxDim * 50);
          camera.updateProjectionMatrix();

          const fov = camera.fov * (Math.PI / 180);
          let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
          cameraZ *= 1.15; // Zoomed in closer for better details
          camera.position.set(0, targetY + maxDim * 0.1, cameraZ);
          
          camera.lookAt(new THREE.Vector3(0, targetY, 0));

          // Set grid helper position below the model bounding box bottom
          gridHelper.position.y = -size.y / 2 - 0.01;
          const gridSize = Math.max(size.x, size.z) * 4;
          gridHelper.scale.set(gridSize / 30, 1, gridSize / 30);

          // Set control limits to prevent losing the model in space while allowing close zoom
          controls.maxDistance = maxDim * 5;
          controls.minDistance = maxDim * 0.01; // Reduced to allow zooming in very close
          
          controls.update();
        };

        if (lowerSrc.endsWith('.glb') || lowerSrc.endsWith('.gltf') || safeFileType.includes('glb') || safeFileType.includes('gltf')) {
          const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
          loader = new GLTFLoader();
          loader.load(src, (gltf: any) => {
            if (isDestroyed) return;
            object = gltf.scene;
            scene.add(object);
            centerObject(object);
          });
        } else if (lowerSrc.endsWith('.obj') || safeFileType.includes('obj')) {
          const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js');
          loader = new OBJLoader();
          loader.load(src, (obj: any) => {
            if (isDestroyed) return;
            object = obj;
            
            // Apply a default premium material since OBJ doesn't carry materials natively in this loader
            obj.traverse((child: any) => {
              if (child.isMesh) {
                if (child.geometry && !child.geometry.attributes.normal) {
                  child.geometry.computeVertexNormals();
                }
                child.material = new THREE.MeshStandardMaterial({
                  color: 0x10b981, // Premium emerald green
                  roughness: 0.3,
                  metalness: 0.7
                });
              }
            });
            scene.add(object);
            centerObject(object);
          });
        } else if (lowerSrc.endsWith('.stl') || safeFileType.includes('stl')) {
          const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js');
          loader = new STLLoader();
          loader.load(src, (geometry: any) => {
            if (isDestroyed) return;
            if (!geometry.attributes.normal) {
              geometry.computeVertexNormals();
            }
            const material = new THREE.MeshStandardMaterial({ 
              color: 0x10b981, // Premium emerald green
              roughness: 0.3,
              metalness: 0.7
            });
            object = new THREE.Mesh(geometry, material);
            scene.add(object);
            centerObject(object);
          });
        }

        // Handle resize via ResizeObserver to handle transition layout scale shifts gracefully
        const resizeObserver = new ResizeObserver((entries) => {
          if (isDestroyed) return;
          for (let entry of entries) {
            const w = entry.contentRect.width;
            const h = entry.contentRect.height;
            if (w === 0 || h === 0) continue;
            if (camera && renderer) {
              camera.aspect = w / h;
              camera.updateProjectionMatrix();
              renderer.setSize(w, h);
            }
          }
        });
        resizeObserver.observe(currentMount);

        // Animation loop
        const animate = () => {
          if (isDestroyed) return;
          animationFrameId = requestAnimationFrame(animate);
          
          controls.update();
          renderer.render(scene, camera);
        };
        animate();

        return () => {
          resizeObserver.disconnect();
        };
      } catch (err) {
        console.error('Failed to initialize Three.js viewer:', err);
      }
    };

    const cleanupPromise = init();

    return () => {
      isDestroyed = true;
      cancelAnimationFrame(animationFrameId);
      if (renderer && renderer.domElement && currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
      if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss();
      }
      cleanupPromise.then(cleanup => cleanup && cleanup());
    };
  }, [src, fileType]);

  return (
    <div className="relative w-full h-full min-h-[350px]">
      <div ref={mountRef} className="w-full h-full" />
      {/* Navigation Help Legend */}
      {showLegend && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-background/60 backdrop-blur-md border border-white/5 px-4 py-1.5 rounded-full text-[10px] text-on-surface-variant font-medium select-none pointer-events-none flex items-center gap-3 shadow-md whitespace-nowrap hidden sm:flex">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px] text-emerald-400">ads_click</span> Clic gauche : Pivoter
          </span>
          <span className="h-3 w-[1px] bg-white/10" />
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px] text-emerald-400">pan_tool</span> Clic droit : Déplacer
          </span>
          <span className="h-3 w-[1px] bg-white/10" />
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px] text-emerald-400">zoom_in</span> Molette : Zoomer
          </span>
        </div>
      )}
    </div>
  );
}

export default function OptimizationsGrid({ optimizations }: { optimizations: Optimization[] }) {
  const [localOpts, setLocalOpts] = useState<Optimization[]>(optimizations);
  const [selectedOpt, setSelectedOpt] = useState<Optimization | null>(null);

  useEffect(() => {
    setLocalOpts(optimizations);
  }, [optimizations]);

  const handleTogglePrivacy = async () => {
    if (!selectedOpt) return;
    const newPrivacy = !selectedOpt.is_public;
    
    // Optimistic UI updates
    setSelectedOpt(prev => prev ? { ...prev, is_public: newPrivacy } : null);
    setLocalOpts(prev => prev.map(o => o.id === selectedOpt.id ? { ...o, is_public: newPrivacy } : o));

    try {
      const result = await toggleOptimizationPrivacy(selectedOpt.id, newPrivacy);
      if (result.error) {
        console.error('Failed to update privacy:', result.error);
        // Rollback
        setSelectedOpt(prev => prev ? { ...prev, is_public: !newPrivacy } : null);
        setLocalOpts(prev => prev.map(o => o.id === selectedOpt.id ? { ...o, is_public: !newPrivacy } : o));
      }
    } catch (err) {
      console.error('Privacy toggle error:', err);
      // Rollback
      setSelectedOpt(prev => prev ? { ...prev, is_public: !newPrivacy } : null);
      setLocalOpts(prev => prev.map(o => o.id === selectedOpt.id ? { ...o, is_public: !newPrivacy } : o));
    }
  };

  // Deduplicate by file_name using useMemo to avoid recalculation on every render
  const displayList = useMemo(() => {
    const unique: Optimization[] = [];
    const seen = new Set<string>();
    for (const opt of localOpts) {
      if (!seen.has(opt.file_name)) {
        seen.add(opt.file_name);
        unique.push(opt);
      }
    }
    return unique.slice(0, 5);
  }, [localOpts]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const isNegative = bytes < 0;
    const absBytes = Math.abs(bytes);
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(absBytes) / Math.log(k));
    const value = parseFloat((absBytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    return isNegative ? '-' + value : value;
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {displayList.length === 0 ? (
          <div className="md:col-span-2 glass-panel rounded-xl p-8 text-center opacity-70 flex flex-col items-center justify-center min-h-[300px]">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-4">image_not_supported</span>
            <h3 className="font-headline-md text-headline-md text-on-surface mb-2">No optimizations yet</h3>
            <p className="text-on-surface-variant text-body-md">Compress your first file to see it appear here.</p>
          </div>
        ) : (
          displayList.map((opt, index) => {
            const diffBytes = opt.original_size - opt.compressed_size;
            const isBigger = diffBytes < 0;
            const absDiffBytes = Math.abs(diffBytes);
            const ratio = Math.round((absDiffBytes / opt.original_size) * 100);
            const dateStr = new Date(opt.created_at).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
            
            const isFirst = index === 0;
            
            return (
              <div 
                key={opt.id} 
                onClick={() => setSelectedOpt(opt)}
                className={`glass-panel rounded-xl overflow-hidden group cursor-pointer ${isFirst ? 'md:col-span-2' : ''}`}
              >
                <div className={`relative w-full overflow-hidden ${isFirst ? 'h-64 md:h-80' : 'h-48'}`}>
                  {/* Privacy Badge */}
                  {opt.file_type?.startsWith('model/') && (
                    <div className="absolute top-4 right-4 z-10 bg-background/70 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-full text-on-surface-variant flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase shadow-lg">
                      <span className="material-symbols-outlined text-[13px] text-primary">
                        {opt.is_public ? 'public' : 'lock'}
                      </span>
                      <span>{opt.is_public ? 'Public' : 'Private'}</span>
                    </div>
                  )}
                  {opt.file_type?.startsWith('model/') ? (
                    <div className="w-full h-full bg-gradient-to-tr from-primary/15 to-tertiary/10 flex flex-col items-center justify-center relative p-6 group-hover:scale-105 transition-transform duration-500">
                      <div className="absolute inset-0 tech-grid opacity-20 pointer-events-none mix-blend-overlay"></div>
                      <span className="material-symbols-outlined text-[64px] text-primary mb-2">view_in_ar</span>
                      <span className="bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                        {opt.file_type.split('/')[1]?.toUpperCase() || '3D'} Model
                      </span>
                    </div>
                  ) : opt.preview_url ? (
                    <Image src={opt.preview_url} alt={opt.file_name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 768px) 100vw, 50vw" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-surface to-surface-tint flex items-center justify-center opacity-30 group-hover:scale-105 transition-transform duration-500">
                      <span className="material-symbols-outlined text-[64px] text-on-surface-variant">
                        {opt.file_type?.startsWith('video/') ? 'movie' : 'image'}
                      </span>
                    </div>
                  )}
                  <div className={`absolute inset-0 bg-gradient-to-t ${isFirst ? 'from-background via-transparent to-transparent opacity-80' : 'from-background/80 to-transparent'}`}></div>
                  <div className={`absolute ${isFirst ? 'bottom-6 left-6 right-6' : 'bottom-4 left-4'}`}>
                    <h3 className={`${isFirst ? 'font-headline-md text-headline-md mb-2' : 'font-label-lg text-label-lg'} text-on-surface truncate pr-4`}>{opt.file_name}</h3>
                    {isFirst && (
                      <p className="text-on-surface-variant text-body-md line-clamp-2">
                        Traité le {dateStr} • {isBigger ? `+${formatBytes(absDiffBytes)}` : `-${formatBytes(absDiffBytes)}`} ({isBigger ? '+' : '-'}{ratio}%)
                      </p>
                    )}
                  </div>
                </div>
                {!isFirst && (
                  <div className="p-4 flex justify-between items-center border-t border-white/5">
                    <div className="flex gap-2 text-on-surface-variant text-body-sm">
                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">equalizer</span> {isBigger ? '+' : '-'}{ratio}%</span>
                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">save</span> {isBigger ? '+' : '-'}{formatBytes(absDiffBytes)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Details Modal */}
      {selectedOpt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/85 backdrop-blur-md animate-fade-in" onClick={() => setSelectedOpt(null)}>
          <div 
            className="glass-panel w-full max-w-6xl rounded-[32px] overflow-hidden flex flex-col md:flex-row relative animate-scale-in bg-[#101014]/95 shadow-[0_20px_60px_rgba(0,0,0,0.6)] border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              className="absolute top-5 right-5 z-10 w-9.5 h-9.5 flex items-center justify-center rounded-full bg-surface/50 text-on-surface hover:bg-surface border border-white/5 transition-colors focus:outline-none active:scale-95"
              onClick={() => setSelectedOpt(null)}
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
            
            {/* Media Visualizer (Left Panel) */}
            <div className="w-full md:w-2/3 h-80 md:h-[600px] bg-[#070709] flex items-center justify-center relative overflow-hidden">
              {/* Tech scan grid lines */}
              <div className="absolute inset-0 tech-grid opacity-30 pointer-events-none"></div>
              
              {selectedOpt.file_type?.startsWith('model/') && selectedOpt.preview_url ? (
                <ThreeViewer src={selectedOpt.preview_url} fileType={selectedOpt.file_type} />
              ) : selectedOpt.preview_url ? (
                <div className="relative w-full h-full p-4"><Image src={selectedOpt.preview_url} alt={selectedOpt.file_name} fill className="object-contain" sizes="100vw" /></div>
              ) : (
                <span className="material-symbols-outlined text-[96px] text-on-surface-variant opacity-50">
                  {selectedOpt.file_type?.startsWith('video/') ? 'movie' : 'image'}
                </span>
              )}

              {/* Visualizer Badge */}
              {selectedOpt.file_type?.startsWith('model/') && (
                <div className="absolute bottom-5 left-5 bg-background/70 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full text-on-surface-variant text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 select-none shadow-lg">
                  <span className="material-symbols-outlined text-[15px] text-emerald-400">view_in_ar</span>
                  Rendu WebGL 3D
                </div>
              )}
            </div>
            
            {/* Details & Actions (Right Panel) */}
            <div className="w-full md:w-1/3 p-8 flex flex-col justify-between border-l border-white/5 bg-[#121217]/50">
              <div>
                <h2 className="font-display text-2xl font-bold text-on-surface break-all leading-tight tracking-tight mb-4" title={selectedOpt.file_name}>
                  {selectedOpt.file_name}
                </h2>
                
                {/* Stats Indicators */}
                {selectedOpt.file_type?.startsWith('model/') && (
                  <div className="flex gap-4 text-on-surface-variant text-[12px] mb-6 border-b border-white/5 pb-4">
                    <span className="flex items-center gap-1" title="Vues">
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      <span>{selectedOpt.views || 0}</span>
                    </span>
                    <span className="flex items-center gap-1" title="J'aime">
                      <span className="material-symbols-outlined text-[16px] text-error">favorite</span>
                      <span>{selectedOpt.likes || 0}</span>
                    </span>
                    <span className="flex items-center gap-1" title="Partages">
                      <span className="material-symbols-outlined text-[16px] text-primary">share</span>
                      <span>{selectedOpt.shares || 0}</span>
                    </span>
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <p className="text-body-sm text-on-surface-variant uppercase tracking-wider mb-1 font-semibold">Taille originale</p>
                    <p className="font-label-lg text-label-lg text-on-surface">{formatBytes(selectedOpt.original_size)}</p>
                  </div>
                  <div>
                    <p className="text-body-sm text-on-surface-variant uppercase tracking-wider mb-1 font-semibold">Taille finale</p>
                    <p className="font-label-lg text-label-lg text-primary">{formatBytes(selectedOpt.compressed_size)}</p>
                  </div>
                  {(() => {
                    const diffBytes = selectedOpt.original_size - selectedOpt.compressed_size;
                    const isBigger = diffBytes < 0;
                    const absDiffBytes = Math.abs(diffBytes);
                    const ratio = Math.round((absDiffBytes / selectedOpt.original_size) * 100);
                    
                    return (
                      <div>
                        <p className="text-body-sm text-on-surface-variant uppercase tracking-wider mb-1 font-semibold">
                          {isBigger ? 'Espace supplémentaire' : 'Espace économisé'}
                        </p>
                        <p className={`font-label-lg text-label-lg ${isBigger ? 'text-error' : 'text-tertiary'}`}>
                          {isBigger ? '+' : '-'}{formatBytes(absDiffBytes)} 
                          <span className="opacity-70 ml-2 font-code">
                            ({isBigger ? '+' : '-'}{ratio}%)
                          </span>
                        </p>
                      </div>
                    );
                  })()}
                  <div>
                    <p className="text-body-sm text-on-surface-variant uppercase tracking-wider mb-1 font-semibold">Date de traitement</p>
                    <p className="font-label-lg text-label-lg text-on-surface">
                      {new Date(selectedOpt.created_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Privacy Toggle (only for 3D models) */}
              {selectedOpt.file_type?.startsWith('model/') && (
                <div className="border-t border-white/5 pt-6 mt-6 flex items-center justify-between">
                  <div>
                    <p className="font-label-md text-label-md text-on-surface font-semibold">Publier dans la communauté</p>
                    <p className="text-[11px] text-on-surface-variant max-w-[180px] mt-0.5 leading-relaxed">Permettre aux autres de voir, pivoter et aimer ce modèle.</p>
                  </div>
                  <button
                    onClick={handleTogglePrivacy}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${selectedOpt.is_public ? 'bg-emerald-500' : 'bg-white/10 border border-white/10'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${selectedOpt.is_public ? 'translate-x-6' : 'translate-x-1'}`}
                    />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
