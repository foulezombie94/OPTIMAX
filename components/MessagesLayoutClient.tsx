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
    <div className="flex-grow pt-[80px] pb-0 flex overflow-hidden bg-white font-sans">
      <div className="max-w-7xl mx-auto w-full flex h-[calc(100vh-80px)] bg-white shadow-sm border-x border-slate-200">
        
        {/* Sidebar Panel */}
        <div className={`w-full md:w-80 lg:w-[360px] border-r border-slate-100 flex flex-col bg-white shrink-0 ${
          isChatOpen ? 'hidden md:flex' : 'flex'
        }`}>
          
          {/* Search Bar */}
          <div className="p-4 pb-2">
            <div className="relative flex items-center bg-white border border-slate-300 rounded-lg px-3 py-2 transition-colors">
              <span className="material-symbols-outlined text-slate-400 text-[20px] mr-2 select-none">search</span>
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-slate-900 placeholder:text-slate-400 text-[14px]"
              />
            </div>
          </div>

          {/* Active section */}
          <div className="px-4 py-2 border-b border-slate-100">
            <h3 className="text-[14px] font-bold text-slate-950 mb-3">Active</h3>
            <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-none">
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
                      <div className="relative w-11 h-11">
                        {partner.avatarUrl ? (
                          <img
                            src={partner.avatarUrl}
                            alt={partner.displayName}
                            className={`w-11 h-11 rounded-full object-cover border group-hover:scale-105 transition-transform ${
                              isThisPartnerCalling ? 'border-emerald-500 scale-105 animate-pulse' : 'border-slate-100'
                            }`}
                          />
                        ) : (
                          <div className={`w-11 h-11 rounded-full bg-gradient-to-tr ${getAvatarColor(partner.displayName)} flex items-center justify-center font-bold text-[14px] border group-hover:scale-105 transition-transform select-none ${
                            isThisPartnerCalling ? 'border-emerald-500 scale-105 animate-pulse' : 'border-slate-100'
                          }`}>
                            {getInitials(partner.displayName)}
                          </div>
                        )}
                        
                        {/* Concentric call wave rings */}
                        {isThisPartnerCalling && (
                          <div className="absolute inset-0 rounded-full border-2 border-emerald-500 animate-ping"></div>
                        )}

                        {partner.verified && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center border border-white z-10">
                            <span className="material-symbols-outlined text-white text-[9px] font-bold">check</span>
                          </div>
                        )}
                        {!partner.verified && !isThisPartnerCalling && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white z-10"></div>
                        )}
                      </div>
                    </Link>
                  );
                })}
            </div>
          </div>

          {/* Messages Header */}
          <div className="px-4 pt-4 pb-2 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h3 className="text-[16px] font-bold text-slate-950">Discussions</h3>
              <span className="bg-slate-100 text-slate-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                {partnerList.length}
              </span>
            </div>
            <button className="w-9 h-9 border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 rounded-lg flex items-center justify-center transition-colors shadow-sm cursor-pointer">
              <span className="material-symbols-outlined text-[20px]">edit_square</span>
            </button>
          </div>

          {/* Contact List */}
          <div className="flex-grow overflow-y-auto">
            {filteredPartners.length === 0 ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center h-48">
                <span className="material-symbols-outlined text-[36px] mb-2 text-slate-300">chat_bubble</span>
                <p className="text-sm">No conversations found</p>
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
                      className={`px-4 py-3.5 border-b border-slate-50 flex items-start gap-3 transition-colors cursor-pointer ${
                        isSelected 
                          ? 'bg-slate-50 border-l-[3px] border-l-blue-600 pl-[13px]' 
                          : 'hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="relative w-11 h-11 shrink-0 mt-0.5">
                        {partner.avatarUrl ? (
                          <img
                            src={partner.avatarUrl}
                            alt={partner.displayName}
                            className={`w-11 h-11 rounded-full object-cover border ${
                              isThisPartnerCalling ? 'border-emerald-500 scale-105 animate-pulse' : 'border-slate-100'
                            }`}
                          />
                        ) : (
                          <div className={`w-11 h-11 rounded-full bg-gradient-to-tr ${getAvatarColor(partner.displayName)} flex items-center justify-center font-bold text-[14px] border select-none ${
                            isThisPartnerCalling ? 'border-emerald-500 scale-105 animate-pulse' : 'border-slate-100'
                          }`}>
                            {getInitials(partner.displayName)}
                          </div>
                        )}
                        {isThisPartnerCalling && (
                          <div className="absolute inset-0 rounded-full border-2 border-emerald-500 animate-ping"></div>
                        )}
                        {partner.isOnline && !isThisPartnerCalling && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      
                      <div className="flex-grow min-w-0">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <h4 className="text-[14px] font-bold text-slate-900 truncate pr-2">
                            {partner.displayName}
                          </h4>
                          <span className="text-[11px] text-slate-400 shrink-0 font-medium">
                            {partner.latestMessageAt}
                          </span>
                        </div>
                        <p className="text-[12px] text-slate-400 font-medium mb-1">
                          @{partner.username}
                        </p>
                        <p className="text-[13px] text-slate-500 truncate leading-snug">
                          {partner.latestMessageSnippet}
                        </p>
                      </div>

                      {/* Concentric active call pulse next to username */}
                      {isThisPartnerCalling && (
                        <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.55)] animate-pulse shrink-0 ml-auto self-center">
                          <span className="absolute inset-0 rounded-full bg-emerald-500/40 animate-ping"></span>
                          <span className="material-symbols-outlined text-[14px] font-bold">call</span>
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
        <div className={`flex-1 flex flex-col relative bg-white ${
          isChatOpen ? 'flex' : 'hidden md:flex'
        }`}>
          {children}
        </div>

      </div>
    </div>
  );
}
