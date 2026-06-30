'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { searchUsers, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, getPendingRequests } from '@/app/actions/friends';
import { useRouter } from 'next/navigation';

export default function AddFriendsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true);
        const results = await searchUsers(searchQuery);
        setSearchResults(results);
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load incoming requests
  useEffect(() => {
    const loadRequests = async () => {
      setIsLoadingRequests(true);
      const reqs = await getPendingRequests();
      setPendingRequests(reqs);
      setIsLoadingRequests(false);
    };
    loadRequests();
  }, []);

  const handleAddFriend = async (userId: string) => {
    setSearchResults(prev => prev.map(u => u.id === userId ? { ...u, relationship: 'request_sent' } : u));
    await sendFriendRequest(userId);
  };

  const handleAccept = async (requestId: string) => {
    setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    await acceptFriendRequest(requestId);
    router.refresh(); // To update layout contact list if necessary
  };

  const handleReject = async (requestId: string) => {
    setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    await rejectFriendRequest(requestId);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'from-blue-500 to-indigo-500 text-white',
      'from-emerald-500 to-teal-500 text-white',
      'from-purple-500 to-indigo-500 text-white',
      'from-amber-500 to-orange-500 text-white',
      'from-pink-500 to-rose-500 text-white',
      'from-sky-500 to-blue-500 text-white',
      'from-indigo-500 to-violet-500 text-white'
    ];
    if (!name) return colors[0];
    let sum = 0;
    for (let i = 0; i < name.length; i++) {
      sum += name.charCodeAt(i);
    }
    return colors[sum % colors.length];
  };

  const getInitials = (name: string) => {
    return name ? name.trim().charAt(0).toUpperCase() : 'U';
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-black/40 overflow-y-auto scrollbar-none relative">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-2xl w-full mx-auto p-6 md:p-10 relative z-10 space-y-10">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">Ajouter des amis</h1>
          <p className="text-[#8e8e93] text-[15px]">Trouvez des collaborateurs via leur nom d&apos;utilisateur.</p>
        </div>

        {/* Global Search Bar */}
        <div className="relative z-20">
          <div className="relative flex items-center bg-white/5 border border-white/10 focus-within:border-white/30 focus-within:bg-white/10 rounded-2xl px-4 py-3.5 transition-all shadow-lg">
            <span className="material-symbols-outlined text-[#8e8e93] text-[24px] mr-3">search</span>
            <input
              type="text"
              placeholder="Rechercher avec le nom d'utilisateur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-white placeholder:text-[#8e8e93] text-[16px] font-medium"
            />
            {isSearching && (
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin ml-3"></div>
            )}
          </div>

          {/* Search Results */}
          {searchQuery.length >= 2 && !isSearching && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 bg-[#141419]/90 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl"
            >
              {searchResults.length === 0 ? (
                <div className="p-6 text-center text-[#8e8e93] text-[14px]">
                  Aucun utilisateur trouvé pour "{searchQuery}".
                </div>
              ) : (
                <div className="flex flex-col">
                  {searchResults.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-black shrink-0 relative">
                          {user.avatar_url ? (
                            <Image src={user.avatar_url} alt={user.display_name} fill sizes="48px" className="object-cover" />
                          ) : (
                            <div className={`w-full h-full bg-gradient-to-tr ${getAvatarColor(user.display_name)} flex items-center justify-center font-bold text-[18px]`}>
                              {getInitials(user.display_name)}
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="text-white font-bold text-[16px] leading-tight">{user.display_name}</h4>
                          <p className="text-[#8e8e93] text-[13px]">@{user.username}</p>
                        </div>
                      </div>
                      
                      {user.relationship === 'none' && (
                        <button 
                          onClick={() => handleAddFriend(user.id)}
                          className="px-4 py-2 bg-white text-black hover:bg-slate-200 rounded-xl text-[14px] font-bold transition-all shadow-sm flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[18px]">person_add</span>
                          Ajouter
                        </button>
                      )}
                      {user.relationship === 'request_sent' && (
                        <button disabled className="px-4 py-2 bg-white/10 text-[#8e8e93] rounded-xl text-[14px] font-bold flex items-center gap-2 cursor-not-allowed border border-white/5">
                          <span className="material-symbols-outlined text-[18px]">done</span>
                          Envoyé
                        </button>
                      )}
                      {user.relationship === 'friends' && (
                        <button disabled className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-[14px] font-bold flex items-center gap-2 cursor-not-allowed border border-emerald-500/20">
                          <span className="material-symbols-outlined text-[18px]">group</span>
                          Amis
                        </button>
                      )}
                      {user.relationship === 'request_received' && (
                        <div className="text-[12px] font-bold text-amber-400 border border-amber-400/30 px-3 py-1.5 rounded-lg bg-amber-400/10">
                          Demande reçue
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Incoming Requests Section (Snapchat "Ajouts Récents" style) */}
        {!searchQuery && (
          <div className="pt-6 relative z-10">
            <h3 className="text-white font-bold text-[18px] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400" style={{ fontVariationSettings: "'FILL' 1" }}>person_add</span>
              Ajouts récents
              {pendingRequests.length > 0 && (
                <span className="bg-amber-500 text-black text-[11px] px-2 py-0.5 rounded-full font-black ml-2">
                  {pendingRequests.length}
                </span>
              )}
            </h3>

            {isLoadingRequests ? (
              <div className="flex flex-col gap-3">
                {[1,2].map(i => (
                  <div key={i} className="h-[72px] w-full bg-white/5 rounded-2xl animate-pulse border border-white/5"></div>
                ))}
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="p-8 text-center text-[#8e8e93] bg-white/5 border border-white/5 rounded-2xl">
                <span className="material-symbols-outlined text-[36px] mb-3 opacity-50">mood</span>
                <p className="text-sm font-medium">Vous n'avez pas de nouvelle demande d'ami.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((req) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={req.id} 
                    className="flex items-center justify-between p-4 bg-[#1a1a1c] border border-white/10 rounded-2xl shadow-lg hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full overflow-hidden bg-black shrink-0 relative border-2 border-transparent group-hover:border-white/10 transition-colors">
                        {req.sender.avatar_url ? (
                          <Image src={req.sender.avatar_url} alt={req.sender.display_name} fill sizes="56px" className="object-cover" />
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-tr ${getAvatarColor(req.sender.display_name)} flex items-center justify-center font-bold text-[20px]`}>
                            {getInitials(req.sender.display_name)}
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-[17px] leading-tight">{req.sender.display_name}</h4>
                        <p className="text-[#8e8e93] text-[14px]">@{req.sender.username}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleAccept(req.id)}
                        className="w-10 h-10 md:w-auto md:px-5 md:py-2.5 bg-primary hover:bg-primary/90 text-black rounded-xl text-[14px] font-bold transition-all shadow-[0_0_20px_rgba(77,142,255,0.3)] hover:shadow-[0_0_25px_rgba(77,142,255,0.5)] flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[20px] md:text-[18px]">check</span>
                        <span className="hidden md:block">Accepter</span>
                      </button>
                      <button 
                        onClick={() => handleReject(req.id)}
                        className="w-10 h-10 rounded-xl bg-white/5 hover:bg-[#ff3b30]/10 text-[#8e8e93] hover:text-[#ff3b30] border border-white/10 flex items-center justify-center transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
