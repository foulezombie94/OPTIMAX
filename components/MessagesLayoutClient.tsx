'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

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

export default function MessagesLayoutClient({
  dbPartners,
  children,
}: {
  dbPartners: Partner[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');

  // Selected chat ID
  const currentChatId = pathname?.split('/').pop() || '';
  const isChatOpen = pathname !== '/messages' && currentChatId !== '';

  const partnerList = dbPartners.map(p => ({
    ...p,
    avatarUrl: p.avatarUrl || undefined,
    latestMessageSnippet: p.latestMessageSnippet || 'Click to open conversation',
    latestMessageAt: typeof p.latestMessageAt === 'number' 
      ? new Date(p.latestMessageAt).toLocaleDateString()
      : p.latestMessageAt || 'Active',
    isOnline: p.isOnline !== undefined ? p.isOnline : true,
  }));

  const filteredPartners = partnerList.filter(p =>
    p.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <div className="p-4 pb-2">
              <div className="relative flex items-center bg-[#262628] rounded-full px-4 py-2 transition-colors">
                <span className="material-symbols-outlined text-[#8e8e93] text-[20px] mr-2 select-none">search</span>
                <input
                  type="text"
                  placeholder="Rechercher"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-white placeholder:text-[#8e8e93] text-[15px] font-medium"
                />
              </div>
            </div>

            {/* Active section */}
            <div className="pt-2 pb-4 border-b border-white/10">
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
                        <div className="relative w-[68px] h-[68px] rounded-full p-[2.5px] bg-gradient-to-tr from-[#bc2a8d] to-[#e95950]">
                          <div className="w-full h-full rounded-full bg-black p-[2.5px]">
                            {partner.avatarUrl ? (
                              <img
                                src={partner.avatarUrl}
                                alt={partner.displayName}
                                className={`w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform ${
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
            <div className="flex-grow overflow-y-auto scrollbar-none">
              {filteredPartners.length === 0 ? (
                <div className="p-8 text-center text-[#8e8e93] flex flex-col items-center justify-center h-48">
                  <span className="material-symbols-outlined text-[36px] mb-3 opacity-50">chat_bubble</span>
                  <p className="text-sm">Aucune conversation trouvée</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {filteredPartners.map((partner) => {
                    const isSelected = currentChatId === partner.id;
                    const isThisPartnerCalling = activeCallStatus !== 'idle' && activeCallPartnerId === partner.id;

                    return (
                      <Link
                        key={partner.id}
                        href={`/messages/${partner.id}`}
                        className={`px-4 py-2 flex items-center transition-all cursor-pointer border-b border-white/[0.05] ${
                          isSelected ? 'bg-white/5' : 'hover:bg-white/5'
                        }`}
                      >
                        {/* Avatar */}
                        <div className="relative w-[50px] h-[50px] shrink-0">
                          {partner.avatarUrl ? (
                            <img
                              src={partner.avatarUrl}
                              alt={partner.displayName}
                              className={`w-full h-full rounded-full object-cover ${
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
                          {partner.isOnline && !isThisPartnerCalling && (
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-black"></div>
                          )}
                        </div>
                        
                        {/* Texts */}
                        <div className="flex-grow min-w-0 ml-3">
                          <div className="flex items-center mb-0.5">
                            <h4 className={`text-[17px] font-semibold truncate pr-2 ${isSelected ? 'text-white' : 'text-[#f2f2f2]'}`}>
                              {partner.displayName}
                            </h4>
                          </div>
                          <div className="flex items-center text-[13px] text-[#8e8e93] font-medium">
                            <span className="material-symbols-outlined text-[14px] text-[#9b59b6] mr-1.5" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                            <span className="truncate max-w-[120px] lg:max-w-[160px]">{partner.latestMessageSnippet}</span>
                            <span className="mx-1.5">•</span>
                            <span className="shrink-0">{partner.latestMessageAt}</span>
                          </div>
                        </div>

                        {/* Right side actions */}
                        <div className="shrink-0 flex items-center ml-2 border-l border-white/10 pl-3 h-8">
                          {isThisPartnerCalling ? (
                            <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-primary text-black shadow-[0_0_15px_rgba(77,142,255,0.5)] animate-pulse">
                              <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping"></span>
                              <span className="material-symbols-outlined text-[16px] font-bold">call</span>
                            </div>
                          ) : (
                            <span className="material-symbols-outlined text-[24px] text-[#8e8e93] hover:text-white transition-colors cursor-pointer" style={{ fontVariationSettings: "'wght' 300" }}>photo_camera</span>
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
    </div>
  );
}
