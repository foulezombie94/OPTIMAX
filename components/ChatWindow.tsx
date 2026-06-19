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
    <div className="flex flex-col h-full w-full bg-black font-sans">
      
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between bg-black z-10 select-none">
        <div className="flex items-center gap-3">
          {/* Back button */}
          <Link href="/messages" className="text-white flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[32px] font-light">arrow_back_ios_new</span>
          </Link>

          <div className="relative w-10 h-10 shrink-0 ml-1">
            {partnerAvatarUrl ? (
              <img
                src={partnerAvatarUrl}
                alt={partnerName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${getAvatarColor(partnerName)} flex items-center justify-center font-bold text-[14px] select-none`}>
                {getInitials(partnerName)}
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-black"></div>
          </div>

          <h3 className="font-bold text-[22px] text-white leading-tight ml-2 tracking-wide">
            {partnerName}
          </h3>
        </div>

        <div className="flex items-center gap-5 pr-2">
          {/* Call Actions */}
          <button 
            onClick={() => startCall('audio')}
            className="text-white flex items-center justify-center cursor-pointer"
          >
            <span className="material-symbols-outlined text-[28px]" style={{fontVariationSettings: "'FILL' 1"}}>call</span>
          </button>
          <button 
            onClick={() => startCall('video')}
            className="text-white flex items-center justify-center cursor-pointer"
          >
            <span className="material-symbols-outlined text-[32px]" style={{fontVariationSettings: "'FILL' 1"}}>videocam</span>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-grow overflow-y-auto space-y-4 flex flex-col bg-black pb-4 scrollbar-thin scrollbar-thumb-[#333] scrollbar-track-transparent">
        {loading ? (
          <div className="flex-grow flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#f23c57] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center pt-8">
            <p className="text-[11px] font-bold text-[#666] tracking-widest uppercase">AUJOURD'HUI</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            
            return (
              <div key={msg.id} className="w-full flex flex-col mb-1 group">
                
                {/* Time header above groups of messages (Simplified logic here) */}
                {msg.id === messages[0]?.id && (
                  <div className="text-center my-6">
                    <span className="text-[11px] font-bold text-[#666] tracking-widest uppercase">AUJOURD'HUI</span>
                  </div>
                )}

                {isMe ? (
                  /* Snapchat style "Moi" Bubble */
                  <div className="flex flex-col w-full pl-2 pr-4">
                    <span className="text-[#f23c57] text-[13px] font-bold mb-1 ml-1 select-none tracking-wide">Moi</span>
                    <div className="flex w-full">
                      <div className="w-1.5 bg-[#f23c57] shrink-0 rounded-l-sm"></div>
                      <div className="bg-[#1c1c1e] text-white px-3 py-3 rounded-r-md min-h-[44px] flex-grow relative overflow-hidden">
                        
                        {msg.isPdf ? (
                           <div className="flex items-center gap-3">
                             <span className="material-symbols-outlined text-white text-[24px]">picture_as_pdf</span>
                             <div className="min-w-0">
                               <h4 className="text-[14px] font-bold text-white truncate">{msg.content}</h4>
                             </div>
                           </div>
                        ) : (msg.content === '__CALL_INITIATED_AUDIO__' || msg.content === '__CALL_INITIATED_VIDEO__') ? (
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-[20px]">
                              {msg.content === '__CALL_INITIATED_VIDEO__' ? 'videocam' : 'call'}
                            </span>
                            <span className="text-[15px] font-medium">Vous avez lancé un appel</span>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap text-[15px] leading-relaxed font-medium">{msg.content}</p>
                        )}
                        
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Snapchat style Partner Bubble */
                  <div className="flex flex-col w-full pl-2 pr-4 mt-1">
                    {/* Note: Partner name usually not shown above every message in 1on1 snap, just the line */}
                    <div className="flex w-full">
                      <div className="w-1.5 bg-[#00a6ff] shrink-0 rounded-l-sm"></div>
                      <div className="bg-[#1c1c1e] text-white px-3 py-3 rounded-r-md min-h-[44px] flex-grow relative overflow-hidden">
                        
                        {msg.isPdf ? (
                           <div className="flex items-center gap-3">
                             <span className="material-symbols-outlined text-white text-[24px]">picture_as_pdf</span>
                             <div className="min-w-0">
                               <h4 className="text-[14px] font-bold text-white truncate">{msg.content}</h4>
                             </div>
                           </div>
                        ) : (msg.content === '__CALL_INITIATED_AUDIO__' || msg.content === '__CALL_INITIATED_VIDEO__') ? (
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-[20px]">
                              {msg.content === '__CALL_INITIATED_VIDEO__' ? 'videocam' : 'call'}
                            </span>
                            <span className="text-[15px] font-medium">Appel manqué</span>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap text-[15px] leading-relaxed font-medium">{msg.content}</p>
                        )}
                        
                      </div>
                    </div>
                  </div>
                )}

                    {/* Reactions */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="absolute -bottom-3 right-3 flex items-center gap-0.5 bg-[#1c1c1e] rounded-full px-2 py-0.5 text-[14px] select-none border border-black">
                        {msg.reactions.map((emoji, idx) => (
                          <span key={idx}>{emoji}</span>
                        ))}
                      </div>
                    )}
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area (Snapchat Style) */}
      <div className="px-3 pb-8 pt-3 bg-black flex items-center gap-3 shrink-0 select-none border-t border-[#111]">
        
        {/* Camera Button */}
        <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0 cursor-pointer shadow-[0_0_8px_rgba(255,255,255,0.1)]">
          <span className="material-symbols-outlined text-black text-[22px] font-bold" style={{fontVariationSettings: "'FILL' 1"}}>photo_camera</span>
        </button>

        {/* Input Pill */}
        <form onSubmit={sendMessage} className="flex-grow flex items-center bg-transparent border border-[#444] rounded-full px-4 py-1.5 min-h-[42px] focus-within:border-[#666] transition-colors relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e);
              }
            }}
            placeholder="Chat"
            className="w-full bg-transparent border-none outline-none resize-none text-white placeholder:text-[#666] text-[17px] min-h-[24px] pt-1 pb-0 scrollbar-none font-medium"
            rows={1}
            maxLength={1000}
          />
          {input.length === 0 ? (
            <button type="button" className="shrink-0 text-[#ccc] hover:text-white transition-colors cursor-pointer pl-2">
              <span className="material-symbols-outlined text-[26px]">mic</span>
            </button>
          ) : (
            <button type="submit" className="shrink-0 text-[#f23c57] hover:text-[#ff0050] transition-colors cursor-pointer pl-2 font-bold text-[15px]">
              Envoyer
            </button>
          )}
        </form>

        {/* Right Icons */}
        <div className="flex items-center gap-3 shrink-0 pb-0.5">
          <div className="relative">
            <button 
              type="button" 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="text-white hover:text-[#ccc] transition-colors flex items-center justify-center cursor-pointer"
            >
              <span className="material-symbols-outlined text-[28px]" style={{fontVariationSettings: "'FILL' 0, 'wght' 300"}}>sentiment_satisfied</span>
            </button>
            
            {showEmojiPicker && (
              <div className="absolute bottom-12 right-0 bg-[#1c1c1e] border border-[#333] rounded-2xl p-4 shadow-2xl z-20 w-72 select-none">
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-[#333]">
                  <span className="text-[12px] font-bold text-[#888] uppercase tracking-widest">Emojis</span>
                  <button 
                    type="button" 
                    onClick={() => setShowEmojiPicker(false)}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#333] text-[#888] hover:text-white transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
                <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-[#444] scrollbar-track-transparent pr-1">
                  {POPULAR_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setInput(prev => prev + emoji)}
                      className="text-[20px] hover:bg-[#333] p-1.5 rounded-lg transition-colors text-center cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <button type="button" className="text-white hover:text-[#ccc] transition-colors flex items-center justify-center cursor-pointer">
            <span className="material-symbols-outlined text-[28px]" style={{fontVariationSettings: "'FILL' 0, 'wght' 300"}}>photo_library</span>
          </button>
          
          <button type="button" className="text-white hover:text-[#ccc] transition-colors flex items-center justify-center cursor-pointer">
            <span className="material-symbols-outlined text-[28px]" style={{fontVariationSettings: "'FILL' 0, 'wght' 300"}}>sports_esports</span>
          </button>
        </div>
      </div>
    </div>
  );
}
