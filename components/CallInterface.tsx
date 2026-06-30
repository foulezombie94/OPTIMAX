'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

type CallInterfaceProps = {
  currentUserId: string;
  currentUserName: string;
  currentUserAvatarUrl?: string;
  partnerId: string;
  partnerName: string;
  partnerAvatarUrl?: string;
};

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
};

export default function CallInterface({ 
  currentUserId, 
  currentUserName, 
  currentUserAvatarUrl, 
  partnerId, 
  partnerName, 
  partnerAvatarUrl 
}: CallInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Handle local webcam
  useEffect(() => {
    let stream: MediaStream | null = null;
    
    async function setupCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access denied or failed", err);
      }
    }

    setupCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Fetch initial chat messages and subscribe to real-time updates
  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true })
        .limit(50);
        
      if (data) setMessages(data);
    };

    fetchMessages();

    const channel = supabase.channel(`call_chat_${partnerId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `sender_id=eq.${partnerId}`,
      }, (payload: any) => {
        const newMessage = payload.new as Message;
        if (newMessage.receiver_id === currentUserId) {
          setMessages(prev => [...prev, newMessage]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, partnerId, supabase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMsg = {
      sender_id: currentUserId,
      receiver_id: partnerId,
      content: input,
    };

    setInput('');
    // Optimistic UI update
    setMessages(prev => [...prev, { ...newMsg, id: Date.now().toString(), created_at: new Date().toISOString() }]);

    await supabase.from('messages').insert([newMsg]);
  };

  const getInitials = (name: string) => name ? name.trim().charAt(0).toUpperCase() : 'U';

  const toggleVideo = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOn(!isVideoOn);
    }
  };

  const toggleMic = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMicOn(!isMicOn);
    }
  };

  return (
    <div className="relative w-full h-full bg-[#131313] text-[#e5e2e1] font-sans">
      {/* Immersive Background Video Feed (Simulated Partner) */}
      <div className="absolute inset-0 z-0">
        <div 
          className="w-full h-full bg-cover bg-center object-cover" 
          style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBsD1ouTPaYiUWcyUPPDm4-kHCY5ANORxAJfzQUKZTL4fh6YSYqrfOdkCNiKqOIBqnLo3277-gmIjhBUZ_qktfzC3SQjqB5AbBcbgAGVdxLge4D0R6Hjrs_V2PWGIO4CsiZvP4mYHlhbH62eNWdzrqoRoM8LbGU6xVjtipcKtAEKSGGpfn6xSfTVZueXzq5-JkIGVjVbBGwCFjI-bxYm6Y0YxTJLBb4qq3MNC-W55s-vR_n-pDKMr2C5mrZ8xv7-hdU2HzEk7slHWI')" }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40"></div>
      </div>

      {/* TopNavBar */}
      <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-5 md:px-10 py-4 bg-transparent text-[#f23c57]">
        <div className="flex items-center gap-4">
          <Link href={`/messages/${partnerId}`} className="hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[28px]">arrow_back</span>
          </Link>
          <span className="text-[28px] md:text-[32px] font-bold tracking-tighter">Lumina Video</span>
        </div>
        <div className="flex items-center gap-6">
          <button className="text-[#e4bdbe] hover:text-[#f23c57] transition-colors scale-95 active:scale-90">
            <span className="material-symbols-outlined text-[24px]">grid_view</span>
          </button>
          <button className="text-[#e4bdbe] hover:text-[#f23c57] transition-colors scale-95 active:scale-90">
            <span className="material-symbols-outlined text-[24px]">info</span>
          </button>
          <div className="w-10 h-10 rounded-full border border-white/20 overflow-hidden bg-[#333] flex items-center justify-center shrink-0">
            {currentUserAvatarUrl ? (
              <img alt="User" src={currentUserAvatarUrl} className="w-full h-full object-cover" />
            ) : (
              <span className="font-bold text-white">{getInitials(currentUserName)}</span>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="relative z-10 w-full h-full flex pt-24 pb-32 px-5 md:px-10 gap-10">
        
        {/* Center Canvas / Video Area */}
        <div className="flex-1 flex flex-col relative h-full">
          {/* Live Indicator */}
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
            <div className="w-2.5 h-2.5 rounded-full bg-[#f23c57] live-pulse"></div>
            <span className="text-[12px] font-bold text-[#f23c57] uppercase tracking-widest">En Direct</span>
          </div>

          {/* Self View Floating Window */}
          <div className="absolute top-4 right-4 w-48 h-64 neo-glass-panel rounded-lg overflow-hidden shadow-2xl z-20 bg-black">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
            <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded backdrop-blur-sm">
              <span className="text-[12px] font-bold text-white">Vous</span>
            </div>
          </div>
        </div>

        {/* SideNavBar (Chat) */}
        <aside className="fixed right-0 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col h-[calc(100vh-120px)] w-[350px] rounded-2xl m-5 bg-white/5 backdrop-blur-2xl border border-white/20 shadow-2xl transition-all duration-300">
          {/* Header */}
          <div className="p-5 border-b border-white/10 flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-[#222] shrink-0 overflow-hidden flex items-center justify-center">
               {partnerAvatarUrl ? (
                 <img src={partnerAvatarUrl} className="w-full h-full object-cover" alt="partner"/>
               ) : (
                 <span className="font-bold text-white text-[14px]">{getInitials(partnerName)}</span>
               )}
             </div>
             <div>
                <h2 className="text-[18px] font-bold text-white mb-0.5">{partnerName}</h2>
                <p className="text-[13px] text-[#8c909f]">Appel Sécurisé</p>
             </div>
          </div>
          
          {/* Messages Area */}
          <div className="flex-grow overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {messages.length === 0 && (
              <div className="text-center text-[#888] text-[13px] mt-10">
                L'historique du chat est synchronisé en direct.
              </div>
            )}
            
            {messages.map((msg, idx) => {
              const isMe = msg.sender_id === currentUserId;
              return (
                <div key={idx} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                  {!isMe && (
                    <div className="w-7 h-7 rounded-full bg-[#333] shrink-0 overflow-hidden flex items-center justify-center mt-1">
                      {partnerAvatarUrl ? (
                        <img src={partnerAvatarUrl} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-bold text-white">{getInitials(partnerName)}</span>
                      )}
                    </div>
                  )}
                  <div className={`max-w-[75%] p-3 text-[14px] leading-relaxed break-words shadow-sm backdrop-blur-md ${isMe ? 'bg-[#f23c57]/80 text-white rounded-2xl rounded-tr-none border border-[#f23c57]' : 'bg-white/10 text-white rounded-2xl rounded-tl-none border border-white/10'}`}>
                    {msg.content.startsWith('[Image]') ? (
                       <img src={msg.content.replace('[Image] ', '')} alt="GIF" className="rounded-lg w-full max-w-[200px]" />
                    ) : (
                       msg.content
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-3 border-t border-white/10 bg-black/20 rounded-b-2xl">
            <form onSubmit={sendMessage} className="flex gap-2">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message à l'appel..."
                className="flex-grow bg-white/10 border border-white/20 rounded-full px-4 py-2 text-[13px] text-white outline-none focus:border-[#f23c57] transition-colors"
              />
              <button type="submit" disabled={!input.trim()} className="w-9 h-9 rounded-full bg-[#f23c57] text-white flex items-center justify-center shrink-0 disabled:opacity-50 hover:bg-[#ff0050] transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            </form>
          </div>
        </aside>
      </main>

      {/* BottomNavBar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 md:gap-4 px-4 md:px-6 py-2 mb-6 md:mb-10 bg-white/10 backdrop-blur-xl rounded-full max-w-fit mx-auto border border-white/20 glow-accent">
        
        <button onClick={toggleMic} className={`flex flex-col items-center justify-center w-14 h-14 rounded-full hover:bg-white/20 transition-all active:scale-90 cursor-pointer ${!isMicOn ? 'bg-white/20 text-white' : 'text-[#e5e2e1]'}`}>
          <span className="material-symbols-outlined text-[24px]">{isMicOn ? 'mic' : 'mic_off'}</span>
        </button>
        
        <button onClick={toggleVideo} className={`flex flex-col items-center justify-center rounded-full w-16 h-16 scale-110 shadow-[0_0_20px_rgba(242,60,87,0.4)] transition-all active:scale-90 cursor-pointer ${isVideoOn ? 'bg-[#f23c57] text-white' : 'bg-white/20 text-white'}`}>
          <span className="material-symbols-outlined text-[26px]" style={{fontVariationSettings: "'FILL' 1"}}>{isVideoOn ? 'videocam' : 'videocam_off'}</span>
        </button>
        
        <button className="flex flex-col items-center justify-center w-14 h-14 rounded-full text-[#e5e2e1] hover:bg-white/20 transition-all active:scale-90 cursor-pointer">
          <span className="material-symbols-outlined text-[24px]">screen_share</span>
        </button>
        
        <button className="flex flex-col items-center justify-center w-14 h-14 rounded-full text-[#e5e2e1] hover:bg-white/20 transition-all active:scale-90 cursor-pointer">
          <span className="material-symbols-outlined text-[24px]">more_horiz</span>
        </button>
        
        <div className="w-px h-8 bg-white/20 mx-1 md:mx-2"></div>
        
        <Link href={`/messages/${partnerId}`} className="flex items-center justify-center bg-[#f23c57] text-white rounded-full px-5 py-3 md:px-6 md:py-3 hover:bg-[#d92c46] transition-all shadow-[0_0_20px_rgba(242,60,87,0.5)] active:scale-90 cursor-pointer">
          <span className="material-symbols-outlined text-[22px] md:mr-2">call_end</span>
          <span className="text-[13px] font-bold tracking-wider hidden md:block">QUITTER</span>
        </Link>
      </div>
    </div>
  );
}
