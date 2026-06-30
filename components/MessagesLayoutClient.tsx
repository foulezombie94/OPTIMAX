'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

type Partner = {
  id: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
  latestMessageSnippet?: string;
  latestMessageAt?: string | number;
  isOnline?: boolean;
  isPro?: boolean;
  verified?: boolean;
  isUnread?: boolean;
  lastSenderId?: string;
  isOpenedByPartner?: boolean;
};

const getInitials = (name: string) => {
  return name ? name.trim().charAt(0).toUpperCase() : 'U';
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

const getRelativeSnapTime = (dateInput: string | number | undefined) => {
  if (!dateInput) return 'À l\'instant';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'À l\'instant';
  
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 15) return 'À l\'instant';
  if (diffInSeconds < 60) return `il y a ${Math.floor(diffInSeconds / 15) * 15} s`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `il y a ${diffInMinutes} min`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `il y a ${diffInHours} h`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'Hier';
  if (diffInDays < 7) return `il y a ${diffInDays} j`;
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInDays < 30) return `il y a ${diffInWeeks} sem`;
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInDays < 365) return `il y a ${diffInMonths} mois`;
  
  const diffInYears = Math.floor(diffInDays / 365);
  return `il y a ${diffInYears} an${diffInYears > 1 ? 's' : ''}`;
};

const getSnapStatus = (partner: any, isLocallyUnread: boolean, currentUserId: string) => {
  const isUnread = isLocallyUnread || partner.isUnread;

  if (partner.lastSenderId === partner.id) {
    if (isUnread) {
      return {
        text: 'Nouveau message',
        textColor: 'text-[#bc2a8d] font-bold tracking-tight',
        icon: <div className="w-[12px] h-[12px] rounded-[2px] bg-[#bc2a8d] mr-2 shrink-0"></div>
      };
    } else {
      return {
        text: 'Reçu',
        textColor: 'text-[#8e8e93]',
        icon: <div className="w-[12px] h-[12px] rounded-[2px] border-[2px] border-[#eb5252] mr-2 shrink-0"></div>
      };
    }
  } else if (partner.lastSenderId === currentUserId) {
    if (partner.isOpenedByPartner) {
      return {
        text: 'Vu',
        textColor: 'text-[#8e8e93]',
        icon: <span className="material-symbols-outlined text-[14px] text-[#bc2a8d] mr-1.5" style={{ fontVariationSettings: "'FILL' 0" }}>play_arrow</span>
      };
    } else {
      return {
        text: 'Remis',
        textColor: 'text-[#8e8e93]',
        icon: <span className="material-symbols-outlined text-[14px] text-[#007aff] mr-1.5" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
      };
    }
  }

  return {
    text: 'Nouvelle discussion',
    textColor: 'text-[#8e8e93]',
    icon: <div className="w-[12px] h-[12px] rounded-[2px] border-[2px] border-[#8e8e93] mr-2 shrink-0"></div>
  };
};

