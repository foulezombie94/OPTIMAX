'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

const POPULAR_EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
  '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸',
  '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️',
  '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡',
  '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓',
  '🤫', '🫠', '🫡', '🫣', '❤️', '🧡', '💛', '💚', '💙', '💜',
  '🖤', '🤍', '🤎', '💔', '👍', '👎', '👊', '✊', '🙌', '👏',
  '🙏', '🔥', '✨', '🎉', '🚀', '💯', '👀', '💀', '💩'
];

type Message = {
  id: string;
  sender_id: string;
  sender_name?: string;
  content: string;
  created_at: string;
  isPdf?: boolean;
  fileSize?: string;
  reactions?: string[];
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

export default function ChatWindow({ 
  currentUserId, 
  partnerId, 
  partnerName,
  partnerUsername,
  partnerAvatarUrl
}: { 
  currentUserId: string, 
  partnerId: string, 
  partnerName: string,
  partnerUsername?: string,
  partnerAvatarUrl?: string
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const startCall = (type: 'audio' | 'video') => {
    window.dispatchEvent(new CustomEvent('start-global-call', {
      detail: {
        partnerId,
        partnerName,
        partnerUsername,
        partnerAvatarUrl,
        type
      }
    }));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${currentUserId})`)
      .order('created_at', { ascending: true });

    if (data) {
      const formatted = data.map((msg: { id: string; sender_id: string; content: string; created_at: string }) => {
        const isPdf = msg.content.toLowerCase().endsWith('.pdf');
        return {
          id: msg.id,
          sender_id: msg.sender_id,
          content: msg.content,
          created_at: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isPdf,
          fileSize: isPdf ? '1.2 MB' : undefined,
        };
      });
      setMessages(formatted);
    }
    setLoading(false);
  }, [currentUserId, partnerId, supabase]);

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchMessages();
    });

    const channel = supabase
      .channel('messages_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${currentUserId}`
        },
        (payload: any) => {
          const newMsg = payload.new as { id: string; sender_id: string; content: string; created_at: string };
          if (newMsg.sender_id === partnerId) {
            const isPdf = newMsg.content.toLowerCase().endsWith('.pdf');
            setMessages((prev) => [...prev, {
              id: newMsg.id,
              sender_id: newMsg.sender_id,
              content: newMsg.content,
              created_at: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isPdf,
              fileSize: isPdf ? '1.2 MB' : undefined,
            }]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partnerId, currentUserId, supabase, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const content = input.trim();
    setInput('');

    const tempId = crypto.randomUUID();
    const isPdf = content.toLowerCase().endsWith('.pdf');
    const newMsg: Message = {
      id: tempId,
      sender_id: currentUserId,
      content,
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isPdf,
      fileSize: isPdf ? '1.2 MB' : undefined,
    };
    setMessages(prev => [...prev, newMsg]);

    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: currentUserId,
        receiver_id: partnerId,
        content
      });

    if (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-transparent font-sans">
      
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-surface/30 backdrop-blur-md z-10 select-none">
        <div className="flex items-center gap-4">
          {/* Back button for mobile responsive view */}
          <Link href="/messages" className="md:hidden w-10 h-10 border border-white/10 bg-white/5 hover:bg-white/10 text-on-surface-variant rounded-xl flex items-center justify-center transition-colors shadow-sm shrink-0">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </Link>

          <div className="relative w-12 h-12 shrink-0">
            {partnerAvatarUrl ? (
              <img
                src={partnerAvatarUrl}
                alt={partnerName}
                className="w-12 h-12 rounded-full object-cover border-2 border-white/10"
              />
            ) : (
              <div className={`w-12 h-12 rounded-full bg-gradient-to-tr ${getAvatarColor(partnerName)} flex items-center justify-center font-bold text-[15px] border-2 border-white/10 select-none`}>
                {getInitials(partnerName)}
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#0a0a0c] shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-[16px] text-on-surface leading-tight">
                {partnerName}
              </h3>
              <div className="border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                Online
              </div>
            </div>
            <span className="text-[13px] text-on-surface-variant font-medium">
              @{partnerUsername || partnerName.toLowerCase().replace(/\s+/g, '')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Call Actions */}
          <button 
            onClick={() => startCall('audio')}
            className="w-10 h-10 border border-white/10 bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-primary rounded-xl flex items-center justify-center transition-colors shadow-sm cursor-pointer"
            title="Appel audio"
          >
            <span className="material-symbols-outlined text-[20px]">call</span>
          </button>
          <button 
            onClick={() => startCall('video')}
            className="w-10 h-10 border border-white/10 bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-primary rounded-xl flex items-center justify-center transition-colors shadow-sm cursor-pointer"
            title="Appel vidéo"
          >
            <span className="material-symbols-outlined text-[20px]">videocam</span>
          </button>

          <button className="h-10 px-4 border border-white/10 bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-on-surface rounded-xl text-[13px] font-semibold transition-colors shadow-sm flex items-center justify-center cursor-pointer">
            Épingle
          </button>
          <Link 
            href={`/u/${partnerUsername || partnerId}`}
            className="h-10 px-5 bg-primary hover:brightness-110 text-on-primary-container rounded-xl text-[13px] font-bold transition-colors shadow-[0_0_15px_rgba(77,142,255,0.2)] flex items-center justify-center cursor-pointer"
          >
            Voir profil
          </Link>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-grow overflow-y-auto px-6 py-6 space-y-6 flex flex-col bg-transparent scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {loading ? (
          <div className="flex-grow flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center text-on-surface-variant/60">
            <span className="material-symbols-outlined text-[56px] mb-4 text-on-surface-variant/40 animate-[wiggle_2s_ease-in-out_infinite]">waving_hand</span>
            <p className="text-sm font-semibold tracking-wide">Say hello to {partnerName}!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {/* Message Header (Sender name + timestamp) */}
                <div className={`flex items-baseline mb-1.5 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  <span className="text-[12px] font-bold text-on-surface">
                    {isMe ? 'You' : msg.sender_name || partnerName}
                  </span>
                  <span className={`text-[10px] text-on-surface-variant/70 font-medium tracking-wider uppercase ${isMe ? 'mr-2' : 'ml-2'}`}>
                    {msg.created_at}
                  </span>
                </div>

                <div className={`flex gap-3 items-end max-w-[85%] md:max-w-[75%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar for received messages */}
                  {!isMe && (
                    <div className="shrink-0 mb-1">
                      {partnerAvatarUrl ? (
                        <img
                          src={partnerAvatarUrl}
                          alt={partnerName}
                          className="w-9 h-9 rounded-full object-cover border border-white/10"
                        />
                      ) : (
                        <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${getAvatarColor(partnerName)} flex items-center justify-center font-bold text-[12px] border border-white/10 select-none`}>
                          {getInitials(partnerName)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message Bubble content */}
                  <div className="relative group">
                    {msg.isPdf ? (
                      /* PDF Attachment Card */
                      <div className="bg-surface/50 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-lg w-72 md:w-80 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-error/10 rounded-xl flex items-center justify-center border border-error/20 shrink-0">
                            <span className="material-symbols-outlined text-error text-[24px]">picture_as_pdf</span>
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-[14px] font-bold text-on-surface truncate">
                              {msg.content}
                            </h4>
                            <p className="text-[12px] text-on-surface-variant font-semibold mt-0.5">
                              {msg.fileSize}
                            </p>
                          </div>
                        </div>
                        <button className="text-on-surface-variant hover:text-primary transition-colors p-2 hover:bg-white/5 rounded-xl cursor-pointer">
                          <span className="material-symbols-outlined text-[22px]">cloud_download</span>
                        </button>
                      </div>
                    ) : (msg.content === '__CALL_INITIATED_AUDIO__' || msg.content === '__CALL_INITIATED_VIDEO__') ? (
                      /* Call Log Bubble */
                      <div 
                        className={`px-5 py-3 rounded-2xl text-[13px] font-semibold flex items-center gap-3 select-none ${
                          isMe 
                            ? 'bg-primary/10 text-primary border border-primary/20' 
                            : 'glass-panel text-on-surface-variant border border-white/5'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {msg.content === '__CALL_INITIATED_VIDEO__' ? 'videocam' : 'call'}
                        </span>
                        <span>
                          {isMe 
                            ? (msg.content === '__CALL_INITIATED_VIDEO__' ? 'Vous avez lancé un appel vidéo' : 'Vous avez lancé un appel vocal') 
                            : (msg.content === '__CALL_INITIATED_VIDEO__' ? 'Appel vidéo manqué' : 'Appel vocal manqué')
                          }
                        </span>
                      </div>
                    ) : (
                      /* Standard bubble */
                      <div 
                        className={`px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                          isMe 
                            ? 'bg-gradient-to-br from-primary to-primary-container text-on-primary-container rounded-br-sm' 
                            : 'glass-panel text-on-surface border border-white/5 rounded-bl-sm bg-white/5'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    )}

                    {/* Reactions */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="absolute -bottom-3 right-3 flex items-center gap-0.5 bg-surface border border-white/10 rounded-full px-2 py-0.5 shadow-md text-[14px] select-none">
                        {msg.reactions.map((emoji, idx) => (
                          <span key={idx}>{emoji}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-6 bg-transparent border-t border-white/5 flex-shrink-0 select-none">
        <form onSubmit={sendMessage} className="bg-surface/50 backdrop-blur-md border border-white/10 rounded-2xl p-3 shadow-lg flex flex-col focus-within:border-primary/50 focus-within:bg-surface/80 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e);
              }
            }}
            placeholder="Écrivez un message..."
            className="w-full bg-transparent border-none outline-none resize-none text-on-surface placeholder:text-on-surface-variant/40 text-[15px] min-h-[48px] px-3 py-2 scrollbar-none"
            rows={1}
            maxLength={1000}
          />
          <div className="flex justify-end items-center gap-3 mt-2 px-1">
            <div className="relative mr-auto">
              <button 
                type="button" 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-10 h-10 text-on-surface-variant hover:text-primary transition-colors rounded-xl hover:bg-white/5 flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-[24px]">sentiment_satisfied</span>
              </button>
              
              {showEmojiPicker && (
                <div className="absolute bottom-14 left-0 glass-panel border border-white/10 rounded-2xl p-4 shadow-2xl z-20 w-72 select-none animate-scale-in">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/5">
                    <span className="text-[12px] font-bold text-on-surface-variant uppercase tracking-widest">Emojis</span>
                    <button 
                      type="button" 
                      onClick={() => setShowEmojiPicker(false)}
                      className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pr-1">
                    {POPULAR_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setInput(prev => prev + emoji);
                        }}
                        className="text-[20px] hover:bg-white/10 p-1.5 rounded-lg transition-colors text-center cursor-pointer flex items-center justify-center transform active:scale-90"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button 
              type="button"
              className="w-10 h-10 text-on-surface-variant hover:text-secondary transition-colors rounded-xl hover:bg-white/5 flex items-center justify-center cursor-pointer"
              title="Ajouter un fichier"
            >
              <span className="material-symbols-outlined text-[22px]">attach_file</span>
            </button>
            <button 
              type="submit" 
              disabled={!input.trim()}
              className="h-10 px-6 bg-gradient-to-r from-primary to-primary-container hover:brightness-110 text-on-primary-container rounded-xl text-[14px] font-bold transition-all shadow-[0_0_15px_rgba(77,142,255,0.2)] flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
            >
              Envoyer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
