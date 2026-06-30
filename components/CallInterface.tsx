'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LiveKitRoom,
  useRemoteParticipants,
  useLocalParticipant,
  VideoTrack,
  AudioTrack,
  useDisconnectButton,
  useTracks,
  useChat
} from '@livekit/components-react';
import TicTacToe from './TicTacToe';
import { Track } from 'livekit-client';
import '@livekit/components-styles';

type CallInterfaceProps = {
  currentUserId: string;
  currentUserName: string;
  currentUserAvatarUrl?: string;
  partnerId: string;
  partnerName: string;
  partnerAvatarUrl?: string;
  initialIncoming?: boolean;
  initialOutgoing?: boolean;
  initialCallType?: 'audio' | 'video';
};

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
};

type CallStatus = 'idle' | 'ringing-incoming' | 'ringing-outgoing' | 'connected' | 'busy';

export default function CallInterface({ 
  currentUserId, 
  currentUserName, 
  currentUserAvatarUrl, 
  partnerId, 
  partnerName, 
  partnerAvatarUrl,
  initialIncoming,
  initialOutgoing,
  initialCallType = 'video'
}: CallInterfaceProps) {
  const router = useRouter();
  const supabase = createClient();

  const [callStatus, setCallStatus] = useState<CallStatus>(
    initialIncoming ? 'ringing-incoming' : initialOutgoing ? 'ringing-outgoing' : 'idle'
  );
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(initialCallType === 'video');
  const [callType] = useState<'audio' | 'video'>(initialCallType);
  const [token, setToken] = useState<string>('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  const getInitials = (name: string) => name ? name.trim().charAt(0).toUpperCase() : 'U';

  const roomName = `call_room_${[currentUserId, partnerId].sort().join('_')}`;
  const mySignalChannelName = `user_signal_${currentUserId}`;
  const partnerSignalChannelName = `user_signal_${partnerId}`;

  // --- SUPABASE ZERO-DB SIGNALING ---
  useEffect(() => {
    let isMounted = true;
    let interval: NodeJS.Timeout;
    let timeout: NodeJS.Timeout;

    const myChannel = supabase.channel(mySignalChannelName);
    const partnerChannel = supabase.channel(partnerSignalChannelName);

    const sendSignal = (type: string) => {
      partnerChannel.send({
        type: 'broadcast',
        event: 'signal',
        payload: { type, callerId: currentUserId, responderId: currentUserId, callType: initialCallType }
      });
    };

    myChannel.on('broadcast', { event: 'signal' }, ({ payload }: { payload: any }) => {
      if (!isMounted) return;
      if (payload.callerId !== partnerId && payload.responderId !== partnerId) return;

      switch (payload.type) {
        case 'accept':
          setCallStatus('connected');
          break;
        case 'decline':
        case 'cancel':
          router.push(`/messages/${partnerId}`);
          break;
        case 'busy':
          if (callStatus === 'ringing-outgoing') setCallStatus('busy');
          break;
        case 'invite':
          if (callStatus === 'ringing-outgoing' && currentUserId > partnerId) {
             setCallStatus('ringing-incoming');
          }
          break;
        case 'ringing':
          if (callStatus === 'ringing-outgoing') {
             clearTimeout(timeout);
             timeout = setTimeout(() => router.push(`/messages/${partnerId}`), 30000);
          }
          break;
      }
    });

    const startSignaling = () => {
      myChannel.subscribe();
      partnerChannel.subscribe();

      // Ensure sendSignal works even if SUBSCRIBED is missed due to channel reuse
      channelRef.current = { sendSignal };

      setTimeout(() => {
        if (callStatus === 'ringing-outgoing') {
           sendSignal('invite');
           interval = setInterval(() => sendSignal('invite'), 2000);
           timeout = setTimeout(() => router.push(`/messages/${partnerId}`), 30000);
        } else if (callStatus === 'ringing-incoming') {
           sendSignal('ringing');
           interval = setInterval(() => sendSignal('ringing'), 2000);
           timeout = setTimeout(() => router.push(`/messages/${partnerId}`), 30000);
        }
      }, 500); // 500ms delay to let both channels connect to Realtime
    };

    if (callStatus === 'ringing-incoming' || callStatus === 'ringing-outgoing') {
      startSignaling();
    }

    return () => {
      isMounted = false;
      clearInterval(interval);
      clearTimeout(timeout);
      supabase.removeChannel(myChannel);
      supabase.removeChannel(partnerChannel);
    };
  }, [callStatus, currentUserId, partnerId, initialCallType, router, supabase]);

  useEffect(() => {
    if (callStatus === 'connected') {
      fetch(`/api/livekit/token?room=${roomName}&username=${encodeURIComponent(currentUserName)}`)
        .then(res => res.json())
        .then(data => {
           if (data.token) setToken(data.token);
        })
        .catch(console.error);
    }
  }, [callStatus, roomName, currentUserName]);

  const acceptCall = () => {
    setCallStatus('connected');
    channelRef.current?.sendSignal('accept');
  };

  const declineCall = () => {
    channelRef.current?.sendSignal('decline');
    router.push(`/messages/${partnerId}`);
  };

  const cancelCall = () => {
    channelRef.current?.sendSignal('cancel');
    router.push(`/messages/${partnerId}`);
  };

  const endCall = () => {
    router.push(`/messages/${partnerId}`);
  };

  // --- UI RENDERERS ---

  if (callStatus === 'ringing-incoming') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#050505] text-white relative overflow-hidden animate-fade-in">
        {/* Animated Background Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#f23c57]/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" style={{animationDelay: '1s'}}></div>
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative mb-10">
            {/* Ripples */}
            <div className="absolute inset-0 rounded-full border-2 border-[#f23c57]/40 animate-ping" style={{ animationDuration: '2s' }}></div>
            <div className="absolute inset-0 rounded-full border-2 border-[#f23c57]/20 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}></div>
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-[#111] shadow-[0_0_60px_rgba(242,60,87,0.5)] flex items-center justify-center border-4 border-[#f23c57] overflow-hidden relative z-10">
              {partnerAvatarUrl ? (
                <img src={partnerAvatarUrl} alt={partnerName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-5xl font-black">{getInitials(partnerName)}</span>
              )}
            </div>
          </div>

          <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight drop-shadow-xl">{partnerName}</h2>
          <p className="text-lg md:text-xl text-white/80 font-medium mb-16 flex items-center gap-3 bg-white/5 px-6 py-2 rounded-full border border-white/10 backdrop-blur-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f23c57] animate-pulse"></span>
            Appel {callType === 'video' ? 'Vidéo' : 'Vocal'} Entrant
          </p>
          
          <div className="flex items-center gap-12 md:gap-20">
            <div className="flex flex-col items-center gap-4 group cursor-pointer" onClick={declineCall}>
              <div className="w-16 h-16 md:w-20 md:h-20 bg-red-600/20 backdrop-blur-md rounded-full flex items-center justify-center transition-all group-hover:bg-red-600 group-hover:scale-110 active:scale-95 border border-red-500/50 shadow-[0_0_30px_rgba(220,38,38,0.3)] group-hover:shadow-[0_0_40px_rgba(220,38,38,0.8)]">
                <span className="material-symbols-outlined text-3xl md:text-4xl text-red-500 group-hover:text-white transition-colors">call_end</span>
              </div>
              <span className="font-bold text-xs md:text-sm tracking-widest uppercase text-white/50 group-hover:text-red-400 transition-colors">Refuser</span>
            </div>
            <div className="flex flex-col items-center gap-4 group cursor-pointer" onClick={acceptCall}>
              <div className="w-16 h-16 md:w-20 md:h-20 bg-emerald-500/20 backdrop-blur-md rounded-full flex items-center justify-center transition-all group-hover:bg-emerald-500 group-hover:scale-110 active:scale-95 border border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.3)] group-hover:shadow-[0_0_40px_rgba(16,185,129,0.8)]">
                <span className="material-symbols-outlined text-3xl md:text-4xl text-emerald-400 group-hover:text-white transition-colors">call</span>
              </div>
              <span className="font-bold text-xs md:text-sm tracking-widest uppercase text-white/50 group-hover:text-emerald-400 transition-colors">Accepter</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (callStatus === 'ringing-outgoing') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#050505] text-white relative overflow-hidden animate-fade-in">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[150px]"></div>
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative mb-8">
            <div className="absolute inset-0 rounded-full border border-blue-500/30 animate-ping" style={{ animationDuration: '2s' }}></div>
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-[#111] shadow-[0_0_40px_rgba(255,255,255,0.05)] flex items-center justify-center border-2 border-white/10 overflow-hidden relative z-10">
              {partnerAvatarUrl ? (
                <img src={partnerAvatarUrl} alt={partnerName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl md:text-5xl font-bold text-white/80">{getInitials(partnerName)}</span>
              )}
            </div>
          </div>

          <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">{partnerName}</h2>
          <p className="text-sm md:text-base text-white/60 font-medium mb-16 flex items-center gap-3 bg-white/5 px-5 py-2 rounded-full border border-white/5">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            Sonnerie en cours...
          </p>
          
          <div className="flex flex-col items-center gap-3 group cursor-pointer" onClick={cancelCall}>
             <div className="w-16 h-16 bg-red-600/20 backdrop-blur-md hover:bg-red-600 rounded-full flex items-center justify-center transition-all group-hover:scale-110 active:scale-95 border border-red-500/30 hover:border-red-500 shadow-[0_0_30px_rgba(220,38,38,0.2)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)]">
               <span className="material-symbols-outlined text-3xl text-red-500 group-hover:text-white transition-colors">call_end</span>
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (callStatus === 'busy') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#050505] text-white relative overflow-hidden animate-fade-in">
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-[#111] flex items-center justify-center border-2 border-white/10 overflow-hidden mb-6 opacity-50 grayscale">
            {partnerAvatarUrl ? (
              <img src={partnerAvatarUrl} alt={partnerName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-white/50">{getInitials(partnerName)}</span>
            )}
          </div>
          <h2 className="text-2xl font-bold mb-2">{partnerName}</h2>
          <p className="text-red-400 font-medium mb-12 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">phone_in_talk</span>
            Est déjà en ligne avec quelqu'un d'autre
          </p>
          
          <button onClick={() => router.push(`/messages/${partnerId}`)} className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-full transition-all active:scale-95 font-bold">
            Retour aux messages
          </button>
        </div>
      </div>
    );
  }

  if (callStatus === 'connected' && !token) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-white">
        <div className="w-10 h-10 border-4 border-[#f23c57] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      video={isVideoOn}
      audio={isMicOn}
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      onDisconnected={endCall}
      className="w-full h-full"
    >
      <ConnectedCallUI 
        callType={callType}
        partnerAvatarUrl={partnerAvatarUrl}
        partnerName={partnerName}
        currentUserAvatarUrl={currentUserAvatarUrl}
        currentUserName={currentUserName}
        getInitials={getInitials}
        isMicOn={isMicOn}
        setIsMicOn={setIsMicOn}
        isVideoOn={isVideoOn}
        setIsVideoOn={setIsVideoOn}
        endCall={endCall}
      />
    </LiveKitRoom>
  );
}


function ConnectedCallUI({
  callType,
  partnerAvatarUrl,
  partnerName,
  currentUserAvatarUrl,
  currentUserName,
  getInitials,
  isMicOn,
  setIsMicOn,
  isVideoOn,
  setIsVideoOn,
  endCall
}: any) {
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const partner = remoteParticipants[0];

  const { send, chatMessages } = useChat();
  const [input, setInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    send(input);
    setInput('');
  };

  const toggleMic = () => {
    localParticipant.setMicrophoneEnabled(!isMicOn);
    setIsMicOn(!isMicOn);
  };

  const toggleVideo = () => {
    localParticipant.setCameraEnabled(!isVideoOn);
    setIsVideoOn(!isVideoOn);
  };

  return (
    <div className="relative w-full h-full bg-[#131313] text-[#e5e2e1] font-sans">
      {/* Remote Video Feed (Full Screen) */}
      <div className="absolute inset-0 z-0 bg-black">
        {partner && (
          <>
            {partner.getTrackPublication(Track.Source.Camera)?.videoTrack ? (
              <VideoTrack 
                trackRef={{
                  participant: partner,
                  source: Track.Source.Camera,
                  publication: partner.getTrackPublication(Track.Source.Camera)!
                }}
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center relative">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-[#0a0a0a] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1a0508] via-[#0a0a0a] to-[#050505] opacity-80 z-0"></div>
                <div className="relative z-10 w-full h-full">
                  <TicTacToe partnerName={partnerName} />
                </div>
              </div>
            )}
            {partner.getTrackPublication(Track.Source.Microphone)?.audioTrack && (
              <AudioTrack 
                trackRef={{
                  participant: partner,
                  source: Track.Source.Microphone,
                  publication: partner.getTrackPublication(Track.Source.Microphone)!
                }}
              />
            )}
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40"></div>
      </div>

      {/* TopNavBar */}
      <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-5 md:px-10 py-4 bg-transparent text-[#f23c57]">
        <div className="flex items-center gap-4">
          <button onClick={endCall} className="hover:text-white transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-[28px]">arrow_back</span>
          </button>
          <span className="text-[28px] md:text-[32px] font-bold tracking-tighter">Lumina {callType === 'video' ? 'Video' : 'Audio'}</span>
        </div>
        <div className="flex items-center gap-6">
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
      <main className="relative z-10 w-full h-full flex pt-20 pb-24 md:pt-24 md:pb-32 px-4 md:px-10 lg:pr-[380px]">
        
        {/* Center Canvas / Video Area */}
        <div className="flex-1 flex flex-col relative h-full">
          {/* Live Indicator */}
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
            <div className="w-2.5 h-2.5 rounded-full bg-[#f23c57] animate-pulse"></div>
            <span className="text-[12px] font-bold text-[#f23c57] uppercase tracking-widest">En Direct</span>
          </div>

          {/* Self View Floating Window */}
          {callType === 'video' && (
            <div className="absolute top-4 right-4 w-32 h-44 md:w-48 md:h-64 rounded-xl overflow-hidden shadow-2xl z-20 bg-black border border-white/20">
              {localParticipant.getTrackPublication(Track.Source.Camera)?.videoTrack ? (
                <VideoTrack 
                  trackRef={{
                    participant: localParticipant,
                    source: Track.Source.Camera,
                    publication: localParticipant.getTrackPublication(Track.Source.Camera)!
                  }}
                  className="w-full h-full object-cover transform scale-x-[-1]" 
                />
              ) : (
                <div className="w-full h-full bg-[#222] flex items-center justify-center">
                  <span className="material-symbols-outlined text-white/30 text-[40px]">videocam_off</span>
                </div>
              )}
              <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded backdrop-blur-sm">
                <span className="text-[12px] font-bold text-white">Vous</span>
              </div>
            </div>
          )}
        </div>

        {/* Chat Drawer/Sidebar */}
        <aside className={`
          fixed z-40 transition-all duration-300 ease-in-out border border-white/10 bg-[#0a0a0a]/95 backdrop-blur-3xl shadow-2xl flex flex-col
          lg:right-0 lg:top-1/2 lg:-translate-y-1/2 lg:h-[calc(100vh-120px)] lg:w-[350px] lg:rounded-2xl lg:m-5
          ${isChatOpen ? 'bottom-0 left-0 w-full h-[65vh] rounded-t-3xl' : '-bottom-[100%] left-0 w-full h-[65vh] rounded-t-3xl lg:bottom-auto'}
        `}>
          <div className="p-4 md:p-5 border-b border-white/10 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#222] shrink-0 overflow-hidden flex items-center justify-center">
                {partnerAvatarUrl ? (
                  <img src={partnerAvatarUrl} className="w-full h-full object-cover" alt="partner"/>
                ) : (
                  <span className="font-bold text-white text-[14px]">{getInitials(partnerName)}</span>
                )}
              </div>
              <div>
                 <h2 className="text-[16px] md:text-[18px] font-bold text-white mb-0.5">{partnerName}</h2>
                 <p className="text-[12px] md:text-[13px] text-[#8c909f]">Chat éphémère privé</p>
              </div>
            </div>
            {/* Close button for mobile */}
            <button 
              className="lg:hidden w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all"
              onClick={() => setIsChatOpen(false)}
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
          
          <div className="flex-grow overflow-y-auto p-4 space-y-4 scrollbar-none">
            {chatMessages.map((msg: any, idx: number) => {
              const isMe = msg.from?.identity === localParticipant.identity;
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
                    {msg.message}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-white/10 bg-black/20 rounded-b-2xl">
            <form onSubmit={handleSendMessage} className="flex gap-2">
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
      <div className={`fixed bottom-0 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 md:gap-4 px-3 md:px-6 py-2 mb-6 md:mb-10 bg-white/10 backdrop-blur-xl rounded-full max-w-[95%] md:max-w-fit mx-auto border border-white/20 shadow-2xl transition-transform duration-300 ${isChatOpen ? 'translate-y-32 lg:translate-y-0' : 'translate-y-0'}`}>
        <button onClick={toggleMic} className={`flex flex-col items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full hover:bg-white/20 transition-all active:scale-90 cursor-pointer shrink-0 ${!isMicOn ? 'bg-white/20 text-white' : 'text-[#e5e2e1]'}`}>
          <span className="material-symbols-outlined text-[20px] md:text-[24px]">{isMicOn ? 'mic' : 'mic_off'}</span>
        </button>
        
        {callType === 'video' && (
          <button onClick={toggleVideo} className={`flex flex-col items-center justify-center rounded-full w-14 h-14 md:w-16 md:h-16 scale-110 shadow-[0_0_20px_rgba(242,60,87,0.4)] transition-all active:scale-90 cursor-pointer shrink-0 ${isVideoOn ? 'bg-[#f23c57] text-white' : 'bg-white/20 text-white'}`}>
            <span className="material-symbols-outlined text-[24px] md:text-[26px]" style={{fontVariationSettings: "'FILL' 1"}}>{isVideoOn ? 'videocam' : 'videocam_off'}</span>
          </button>
        )}
        
        <button onClick={() => setIsChatOpen(!isChatOpen)} className={`lg:hidden flex flex-col items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full hover:bg-white/20 transition-all active:scale-90 cursor-pointer shrink-0 ${isChatOpen ? 'bg-[#f23c57] text-white' : 'bg-white/10 text-white'}`}>
          <span className="material-symbols-outlined text-[20px] md:text-[24px]">{isChatOpen ? 'forum' : 'chat'}</span>
        </button>

        <div className="w-px h-8 bg-white/20 mx-1 md:mx-2 shrink-0"></div>
        
        <button onClick={endCall} className="flex items-center justify-center bg-red-600 text-white rounded-full px-4 py-3 md:px-6 md:py-3 hover:bg-red-700 transition-all shadow-[0_0_20px_rgba(220,38,38,0.5)] active:scale-90 cursor-pointer shrink-0">
          <span className="material-symbols-outlined text-[22px] md:mr-2">call_end</span>
          <span className="text-[13px] font-bold tracking-wider hidden md:block">QUITTER</span>
        </button>
      </div>
    </div>
  );
}