export default function MessagesLayoutClient({
  dbPartners,
  currentUserId,
  children,
}: {
  dbPartners: Partner[];
  currentUserId: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [searchQuery, setSearchQuery] = useState('');

  // Selected chat ID
  const currentChatId = pathname?.split('/').pop() || '';
  const isChatOpen = pathname !== '/messages' && currentChatId !== '';

  const [pinnedChats, setPinnedChats] = useState<Set<string>>(new Set());
  const [unreadChats, setUnreadChats] = useState<Set<string>>(new Set());
  const [hiddenChats, setHiddenChats] = useState<Set<string>>(new Set());

  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    partner: (Partner & { avatarUrl?: string; latestMessageSnippet: string; latestMessageAt: string; isOnline: boolean; isPinned: boolean; isUnread: boolean }) | null;
  }>({ visible: false, x: 0, y: 0, partner: null });

  const closeContextMenu = () => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const partnerList = useMemo(() => {
    return dbPartners
      .filter(p => !hiddenChats.has(p.id))
      .map(p => ({
        ...p,
        avatarUrl: p.avatarUrl || undefined,
        latestMessageSnippet: p.latestMessageSnippet || 'Click to open conversation',
        latestMessageAt: getRelativeSnapTime(p.latestMessageAt),
        isOnline: p.isOnline !== undefined ? p.isOnline : true,
        isPinned: pinnedChats.has(p.id),
        isUnread: unreadChats.has(p.id) || (p.isUnread ?? false),
        lastSenderId: p.lastSenderId,
        isOpenedByPartner: p.isOpenedByPartner ?? false,
      }))
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
      });
  }, [dbPartners, hiddenChats, pinnedChats, unreadChats]);

  const filteredPartners = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase();
    return partnerList.filter(p =>
      p.displayName.toLowerCase().includes(lowerQuery) ||
      p.username.toLowerCase().includes(lowerQuery)
    );
  }, [partnerList, searchQuery]);

  // Global call status tracking
  const [activeCallStatus, setActiveCallStatus] = useState<'idle' | 'calling' | 'calling-incoming' | 'connected'>('idle');
  const [activeCallPartnerId, setActiveCallPartnerId] = useState<string | null>(null);

  useEffect(() => {
    const handleStatusChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      setActiveCallStatus(customEvent.detail.callStatus);
      setActiveCallPartnerId(customEvent.detail.partnerId);
    };

    window.addEventListener('global-call-status-changed', handleStatusChange);
    
    // Query global call status in case it was already active when mounted
    window.dispatchEvent(new CustomEvent('request-global-call-status'));

    return () => {
      window.removeEventListener('global-call-status-changed', handleStatusChange);
    };
  }, []);

  // Realtime updates for messages (to get "en direct" status changes)
  useEffect(() => {
    const channel = supabase.channel(`messages_layout_${currentUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${currentUserId}` }, () => {
        router.refresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `sender_id=eq.${currentUserId}` }, () => {
        router.refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, currentUserId, router]);

  return (
    <div className="flex-grow pt-[80px] pb-0 flex overflow-hidden bg-background font-sans relative">
      {/* Abstract Background for PC */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 hidden md:block">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-tertiary/5 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>
      <div className="absolute inset-0 tech-grid opacity-10 pointer-events-none mix-blend-overlay z-0 hidden md:block"></div>

      <div className="max-w-[1400px] mx-auto w-full flex h-[calc(100vh-80px)] z-10 md:p-6 md:pb-0">
        <div className="w-full flex bg-black md:backdrop-blur-xl md:rounded-t-3xl md:border md:border-b-0 border-white/10 overflow-hidden md:shadow-[0_0_40px_rgba(0,0,0,0.5)]">
          
          {/* Sidebar Panel */}
          <div className={`w-full md:w-80 lg:w-[380px] border-r border-white/10 flex flex-col bg-black shrink-0 ${
            isChatOpen ? 'hidden md:flex' : 'flex'
          }`}>
            
            {/* Search Bar */}
            <div className="px-4 py-3 flex items-center gap-2">
              <div className="relative flex items-center bg-white/5 hover:bg-white/10 border border-white/5 focus-within:border-white/20 rounded-xl px-3 py-2 transition-all flex-grow">
                <span className="material-symbols-outlined text-[#8e8e93] text-[20px] mr-2 select-none">search</span>
                <input
                  type="text"
                  placeholder="Rechercher un contact..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-white placeholder:text-[#8e8e93] text-[14px] font-medium"
                />
              </div>
              <Link href="/messages/friends" className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 hover:border-white/20 border border-white/5 flex items-center justify-center transition-all shrink-0 group relative">
                 <span className="material-symbols-outlined text-white/70 group-hover:text-white" style={{ fontVariationSettings: "'wght' 300" }}>person_add</span>
              </Link>
            </div>

            {/* Active section */}
            <div className="pb-3 mb-2 border-b border-white/5">
              <div className="flex items-center gap-4 overflow-x-auto px-4 pb-2 scrollbar-none">
                {partnerList
                  .filter(p => p.isOnline)
                  .map((partner) => {
                    const isThisPartnerCalling = activeCallStatus !== 'idle' && activeCallPartnerId === partner.id;
                    
                    return (
                      <Link
                        key={`active-${partner.id}`}
                        href={`/messages/${partner.id}`}
                        className="flex flex-col items-center shrink-0 group relative cursor-pointer"
                      >
                        <div className="relative w-[68px] h-[68px] rounded-full p-[2.5px] bg-[#333333]">
                          <div className="w-full h-full rounded-full bg-black p-[2.5px] relative">
                            {partner.avatarUrl ? (
                              <Image
                                src={partner.avatarUrl}
                                alt={partner.displayName}
                                fill
                                sizes="68px"
                                className={`rounded-full object-cover group-hover:scale-105 transition-transform ${
                                  isThisPartnerCalling ? 'animate-pulse' : ''
                                }`}
                              />
                            ) : (
                              <div className={`w-full h-full rounded-full bg-gradient-to-tr ${getAvatarColor(partner.displayName)} flex items-center justify-center font-bold text-[20px] group-hover:scale-105 transition-transform select-none ${
                                isThisPartnerCalling ? 'animate-pulse' : ''
                              }`}>
                                {getInitials(partner.displayName)}
                              </div>
                            )}
                            
                            {/* Overlay refresh icon */}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-full z-10 pointer-events-none">
                              <span className="material-symbols-outlined text-white text-[22px] font-bold opacity-80" style={{ fontVariationSettings: "'wght' 600" }}>sync</span>
                            </div>
                            {/* Lock icon */}
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-black rounded-full flex items-center justify-center z-20">
                              <span className="material-symbols-outlined text-white text-[10px] font-bold">lock</span>
                            </div>
                          </div>
                          
                          {/* Concentric call wave rings */}
                          {isThisPartnerCalling && (
                            <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping"></div>
                          )}
                        </div>
                        <span className="text-[12px] font-bold text-[#f2f2f2] mt-1.5 truncate w-16 text-center">
                          {partner.displayName.split(' ')[0]}
                        </span>
                      </Link>
                    );
                  })}
              </div>
            </div>



            {/* Contact List */}
            <div className="flex-grow overflow-y-auto scrollbar-none px-2 space-y-0.5">
              {filteredPartners.length === 0 ? (
                <div className="p-8 text-center text-[#8e8e93] flex flex-col items-center justify-center h-48">
                  <span className="material-symbols-outlined text-[36px] mb-3 opacity-50">chat_bubble</span>
                  <p className="text-sm">Aucune conversation trouvée</p>
                </div>
              ) : (
                <div className="flex flex-col space-y-1">
                  {filteredPartners.map((partner) => {
                    const isSelected = currentChatId === partner.id;
                    const isThisPartnerCalling = activeCallStatus !== 'idle' && activeCallPartnerId === partner.id;

                    return (
                      <Link
                        key={partner.id}
                        href={`/messages/${partner.id}`}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({
                            visible: true,
                            x: e.clientX,
                            y: e.clientY,
                            partner
                          });
                        }}
                        className={`px-3 py-3 flex items-center transition-all cursor-pointer rounded-xl ${
                          isSelected ? 'bg-white/10' : 'hover:bg-white/5'
                        }`}
                      >
                        {/* Avatar */}
                        <div className="relative w-[52px] h-[52px] shrink-0">
                          {partner.avatarUrl ? (
                            <Image
                              src={partner.avatarUrl}
                              alt={partner.displayName}
                              fill
                              sizes="52px"
                              className={`rounded-full object-cover ${
                                isThisPartnerCalling ? 'animate-pulse' : ''
                              }`}
                            />
                          ) : (
                            <div className={`w-full h-full rounded-full bg-gradient-to-tr ${getAvatarColor(partner.displayName)} flex items-center justify-center font-bold text-[18px] select-none ${
                              isThisPartnerCalling ? 'animate-pulse' : ''
                            }`}>
                              {getInitials(partner.displayName)}
                            </div>
                          )}
                          {isThisPartnerCalling && (
                            <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping"></div>
                          )}
                          {/* Pin Icon */}
                          {partner.isPinned && (
                            <div className="absolute -bottom-1 -right-1 bg-black rounded-full p-0.5 z-10 flex items-center justify-center">
                              <span className="material-symbols-outlined text-white text-[12px] opacity-80" style={{ transform: 'rotate(45deg)' }}>push_pin</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Texts */}
                        <div className="flex-grow min-w-0 ml-4">
                          <div className="flex items-center mb-0.5">
                            <h4 className={`text-[17px] font-bold truncate pr-2 tracking-tight ${isSelected ? 'text-white' : 'text-[#f2f2f2]'}`}>
                              {partner.displayName}
                            </h4>
                          </div>
                          <div className="flex items-center text-[13px] font-medium mt-[1px]">
                            {(() => {
                              const status = getSnapStatus(partner, partner.isUnread, currentUserId);
                              return (
                                <>
                                  {status.icon}
                                  <span className={`truncate max-w-[140px] ${status.textColor}`}>{status.text}</span>
                                </>
                              );
                            })()}
                            <span className="mx-1 text-[#8e8e93]">&bull;</span>
                            <span className="shrink-0 text-[#8e8e93]" suppressHydrationWarning>
                              {partner.latestMessageAt}
                            </span>
                          </div>
                        </div>

                        {/* Right side actions */}
                        <div className="shrink-0 flex flex-col items-center justify-center ml-2 border-l border-white/5 pl-4 w-[60px] h-full">
                          {isThisPartnerCalling ? (
                            <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-primary text-black shadow-[0_0_15px_rgba(77,142,255,0.5)] animate-pulse">
                              <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping"></span>
                              <span className="material-symbols-outlined text-[16px] font-bold">call</span>
                            </div>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-[24px] text-white/70 hover:text-white transition-colors mb-0.5" style={{ fontVariationSettings: "'wght' 300" }}>photo_camera</span>
                              <span className="text-[10px] font-bold text-white tracking-wide">Répondre</span>
                            </>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Main Conversation Panel */}
          <div className={`flex-1 flex flex-col relative bg-transparent ${
            isChatOpen ? 'flex' : 'hidden md:flex'
          }`}>
            {children}
          </div>

        </div>
      </div>

      {/* Custom Context Menu */}
      {contextMenu.visible && contextMenu.partner && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={closeContextMenu} onContextMenu={(e) => { e.preventDefault(); closeContextMenu(); }}></div>
          <div 
            className="fixed z-[101] bg-[#1a1a1c] border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] py-2 w-64 overflow-hidden backdrop-blur-xl"
            style={{ 
              top: Math.min(contextMenu.y, typeof window !== 'undefined' ? window.innerHeight - 350 : 0), 
              left: Math.min(contextMenu.x, typeof window !== 'undefined' ? window.innerWidth - 260 : 0) 
            }}
          >
            <div className="px-4 py-3 border-b border-white/5 mb-1 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-black shrink-0 relative">
                {contextMenu.partner.avatarUrl ? (
                  <Image src={contextMenu.partner.avatarUrl} alt={contextMenu.partner.displayName} fill sizes="40px" className="object-cover" />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-tr ${getAvatarColor(contextMenu.partner.displayName)} flex items-center justify-center font-bold text-[14px]`}>
                    {getInitials(contextMenu.partner.displayName)}
                  </div>
                )}
              </div>
              <div className="font-bold text-white text-[15px] truncate">{contextMenu.partner.displayName}</div>
            </div>
            
            <button className="w-full px-4 py-2.5 text-left flex items-center text-white hover:bg-white/5 transition-colors group" onClick={() => {
              closeContextMenu();
              router.push(`/messages/${contextMenu.partner!.id}`);
            }}>
              <span className="material-symbols-outlined text-[20px] mr-3 text-[#8e8e93] group-hover:text-white" style={{ fontVariationSettings: "'wght' 300" }}>photo_camera</span>
              <span className="font-semibold text-[14px]">Photo</span>
            </button>
            <button className="w-full px-4 py-2.5 text-left flex items-center text-white hover:bg-white/5 transition-colors group" onClick={() => { closeContextMenu(); router.push(`/messages/${contextMenu.partner!.id}`); }}>
              <span className="material-symbols-outlined text-[20px] mr-3 text-[#8e8e93] group-hover:text-white" style={{ fontVariationSettings: "'wght' 300" }}>chat_bubble</span>
              <span className="font-semibold text-[14px]">Chat</span>
            </button>
            <button className="w-full px-4 py-2.5 text-left flex items-center text-white hover:bg-white/5 transition-colors group" onClick={() => {
              closeContextMenu();
              window.dispatchEvent(new CustomEvent('start-global-call', {
                detail: {
                  partnerId: contextMenu.partner!.id,
                  partnerName: contextMenu.partner!.displayName,
                  partnerUsername: contextMenu.partner!.username,
                  partnerAvatarUrl: contextMenu.partner!.avatarUrl,
                  type: 'audio'
                }
              }));
            }}>
              <span className="material-symbols-outlined text-[20px] mr-3 text-[#8e8e93] group-hover:text-white" style={{ fontVariationSettings: "'wght' 300" }}>call</span>
              <span className="font-semibold text-[14px]">Appel vocal</span>
            </button>
            <button className="w-full px-4 py-2.5 text-left flex items-center text-white hover:bg-white/5 transition-colors group" onClick={() => {
              closeContextMenu();
              window.dispatchEvent(new CustomEvent('start-global-call', {
                detail: {
                  partnerId: contextMenu.partner!.id,
                  partnerName: contextMenu.partner!.displayName,
                  partnerUsername: contextMenu.partner!.username,
                  partnerAvatarUrl: contextMenu.partner!.avatarUrl,
                  type: 'video'
                }
              }));
            }}>
              <span className="material-symbols-outlined text-[20px] mr-3 text-[#8e8e93] group-hover:text-white" style={{ fontVariationSettings: "'wght' 300" }}>videocam</span>
              <span className="font-semibold text-[14px]">Appel vidéo</span>
            </button>

            <div className="h-[1px] bg-white/5 my-1 mx-2"></div>

            <button className="w-full px-4 py-2.5 text-left flex items-center text-white hover:bg-white/5 transition-colors group" onClick={() => {
              setPinnedChats(prev => {
                const next = new Set(prev);
                if (next.has(contextMenu.partner!.id)) next.delete(contextMenu.partner!.id);
                else next.add(contextMenu.partner!.id);
                return next;
              });
              closeContextMenu();
            }}>
              <span className="material-symbols-outlined text-[20px] mr-3 text-[#8e8e93] group-hover:text-white" style={{ transform: 'rotate(45deg)', fontVariationSettings: "'wght' 300" }}>push_pin</span>
              <span className="font-semibold text-[14px]">{contextMenu.partner.isPinned ? 'Désépingler' : 'Épingler la conversation'}</span>
            </button>

            <button className="w-full px-4 py-2.5 text-left flex items-center text-white hover:bg-white/5 transition-colors group" onClick={async () => {
              const partnerId = contextMenu.partner!.id;
              const isCurrentlyUnread = contextMenu.partner!.isUnread;
              
              if (isCurrentlyUnread) {
                // Mark as read: set is_read = true on all messages from this partner to me
                await supabase
                  .from('messages')
                  .update({ is_read: true, read_at: new Date().toISOString() })
                  .eq('sender_id', partnerId)
                  .eq('receiver_id', currentUserId)
                  .eq('is_read', false);
                setUnreadChats(prev => {
                  const next = new Set(prev);
                  next.delete(partnerId);
                  return next;
                });
              } else {
                // Mark as unread: set is_read = false on the latest message from this partner
                const { data: latestMsgs } = await supabase
                  .from('messages')
                  .select('id')
                  .eq('sender_id', partnerId)
                  .eq('receiver_id', currentUserId)
                  .order('created_at', { ascending: false })
                  .limit(1);
                if (latestMsgs && latestMsgs.length > 0) {
                  await supabase
                    .from('messages')
                    .update({ is_read: false, read_at: null })
                    .eq('id', latestMsgs[0].id);
                }
                setUnreadChats(prev => {
                  const next = new Set(prev);
                  next.add(partnerId);
                  return next;
                });
              }
              closeContextMenu();
              router.refresh();
            }}>
              <span className="material-symbols-outlined text-[20px] mr-3 text-[#8e8e93] group-hover:text-white" style={{ fontVariationSettings: "'wght' 300" }}>mark_chat_unread</span>
              <span className="font-semibold text-[14px]">{contextMenu.partner.isUnread ? 'Marquer comme lu' : 'Marquer comme non lu'}</span>
            </button>

            <div className="h-[1px] bg-white/5 my-1 mx-2"></div>

            <button className="w-full px-4 py-2.5 text-left flex items-center text-[#ff3b30] hover:bg-[#ff3b30]/10 transition-colors group" onClick={async () => {
              const partnerId = contextMenu.partner!.id;
              // Delete all messages between me and this partner
              await supabase
                .from('messages')
                .delete()
                .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${currentUserId})`);
              setHiddenChats(prev => {
                const next = new Set(prev);
                next.add(partnerId);
                return next;
              });
              closeContextMenu();
              router.refresh();
            }}>
              <span className="material-symbols-outlined text-[20px] mr-3" style={{ fontVariationSettings: "'wght' 300" }}>delete</span>
              <span className="font-semibold text-[14px]">Effacer de la liste</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
