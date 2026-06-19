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
        <div className="w-full flex bg-[#0a0a0c]/80 md:backdrop-blur-xl md:rounded-t-3xl md:border md:border-b-0 border-white/10 overflow-hidden md:shadow-[0_0_40px_rgba(0,0,0,0.5)]">
          
          {/* Sidebar Panel */}
          <div className={`w-full md:w-80 lg:w-[380px] border-r border-white/10 flex flex-col bg-surface/30 shrink-0 ${
            isChatOpen ? 'hidden md:flex' : 'flex'
          }`}>
            
            {/* Search Bar */}
            <div className="p-5 pb-3">
              <div className="relative flex items-center bg-black/40 border border-white/10 rounded-xl px-4 py-3 transition-colors focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 shadow-inner">
                <span className="material-symbols-outlined text-on-surface-variant text-[20px] mr-3 select-none">search</span>
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant/50 text-[14px]"
                />
              </div>
            </div>

            {/* Active section */}
            <div className="px-5 py-3 border-b border-white/5">
              <h3 className="text-[13px] font-bold text-on-surface-variant uppercase tracking-wider mb-4">Active Now</h3>
              <div className="flex items-center gap-5 overflow-x-auto pb-2 scrollbar-none">
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
                        <div className="relative w-14 h-14">
                          {partner.avatarUrl ? (
                            <img
                              src={partner.avatarUrl}
                              alt={partner.displayName}
                              className={`w-14 h-14 rounded-full object-cover border-[2px] group-hover:scale-105 transition-transform ${
                                isThisPartnerCalling ? 'border-primary scale-105 animate-pulse' : 'border-white/10'
                              }`}
                            />
                          ) : (
                            <div className={`w-14 h-14 rounded-full bg-gradient-to-tr ${getAvatarColor(partner.displayName)} flex items-center justify-center font-bold text-[18px] border-[2px] group-hover:scale-105 transition-transform select-none ${
                              isThisPartnerCalling ? 'border-primary scale-105 animate-pulse' : 'border-white/10'
                            }`}>
                              {getInitials(partner.displayName)}
                            </div>
                          )}
                          
                          {/* Concentric call wave rings */}
                          {isThisPartnerCalling && (
                            <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping"></div>
                          )}

                          {partner.verified && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-[#0a0a0c] z-10">
                              <span className="material-symbols-outlined text-background text-[10px] font-bold">check</span>
                            </div>
                          )}
                          {!partner.verified && !isThisPartnerCalling && (
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#0a0a0c] z-10 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                          )}
                        </div>
                        <span className="text-[11px] font-medium text-on-surface-variant mt-2 truncate w-14 text-center group-hover:text-on-surface transition-colors">
                          {partner.displayName.split(' ')[0]}
                        </span>
                      </Link>
                    );
                  })}
              </div>
            </div>

            {/* Messages Header */}
            <div className="px-5 pt-5 pb-3 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <h3 className="text-[16px] font-bold text-on-surface">Recent</h3>
                <span className="bg-primary/20 text-primary border border-primary/30 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {partnerList.length}
                </span>
              </div>
              <button className="w-9 h-9 border border-white/10 bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-on-surface rounded-xl flex items-center justify-center transition-colors shadow-sm cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">edit_square</span>
              </button>
            </div>

            {/* Contact List */}
            <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {filteredPartners.length === 0 ? (
                <div className="p-8 text-center text-on-surface-variant flex flex-col items-center justify-center h-48">
                  <span className="material-symbols-outlined text-[36px] mb-3 text-on-surface-variant/50">chat_bubble</span>
                  <p className="text-sm">No conversations found</p>
                </div>
              ) : (
                <div className="flex flex-col p-2 space-y-1">
                  {filteredPartners.map((partner) => {
                    const isSelected = currentChatId === partner.id;
                    const isThisPartnerCalling = activeCallStatus !== 'idle' && activeCallPartnerId === partner.id;

                    return (
                      <Link
                        key={partner.id}
                        href={`/messages/${partner.id}`}
                        className={`p-3 rounded-2xl flex items-center gap-4 transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-primary/10 border border-primary/20 shadow-[inset_0_0_20px_rgba(77,142,255,0.05)]' 
                            : 'hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <div className="relative w-12 h-12 shrink-0">
                          {partner.avatarUrl ? (
                            <img
                              src={partner.avatarUrl}
                              alt={partner.displayName}
                              className={`w-12 h-12 rounded-full object-cover border-[2px] ${
                                isThisPartnerCalling ? 'border-primary animate-pulse' : (isSelected ? 'border-primary/50' : 'border-transparent')
                              }`}
                            />
                          ) : (
                            <div className={`w-12 h-12 rounded-full bg-gradient-to-tr ${getAvatarColor(partner.displayName)} flex items-center justify-center font-bold text-[15px] border-[2px] select-none ${
                              isThisPartnerCalling ? 'border-primary animate-pulse' : (isSelected ? 'border-primary/50' : 'border-transparent')
                            }`}>
                              {getInitials(partner.displayName)}
                            </div>
                          )}
                          {isThisPartnerCalling && (
                            <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping"></div>
                          )}
                          {partner.isOnline && !isThisPartnerCalling && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0a0a0c] shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                          )}
                        </div>
                        
                        <div className="flex-grow min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <h4 className={`text-[14px] font-bold truncate pr-2 ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                              {partner.displayName}
                            </h4>
                            <span className={`text-[10px] shrink-0 font-semibold uppercase tracking-wider ${isSelected ? 'text-primary/80' : 'text-on-surface-variant/60'}`}>
                              {partner.latestMessageAt}
                            </span>
                          </div>
                          <p className={`text-[13px] truncate ${isSelected ? 'text-on-surface font-medium' : 'text-on-surface-variant'}`}>
                            {partner.latestMessageSnippet}
                          </p>
                        </div>

                        {/* Concentric active call pulse next to username */}
                        {isThisPartnerCalling && (
                          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-primary text-background shadow-[0_0_15px_rgba(77,142,255,0.5)] animate-pulse shrink-0 ml-auto">
                            <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping"></span>
                            <span className="material-symbols-outlined text-[16px] font-bold">call</span>
                          </div>
                        )}
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
