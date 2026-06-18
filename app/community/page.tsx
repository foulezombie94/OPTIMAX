'use client';

import { useState, useEffect, Suspense, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { ThreeViewer } from '@/components/OptimizationsGrid';

type PublicOptimization = {
  id: string;
  user_id: string;
  file_name: string;
  original_size: number;
  compressed_size: number;
  file_type: string;
  created_at: string;
  preview_url: string;
  views: number;
  likes: number;
  shares: number;
  creator_name: string;
  creator_is_pro: boolean;
  popularity_score: number;
  fileTypeLabel?: string;
};

function CommunityContent() {
  const [items, setItems] = useState<PublicOptimization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'popularity' | 'likes' | 'views' | 'newest'>('popularity');
  const [selectedItem, setSelectedItem] = useState<PublicOptimization | null>(null);
  const [likedItems, setLikedItems] = useState<string[]>([]);
  const [viewedItems, setViewedItems] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  // Pagination limit state
  const [visibleLimit, setVisibleLimit] = useState(9);
  
  const searchParams = useSearchParams();
  const [supabase] = useState(() => createClient());

  const incrementViewCount = async (id: string) => {
    try {
      await supabase.rpc('increment_views', { opt_id: id });
    } catch (err) {
      console.error('Failed to increment views:', err);
    }
  };

  // Debounce search query
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load initial data and liked/viewed items list
  useEffect(() => {
    let isMounted = true;
    
    // Fetch liked and viewed items from localStorage synchronously first
    let savedLikes: string[] = [];
    let savedViews: string[] = [];
    try {
      savedLikes = JSON.parse(localStorage.getItem('optimax_liked_items') || '[]');
      savedViews = JSON.parse(localStorage.getItem('optimax_viewed_items') || '[]');
      setLikedItems(savedLikes);
      setViewedItems(savedViews);
    } catch (e) {
      console.error('Failed to load storage details from localStorage', e);
    }
    
    async function fetchShowcase() {
      try {
        const { data, error } = await supabase
          .from('public_optimizations_popularity')
          .select('*');
        
        if (error) throw error;
        
        // Filter out non-3D files strictly to ensure only 3D models appear
        const public3DOnly = (data || [])
          .filter((item: PublicOptimization) => {
            const fileType = item.file_type.toLowerCase();
            const fileName = item.file_name.toLowerCase();
            return (
              fileType.startsWith('model/') ||
              fileName.match(/\.(obj|fbx|stl|glb|gltf|ply|dae)$/i)
            );
          })
          .map((item: PublicOptimization) => ({
            ...item,
            fileTypeLabel: item.file_type.split('/')[1]?.toUpperCase() || '3D'
          }));

        if (!isMounted) return;
        setItems(public3DOnly);
        
        // Auto-open if query param exists
        const showId = searchParams.get('show');
        if (showId && public3DOnly) {
          const matchedItem = public3DOnly.find((x: PublicOptimization) => x.id === showId);
          if (matchedItem) {
            setSelectedItem(matchedItem);
            
            // Check if already viewed in this device using the synchronous array
            if (!savedViews.includes(showId)) {
              savedViews.push(showId);
              if (typeof window !== 'undefined') localStorage.setItem('optimax_viewed_items', JSON.stringify(savedViews));
              setViewedItems(savedViews);
              
              // Increment views locally
              const updatedItem = { ...matchedItem, views: (matchedItem.views || 0) + 1 };
              setSelectedItem(updatedItem);
              setItems(prev => prev.map(x => x.id === showId ? updatedItem : x));
              
              // Increment view quietly in db
              incrementViewCount(showId);
            } else {
              setSelectedItem(matchedItem);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching community showcase:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchShowcase();
    
    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle opening details modal (increments view count at most once per device)
  const handleOpenItem = (item: PublicOptimization) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsClosing(false);

    const isAlreadyViewed = viewedItems.includes(item.id);
    
    if (!isAlreadyViewed) {
      const updatedViews = [...viewedItems, item.id];
      setViewedItems(updatedViews);
      
      try {
        if (typeof window !== 'undefined') localStorage.setItem('optimax_viewed_items', JSON.stringify(updatedViews));
      } catch (e) {
        console.error('Failed to save viewed items to localStorage', e);
      }
      
      const updatedItem = { ...item, views: (item.views || 0) + 1 };
      setSelectedItem(updatedItem);
      
      // Update local state views count
      setItems(prev => prev.map(x => x.id === item.id ? updatedItem : x));
      
      // Call RPC views increment in database
      incrementViewCount(item.id);
    } else {
      setSelectedItem(item);
    }
    
    // Update URL query parameter without re-rendering Next.js route
    if (typeof window !== 'undefined') window.history.replaceState(null, '', `/community?show=${item.id}`);
  };

  // Handle closing modal
  const handleCloseModal = () => {
    setIsClosing(true);
    closeTimerRef.current = setTimeout(() => {
      setSelectedItem(null);
      setIsClosing(false);
      if (typeof window !== 'undefined') window.history.replaceState(null, '', '/community');
    }, 250); // Wait for transition duration
  };

  // Handle Liking / Unliking an item
  const handleLikeItem = async (e: React.MouseEvent, item: PublicOptimization) => {
    e.stopPropagation();
    
    const isAlreadyLiked = likedItems.includes(item.id);
    const previousItems = [...items];
    const previousSelectedItem = selectedItem;
    const previousLikedItems = [...likedItems];
    
    if (isAlreadyLiked) {
      // UNLIKE
      const updatedLikes = likedItems.filter(id => id !== item.id);
      setLikedItems(updatedLikes);
      if (typeof window !== 'undefined') localStorage.setItem('optimax_liked_items', JSON.stringify(updatedLikes));

      // Optimistic UI updates (decrement likes, minimum 0)
      setItems(prev => prev.map(x => x.id === item.id ? { ...x, likes: Math.max(0, (x.likes || 0) - 1) } : x));
      if (selectedItem && selectedItem.id === item.id) {
        setSelectedItem(prev => prev ? { ...prev, likes: Math.max(0, (prev.likes || 0) - 1) } : null);
      }

      try {
        await supabase.rpc('decrement_likes', { opt_id: item.id });
      } catch (err) {
        console.error('Failed to unlike item:', err);
        setItems(previousItems);
        setSelectedItem(previousSelectedItem);
        setLikedItems(previousLikedItems);
      }
    } else {
      // LIKE
      const updatedLikes = [...likedItems, item.id];
      setLikedItems(updatedLikes);
      if (typeof window !== 'undefined') localStorage.setItem('optimax_liked_items', JSON.stringify(updatedLikes));

      // Optimistic UI updates
      setItems(prev => prev.map(x => x.id === item.id ? { ...x, likes: (x.likes || 0) + 1 } : x));
      if (selectedItem && selectedItem.id === item.id) {
        setSelectedItem(prev => prev ? { ...prev, likes: (prev.likes || 0) + 1 } : null);
      }

      try {
        await supabase.rpc('increment_likes', { opt_id: item.id });
      } catch (err) {
        console.error('Failed to like item:', err);
        setItems(previousItems);
        setSelectedItem(previousSelectedItem);
        setLikedItems(previousLikedItems);
      }
    }
  };

  // Handle Sharing an item
  const handleShareItem = async (e: React.MouseEvent, item: PublicOptimization) => {
    e.stopPropagation();
    
    if (typeof window === 'undefined') return;
    const shareUrl = `${window.location.origin}/community?show=${item.id}`;
    
    const previousItems = [...items];
    const previousSelectedItem = selectedItem;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setToastMessage('Lien copié dans le presse-papiers !');
      setTimeout(() => setToastMessage(''), 3000);
      
      // Optimistic UI updates
      setItems(prev => prev.map(x => x.id === item.id ? { ...x, shares: (x.shares || 0) + 1 } : x));
      if (selectedItem && selectedItem.id === item.id) {
        setSelectedItem(prev => prev ? { ...prev, shares: (prev.shares || 0) + 1 } : null);
      }

      await supabase.rpc('increment_shares', { opt_id: item.id });
    } catch (err) {
      console.error('Failed to share/copy link:', err);
      setItems(previousItems);
      setSelectedItem(previousSelectedItem);
    }
  };

  // Filter & Sort Items
  const filteredItems = useMemo(() => {
    return items
      .filter(item => {
        const cleanQuery = debouncedQuery.trim().toLowerCase();
        
        const matchesSearch = (
          item.file_name.toLowerCase().includes(cleanQuery) ||
          item.creator_name?.toLowerCase().includes(cleanQuery)
        );
        
        return matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'likes') return (b.likes || 0) - (a.likes || 0);
        if (sortBy === 'views') return (b.views || 0) - (a.views || 0);
        if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        
        // Default: Popularity (Likes * 10 + Shares * 5 + Views)
        const scoreA = (a.likes || 0) * 10 + (a.shares || 0) * 5 + (a.views || 0);
        const scoreB = (b.likes || 0) * 10 + (b.shares || 0) * 5 + (b.views || 0);
        return scoreB - scoreA;
      });
  }, [items, debouncedQuery, sortBy]);

  const formatBytes = (bytes: number) => {
    if (bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'Ko', 'Mo', 'Go', 'To'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <main className="flex-grow pt-[110px] pb-28 px-6 md:px-12 relative w-full flex-1 z-10 bg-gradient-to-b from-[#0d0d10] via-[#131318] to-[#0d0d10]">
      {/* Decorative Orbs & Mesh Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-1/3 right-1/4 w-[450px] h-[450px] bg-tertiary/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-secondary/10 rounded-full blur-[100px] pointer-events-none"></div>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-[200] bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 px-6 py-3.5 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-lg animate-scale-in flex items-center gap-3">
          <span className="material-symbols-outlined text-emerald-400">check_circle</span>
          <span className="font-label-md font-bold tracking-wide">{toastMessage}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header Block */}
        <div className="text-center max-w-3xl mx-auto space-y-5 relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            Showroom Virtuel
          </div>
          
          <h1 className="font-display text-[48px] md:text-[68px] font-black text-on-surface tracking-tighter leading-none bg-clip-text text-transparent bg-gradient-to-r from-primary via-tertiary to-secondary">
            Galerie de la Communauté
          </h1>
          <p className="text-body-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed font-light">
            Découvrez les modèles 3D optimisés et partagés publiquement par nos créateurs. Inspectez les fichiers en temps réel avec notre visualiseur WebGL natif.
          </p>
        </div>

        {/* Toolbar: Search & Filter */}
        <div className="glass-panel p-5 rounded-3xl flex flex-col lg:flex-row gap-5 items-center justify-between bg-surface/30 border-white/5 shadow-2xl relative z-20">
          {/* Search Input */}
          <div className="relative w-full lg:w-96 group">
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              maxLength={80}
              className="w-full pl-12 pr-6 py-3.5 bg-white/[0.02] border border-white/10 rounded-2xl focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all outline-none text-on-surface placeholder:text-on-surface-variant/40 text-body-md shadow-inner group-hover:border-white/15" 
              placeholder="Rechercher un modèle ou un créateur..." 
              type="text" 
            />
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 transition-colors group-focus-within:text-emerald-400">search</span>
          </div>

          {/* Sorting Actions */}
          <div className="flex gap-2.5 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            {[
              { id: 'popularity', label: 'Populaires', icon: 'trending_up' },
              { id: 'likes', label: 'Plus aimés', icon: 'favorite' },
              { id: 'views', label: 'Plus vus', icon: 'visibility' },
              { id: 'newest', label: 'Plus récents', icon: 'calendar_month' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSortBy(tab.id as any)}
                className={`px-5 py-3 rounded-2xl text-body-sm font-bold flex items-center gap-2 transition-all focus:outline-none whitespace-nowrap active:scale-95 ${sortBy === tab.id ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg' : 'glass-panel text-on-surface-variant hover:text-on-surface hover:bg-white/5 border-white/5'}`}
              >
                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Showroom Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[350px] text-center space-y-4">
            <span className="material-symbols-outlined text-emerald-400 text-[56px] animate-spin">autorenew</span>
            <p className="text-on-surface-variant font-medium tracking-wide">Chargement du showroom 3D...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="glass-panel rounded-3xl p-16 text-center opacity-80 flex flex-col items-center justify-center min-h-[350px] bg-surface/20 border-white/5">
            <span className="material-symbols-outlined text-[72px] text-on-surface-variant/40 mb-4 animate-bounce">search_off</span>
            <h3 className="font-headline-md text-headline-md text-on-surface mb-2 font-bold">Aucun modèle 3D trouvé</h3>
            <p className="text-on-surface-variant text-body-md font-light">Essayez d'ajuster vos termes de recherche.</p>
          </div>
        ) : (
          <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredItems.slice(0, visibleLimit).map(item => {
                const isLiked = likedItems.includes(item.id);

                // Premium Emerald theme for 3D Cards
                const themeColor = 'from-emerald-500/5 to-teal-500/5 hover:border-emerald-500/30 tech-card-glow';
                const badgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
                const cardIcon = 'view_in_ar';
                const fileTypeLabel = item.fileTypeLabel || '3D';

                return (
                  <article 
                    key={item.id}
                    className={`relative glass-panel rounded-3xl overflow-hidden group transition-all duration-500 hover:-translate-y-2 bg-[#141419]/40 flex flex-col justify-between border border-white/5 ${themeColor}`}
                  >
                    <Link 
                      href={`/community?show=${item.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        handleOpenItem(item);
                      }}
                      shallow
                      className="absolute inset-0 z-10"
                      aria-label={`Voir le modèle 3D: ${item.file_name}`}
                    />
                    {/* Model Thumbnail container */}
                    <div className="relative w-full h-60 bg-gradient-to-tr flex flex-col items-center justify-center overflow-hidden border-b border-white/5">
                      {/* Pulse glow overlay */}
                      <div className="absolute w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none animate-pulse-glow"></div>
                      
                      <div className="absolute inset-0 tech-grid opacity-[0.25] pointer-events-none mix-blend-overlay"></div>
                      
                      {item.preview_url ? (
                        <div className="absolute inset-0 w-full h-full pointer-events-none">
                          <ThreeViewer src={item.preview_url} fileType={item.file_type} showLegend={false} />
                        </div>
                      ) : (
                        /* Floating model symbol */
                        <span 
                          className="material-symbols-outlined text-[76px] text-emerald-400/80 group-hover:text-emerald-300 drop-shadow-[0_0_20px_rgba(78,222,163,0.35)] transition-all duration-700 ease-out group-hover:scale-110"
                          style={{ animation: 'float-gentle 5s ease-in-out infinite' }}
                        >
                          {cardIcon}
                        </span>
                      )}
                      
                      {/* Format pill */}
                      <span className={`absolute top-4 right-4 border px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-md ${badgeColor}`}>
                        {fileTypeLabel}
                      </span>

                      {/* File Size Badge */}
                      <div className="absolute bottom-4 left-4 bg-background/70 backdrop-blur-md border border-white/5 px-3.5 py-1.5 rounded-xl text-on-surface-variant text-[11px] font-semibold flex items-center gap-1.5 shadow-md select-none">
                        <span className="material-symbols-outlined text-[14px] text-emerald-400">save</span>
                        {formatBytes(item.compressed_size)}
                      </div>
                    </div>

                    {/* Body Content */}
                    <div className="p-6 space-y-5 flex-grow flex flex-col justify-between">
                      <div className="space-y-1">
                        <h3 className="font-label-lg text-label-lg text-on-surface truncate group-hover:text-emerald-400 transition-colors font-bold tracking-tight" title={item.file_name}>
                          {item.file_name}
                        </h3>
                        <p className="text-body-sm text-on-surface-variant flex items-center gap-1.5">
                          par <Link href={`/u/${item.creator_name || item.user_id}`} onClick={(e) => e.stopPropagation()} className="relative z-20 text-on-surface font-semibold hover:text-emerald-300 transition-colors">@{item.creator_name || 'créateur'}</Link>
                          {item.creator_is_pro && (
                            <span className="bg-tertiary/20 text-tertiary border border-tertiary/30 px-1.5 py-0.5 rounded-md text-[9px] font-bold tracking-wider uppercase select-none">
                              PRO
                            </span>
                          )}
                        </p>
                      </div>



                      {/* Stats footer & Interventions */}
                      <div className="flex justify-between items-center border-t border-white/5 pt-4">
                        {/* Social counts */}
                        <div className="flex gap-4.5 text-on-surface-variant text-[12px] font-semibold">
                          <span className="flex items-center gap-1" title="Vues">
                            <span className="material-symbols-outlined text-[16px] text-on-surface-variant/70">visibility</span>
                            <span>{item.views || 0}</span>
                          </span>
                          <span className="flex items-center gap-1" title="J'aime">
                            <span className="material-symbols-outlined text-[16px] text-error">favorite</span>
                            <span>{item.likes || 0}</span>
                          </span>
                        </div>

                        {/* Interactive Buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => handleLikeItem(e, item)}
                            className={`relative z-20 p-2.5 rounded-xl border transition-all flex items-center justify-center active:scale-90 ${isLiked ? 'bg-error/10 border-error/30 text-error shadow-[0_0_15px_rgba(255,100,100,0.1)]' : 'glass-panel text-on-surface-variant hover:text-error hover:bg-error/5 hover:border-error/20'}`}
                            title={isLiked ? 'Déjà aimé' : 'Aimer la création'}
                          >
                            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: isLiked ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
                          </button>
                          <button
                            onClick={(e) => handleShareItem(e, item)}
                            className="relative z-20 p-2.5 rounded-xl border glass-panel text-on-surface-variant hover:text-emerald-400 hover:bg-emerald-500/5 hover:border-emerald-500/20 transition-all flex items-center justify-center active:scale-90"
                            title="Partager la création"
                          >
                            <span className="material-symbols-outlined text-[18px]">share</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Pagination / Load More */}
            {filteredItems.length > visibleLimit && (
              <div className="flex justify-center pt-6">
                <button
                  onClick={() => setVisibleLimit(prev => prev + 6)}
                  className="px-9 py-4 rounded-full bg-gradient-to-tr from-surface-container to-surface-container-high border border-white/10 hover:border-emerald-500/40 text-on-surface hover:text-emerald-400 transition-all duration-300 font-label-md text-label-md flex items-center gap-2 hover:shadow-[0_0_30px_rgba(78,222,163,0.18)] active:scale-95 hover:-translate-y-0.5"
                >
                  <span className="material-symbols-outlined text-[20px]">add_circle</span>
                  Voir plus de créations
                </button>
              </div>
            )}
          </div>
        )}

        {/* Dynamic Showcase Modal */}
        {selectedItem && (
          <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/85 backdrop-blur-md transition-opacity duration-250 ease-out ${isClosing ? 'opacity-0' : 'opacity-100 animate-fade-in'}`} onClick={handleCloseModal}>
            <div 
              className={`glass-panel w-full max-w-6xl max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-[32px] flex flex-col md:flex-row relative bg-[#101014]/95 shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-white/10 transition-all duration-250 ease-out ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100 animate-scale-in'}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button 
                className="absolute top-4 right-4 md:top-5 md:right-5 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-surface/50 text-on-surface hover:bg-surface border border-white/5 transition-colors focus:outline-none active:scale-95"
                onClick={handleCloseModal}
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
              
              {/* Media Visualizer (Left Panel) */}
              <div className="w-full md:w-2/3 h-80 md:h-[600px] bg-[#070709] flex items-center justify-center relative overflow-hidden">
                {/* Tech scan grid lines */}
                <div className="absolute inset-0 tech-grid opacity-30 pointer-events-none"></div>
                
                <ThreeViewer src={selectedItem.preview_url} fileType={selectedItem.file_type} />
                
                {/* Visualizer Badge */}
                <div className="absolute bottom-5 left-5 bg-background/70 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full text-on-surface-variant text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 select-none shadow-lg">
                  <span className="material-symbols-outlined text-[15px] text-emerald-400">view_in_ar</span>
                  Rendu WebGL 3D
                </div>
              </div>
              
              {/* Details & Interactive Actions (Right Panel) */}
              <div className="w-full md:w-1/3 p-8 flex flex-col justify-between border-l border-white/5 bg-[#121217]/50">
                <div className="space-y-6">
                  <div className="space-y-1.5">
                    {selectedItem.creator_is_pro && (
                      <div className="inline-flex items-center gap-1.5 text-[10px] text-tertiary bg-tertiary/10 border border-tertiary/20 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider select-none">
                        <span className="material-symbols-outlined text-[12px] fill-1">bolt</span> Créateur PRO
                      </div>
                    )}
                    <h2 className="font-display text-2xl font-bold text-on-surface break-all leading-tight tracking-tight" title={selectedItem.file_name}>
                      {selectedItem.file_name}
                    </h2>
                    <p className="text-body-sm text-on-surface-variant">
                      partagé par <Link href={`/u/${selectedItem.creator_name || selectedItem.user_id}`} onClick={(e) => e.stopPropagation()} className="text-emerald-400 font-semibold hover:text-emerald-300 transition-colors cursor-pointer">@{selectedItem.creator_name || 'créateur'}</Link>
                    </p>
                  </div>
                  
                  {/* Statistics Counters */}
                  <div className="grid grid-cols-3 gap-2 bg-white/[0.01] border border-white/5 p-3 rounded-2xl text-center shadow-inner">
                    <div className="space-y-0.5">
                      <span className="material-symbols-outlined text-blue-400 text-[18px]">visibility</span>
                      <p className="text-body-sm font-bold text-on-surface">{selectedItem.views || 0}</p>
                      <p className="text-[9px] text-on-surface-variant uppercase font-bold tracking-wider">Vues</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="material-symbols-outlined text-error text-[18px]">favorite</span>
                      <p className="text-body-sm font-bold text-on-surface">{selectedItem.likes || 0}</p>
                      <p className="text-[9px] text-on-surface-variant uppercase font-bold tracking-wider">J'aime</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="material-symbols-outlined text-primary text-[18px]">share</span>
                      <p className="text-body-sm font-bold text-on-surface">{selectedItem.shares || 0}</p>
                      <p className="text-[9px] text-on-surface-variant uppercase font-bold tracking-wider">Partages</p>
                    </div>
                  </div>
                  
                  {/* File Metadata */}
                  <div className="space-y-3 pt-1 text-body-sm">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-on-surface-variant">Taille du modèle</span>
                      <span className="font-medium text-on-surface">{formatBytes(selectedItem.compressed_size)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-on-surface-variant">Format du fichier</span>
                      <span className="font-medium text-on-surface uppercase">{selectedItem.file_type.split('/')[1]}</span>
                    </div>
                  </div>
                </div>

                {/* Primary Interaction Buttons */}
                <div className="space-y-3 pt-6 border-t border-white/5 mt-6">
                  <div className="flex gap-3">
                    <button
                      onClick={(e) => handleLikeItem(e, selectedItem)}
                      className={`flex-1 py-3.5 rounded-2xl border font-label-md text-label-md flex items-center justify-center gap-1.5 transition-all active:scale-95 ${likedItems.includes(selectedItem.id) ? 'bg-error/15 border-error/30 text-error' : 'glass-panel text-on-surface hover:text-error hover:bg-error/5 hover:border-error/20'}`}
                    >
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: likedItems.includes(selectedItem.id) ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
                      {likedItems.includes(selectedItem.id) ? 'Aimé' : 'J\'aime'}
                    </button>
                    <button
                      onClick={(e) => handleShareItem(e, selectedItem)}
                      className="flex-1 py-3.5 border glass-panel text-on-surface hover:text-emerald-400 hover:bg-emerald-500/5 hover:border-emerald-500/20 transition-all font-label-md text-label-md flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[18px]">share</span>
                      Partager
                    </button>
                  </div>
                  
                  {/* Direct Download */}
                  <a
                    href={selectedItem.preview_url}
                    download={`optimax_${selectedItem.file_name}`}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-neutral-900 font-label-md text-label-md font-bold flex items-center justify-center gap-2 select-none shadow-[0_4px_20px_rgba(78,222,163,0.25)] hover:shadow-[0_4px_35px_rgba(78,222,163,0.4)] active:scale-[0.98] transition-all hover:brightness-110"
                  >
                    <span className="material-symbols-outlined text-[18px] font-bold">download</span>
                    Télécharger le modèle 3D
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function CommunityPage() {
  return (
    <Suspense fallback={
      <main className="pt-[100px] flex font-body-md text-on-surface flex-1 w-full relative z-10 justify-center items-center bg-background min-h-[500px]">
        <div className="text-center space-y-4">
          <span className="material-symbols-outlined text-emerald-400 animate-spin text-[48px]">autorenew</span>
          <p className="text-on-surface-variant font-medium">Chargement de la galerie...</p>
        </div>
      </main>
    }>
      <CommunityContent />
    </Suspense>
  );
}
