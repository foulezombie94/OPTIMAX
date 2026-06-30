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
  useTracks
} from '@livekit/components-react';
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

  const [callStatus, setCallStatus] = useState<'idle' | 'ringing-incoming' | 'ringing-outgoing' | 'connected'>(
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
  const signalingChannelName = `call_signal_${[currentUserId, partnerId].sort().join('_')}`;

  // --- SUPABASE SIGNALING FOR RINGING ---
  useEffect(() => {
    let isMounted = true;

    const initSignaling = async () => {
      const channel = supabase.channel(signalingChannelName);
      channelRef.current = channel;

      channel.on('broadcast', { event: 'signal' }, async ({ payload }: { payload: any }) => {
        if (payload.senderId === currentUserId) return;

        if (payload.type === 'call-accepted') {
          if (initialOutgoing) {
            setCallStatus('connected');
          }
        } 
        else if (payload.type === 'call-declined') {
          endCall();
        }
      });

      channel.subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED' && initialOutgoing) {
          await supabase.from('messages').insert({
            sender_id: currentUserId,
            receiver_id: partnerId,
            content: initialCallType === 'video' ? '__CALL_INITIATED_VIDEO__' : '__CALL_INITIATED_AUDIO__'
          });
        }
      });
    };

    if (initialIncoming || initialOutgoing) {
      initSignaling();
    }

    return () => {
      isMounted = false;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [initialIncoming, initialOutgoing, currentUserId, partnerId]);

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
    channelRef.current?.send({
      type: 'broadcast',
      event: 'signal',
      payload: { type: 'call-accepted', senderId: currentUserId }
    });
  };

  const declineCall = () => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'signal',
      payload: { type: 'call-declined', senderId: currentUserId }
    });
    router.push(`/messages/${partnerId}`);
  };

  const endCall = () => {
    declineCall();
  };

  // --- CHAT LOGIC ---
  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true })
        .limit(50);
        
      if (data) {
        setMessages(data.filter((m: any) => !m.content.startsWith('__CALL_INITIATED_')));
      }
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
        if (newMessage.receiver_id === currentUserId && !newMessage.content.startsWith('__CALL_INITIATED_')) {
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
    setMessages(prev => [...prev, { ...newMsg, id: Date.now().toString(), created_at: new Date().toISOString() }]);
    await supabase.from('messages').insert([newMsg]);
  };

  // --- UI RENDERERS ---

  if (callStatus === 'ringing-incoming') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#131313] to-black text-white relative overflow-hidden animate-fade-in">
        <div className="absolute inset-0 bg-[#f23c57]/10 animate-pulse"></div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-[#222] shadow-[0_0_50px_rgba(242,60,87,0.4)] flex items-center justify-center mb-8 border-4 border-[#f23c57]/50 overflow-hidden">
            {partnerAvatarUrl ? (
              <img src={partnerAvatarUrl} alt={partnerName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-bold">{getInitials(partnerName)}</span>
            )}
          </div>
          <h2 className="text-3xl md:text-5xl font-black mb-3">{partnerName}</h2>
          <p className="text-lg text-[#f23c57] uppercase tracking-widest font-bold mb-16 animate-bounce">
            Appel {callType === 'video' ? 'Vidéo' : 'Vocal'} Entrant...
          </p>
          
          <div className="flex items-center gap-10 md:gap-16">
            <div className="flex flex-col items-center gap-3">
              <button onClick={declineCall} className="w-16 h-16 md:w-20 md:h-20 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 shadow-[0_0_30px_rgba(220,38,38,0.5)]">
                <span className="material-symbols-outlined text-3xl">call_end</span>
              </button>
              <span className="font-bold text-sm tracking-wider uppercase text-white/70">Décliner</span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <button onClick={acceptCall} className="w-16 h-16 md:w-20 md:h-20 bg-emerald-500 hover:bg-emerald-600 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                <span className="material-symbols-outlined text-3xl">call</span>
              </button>
              <span className="font-bold text-sm tracking-wider uppercase text-white/70">Accepter</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (callStatus === 'ringing-outgoing') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#131313] to-black text-white relative overflow-hidden animate-fade-in">
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-[#222] shadow-[0_0_50px_rgba(255,255,255,0.1)] flex items-center justify-center mb-8 overflow-hidden">
            {partnerAvatarUrl ? (
              <img src={partnerAvatarUrl} alt={partnerName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-bold">{getInitials(partnerName)}</span>
            )}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-3">{partnerName}</h2>
          <p className="text-sm text-white/60 uppercase tracking-widest font-mono mb-16 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
            Sonnerie en cours...
          </p>
          
          <button onClick={endCall} className="w-16 h-16 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 shadow-[0_0_30px_rgba(220,38,38,0.5)]">
            <span className="material-symbols-outlined text-3xl">call_end</span>
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
        messages={messages}
        input={input}
        setInput={setInput}
        sendMessage={sendMessage}
        messagesEndRef={messagesEndRef}
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
  messages,
  input,
  setInput,
  sendMessage,
  messagesEndRef,
  isMicOn,
  setIsMicOn,
  isVideoOn,
  setIsVideoOn,
  endCall
}: any) {
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const partner = remoteParticipants[0];

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
            ) : callType === 'audio' ? (
              <div className="w-full h-full flex flex-col items-center justify-center opacity-50">
                <div className="w-48 h-48 rounded-full bg-[#222] flex items-center justify-center mb-6 overflow-hidden border-2 border-white/10">
                  {partnerAvatarUrl ? (
                    <img src={partnerAvatarUrl} alt="partner" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-6xl font-bold">{getInitials(partnerName)}</span>
                  )}
                </div>
                <div className="text-white/50 text-xl flex items-center gap-2">
                  <span className="material-symbols-outlined animate-pulse text-[#f23c57]">graphic_eq</span>
                  Appel Vocal Actif
                </div>
              </div>
            ) : null}
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
      <main className="relative z-10 w-full h-full flex pt-24 pb-32 px-5 md:px-10 gap-10">
        
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

        {/* SideNavBar (Chat) */}
        <aside className="fixed right-0 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col h-[calc(100vh-120px)] w-[350px] rounded-2xl m-5 bg-white/5 backdrop-blur-2xl border border-white/20 shadow-2xl transition-all duration-300">
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
                <p className="text-[13px] text-[#8c909f]">Appel Sécurisé (LiveKit)</p>
             </div>
          </div>
          
          <div className="flex-grow overflow-y-auto p-4 space-y-4 scrollbar-none">
            {messages.map((msg: any, idx: number) => {
              const isMe = msg.sender_id === localParticipant.identity;
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
                    {msg.content}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

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
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 md:gap-4 px-4 md:px-6 py-2 mb-6 md:mb-10 bg-white/10 backdrop-blur-xl rounded-full max-w-fit mx-auto border border-white/20 shadow-2xl">
        <button onClick={toggleMic} className={`flex flex-col items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full hover:bg-white/20 transition-all active:scale-90 cursor-pointer ${!isMicOn ? 'bg-white/20 text-white' : 'text-[#e5e2e1]'}`}>
          <span className="material-symbols-outlined text-[20px] md:text-[24px]">{isMicOn ? 'mic' : 'mic_off'}</span>
        </button>
        
        {callType === 'video' && (
          <button onClick={toggleVideo} className={`flex flex-col items-center justify-center rounded-full w-14 h-14 md:w-16 md:h-16 scale-110 shadow-[0_0_20px_rgba(242,60,87,0.4)] transition-all active:scale-90 cursor-pointer ${isVideoOn ? 'bg-[#f23c57] text-white' : 'bg-white/20 text-white'}`}>
            <span className="material-symbols-outlined text-[24px] md:text-[26px]" style={{fontVariationSettings: "'FILL' 1"}}>{isVideoOn ? 'videocam' : 'videocam_off'}</span>
          </button>
        )}
        
        <div className="w-px h-8 bg-white/20 mx-1 md:mx-2"></div>
        
        <button onClick={endCall} className="flex items-center justify-center bg-red-600 text-white rounded-full px-5 py-3 md:px-6 md:py-3 hover:bg-red-700 transition-all shadow-[0_0_20px_rgba(220,38,38,0.5)] active:scale-90 cursor-pointer">
          <span className="material-symbols-outlined text-[22px] md:mr-2">call_end</span>
          <span className="text-[13px] font-bold tracking-wider hidden md:block">QUITTER</span>
        </button>
      </div>
    </div>
  );
}
