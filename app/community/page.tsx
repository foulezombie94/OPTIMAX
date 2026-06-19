'use client';

import { useState, useEffect, Suspense, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { PublicOptimization } from '@/components/community/types';
import { CommunityHeader } from '@/components/community/CommunityHeader';
import { CommunityToolbar, SortOptions } from '@/components/community/CommunityToolbar';
import { CommunityGrid } from '@/components/community/CommunityGrid';
import { CommunityModal } from '@/components/community/CommunityModal';

function CommunityContent() {
  const [items, setItems] = useState<PublicOptimization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOptions>('popularity');
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
      if (typeof window !== 'undefined') {
        savedLikes = JSON.parse(localStorage.getItem('optimax_liked_items') || '[]');
        savedViews = JSON.parse(localStorage.getItem('optimax_viewed_items') || '[]');
      }
      setLikedItems(savedLikes);
      setViewedItems(savedViews);
    } catch (e) {
      console.error('Failed to load storage details from localStorage', e);
    }
    
    async function fetchShowcase() {
      try {
        const { data, error } = await supabase
          .from('public_optimizations_popularity')
          .select('*')
          .or('file_type.ilike.model/%,file_name.ilike.%.obj,file_name.ilike.%.fbx,file_name.ilike.%.stl,file_name.ilike.%.glb,file_name.ilike.%.gltf,file_name.ilike.%.ply,file_name.ilike.%.dae')
          .limit(100);
        
        if (error) throw error;
        
        const public3DOnly = (data || []).map((item: PublicOptimization) => ({
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
      if (navigator.share) {
        try {
          await navigator.share({
            title: `OptiMax - ${item.file_name}`,
            text: `Découvrez ce modèle 3D optimisé sur OptiMax !`,
            url: shareUrl,
          });
          setToastMessage('Lien partagé avec succès !');
        } catch (shareError: any) {
          if (shareError.name === 'AbortError') {
            return; // User cancelled share
          }
          // Fallback to clipboard on other share errors
          await navigator.clipboard.writeText(shareUrl);
          setToastMessage('Lien copié dans le presse-papiers !');
        }
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setToastMessage('Lien copié dans le presse-papiers !');
      }
      
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

  return (
    <main className="flex-grow pt-[110px] pb-28 px-4 sm:px-6 md:px-12 relative w-full flex-1 z-10 bg-gradient-to-b from-[#0d0d10] via-[#131318] to-[#0d0d10] overflow-x-hidden">
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
        <CommunityHeader />
        
        <CommunityToolbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          sortBy={sortBy}
          setSortBy={setSortBy}
        />
        
        <CommunityGrid
          loading={loading}
          filteredItems={filteredItems}
          visibleLimit={visibleLimit}
          setVisibleLimit={setVisibleLimit}
          likedItems={likedItems}
          onOpen={handleOpenItem}
          onLike={handleLikeItem}
          onShare={handleShareItem}
        />
        
        <CommunityModal
          item={selectedItem}
          isClosing={isClosing}
          onClose={handleCloseModal}
          likedItems={likedItems}
          onLike={handleLikeItem}
          onShare={handleShareItem}
        />
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
