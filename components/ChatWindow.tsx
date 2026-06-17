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
    <div className="flex flex-col h-full w-full bg-white font-sans">
      
      {/* Header */}
      <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between bg-white z-10 select-none">
        <div className="flex items-center gap-3">
          {/* Back button for mobile responsive view */}
          <Link href="/messages" className="md:hidden w-9 h-9 border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 rounded-lg flex items-center justify-center transition-colors shadow-sm mr-1 shrink-0">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </Link>

          <div className="relative w-11 h-11 shrink-0">
            {partnerAvatarUrl ? (
              <img
                src={partnerAvatarUrl}
                alt={partnerName}
                className="w-11 h-11 rounded-full object-cover border border-slate-100"
              />
            ) : (
              <div className={`w-11 h-11 rounded-full bg-gradient-to-tr ${getAvatarColor(partnerName)} flex items-center justify-center font-bold text-[14px] border border-slate-100 select-none`}>
                {getInitials(partnerName)}
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-[15px] text-slate-900 leading-tight">
                {partnerName}
              </h3>
              <div className="border border-green-200 bg-green-50 text-green-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                Online
              </div>
            </div>
            <span className="text-[12px] text-slate-400 font-medium">
              @{partnerUsername || partnerName.toLowerCase().replace(/\s+/g, '')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Snapchat-style Call Actions */}
          <button 
            onClick={() => startCall('audio')}
            className="w-9 h-9 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg flex items-center justify-center transition-colors shadow-sm cursor-pointer"
            title="Appel audio"
          >
            <span className="material-symbols-outlined text-[20px]">call</span>
          </button>
          <button 
            onClick={() => startCall('video')}
            className="w-9 h-9 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg flex items-center justify-center transition-colors shadow-sm cursor-pointer"
            title="Appel vidéo"
          >
            <span className="material-symbols-outlined text-[20px]">videocam</span>
          </button>

          <button className="h-9 px-4 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-[13px] font-semibold transition-colors shadow-sm flex items-center justify-center cursor-pointer">
            Épingle
          </button>
          <button className="h-9 px-4 bg-[#0062ff] hover:bg-blue-700 text-white rounded-lg text-[13px] font-semibold transition-colors shadow-sm flex items-center justify-center cursor-pointer">
            View profile
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-grow overflow-y-auto px-6 py-6 space-y-5 flex flex-col bg-white">
        {loading ? (
          <div className="flex-grow flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center text-slate-400">
            <span className="material-symbols-outlined text-[48px] mb-2 text-slate-300">waving_hand</span>
            <p className="text-sm font-medium">Say hello to {partnerName}!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {/* Message Header (Sender name + timestamp) */}
                <div className={`flex items-baseline mb-1 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  <span className="text-[11px] font-bold text-slate-900">
                    {isMe ? 'You' : msg.sender_name || partnerName}
                  </span>
                  <span className={`text-[10px] text-slate-400 font-medium ${isMe ? 'mr-2' : 'ml-2'}`}>
                    {msg.created_at}
                  </span>
                </div>

                <div className={`flex gap-2 items-start max-w-[85%] md:max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar for received messages */}
                  {!isMe && (
                    <div className="shrink-0 mt-0.5">
                      {partnerAvatarUrl ? (
                        <img
                          src={partnerAvatarUrl}
                          alt={partnerName}
                          className="w-8 h-8 rounded-full object-cover border border-slate-100"
                        />
                      ) : (
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${getAvatarColor(partnerName)} flex items-center justify-center font-bold text-[11px] border border-slate-100 select-none`}>
                          {getInitials(partnerName)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message Bubble content */}
                  <div className="relative">
                    {msg.isPdf ? (
                      /* PDF Attachment Card */
                      <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-4 shadow-sm w-72 md:w-80">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center border border-red-100 shrink-0">
                            <span className="text-red-500 font-bold text-[11px] uppercase tracking-wider font-sans">Pdf</span>
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-[13px] font-bold text-slate-900 truncate">
                              {msg.content}
                            </h4>
                            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                              {msg.fileSize}
                            </p>
                          </div>
                        </div>
                        <button className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 hover:bg-slate-50 rounded-lg">
                          <span className="material-symbols-outlined text-[20px]">cloud_download</span>
                        </button>
                      </div>
                    ) : (msg.content === '__CALL_INITIATED_AUDIO__' || msg.content === '__CALL_INITIATED_VIDEO__') ? (
                      /* Call Log Bubble */
                      <div 
                        className={`px-4 py-2.5 rounded-lg text-[13px] font-semibold flex items-center gap-2 select-none ${
                          isMe 
                            ? 'bg-blue-700/40 text-blue-100 border border-blue-500/20' 
                            : 'bg-slate-150 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
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
                        className={`px-4 py-2.5 rounded-lg text-[14px] leading-relaxed ${
                          isMe 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    )}

                    {/* Reactions */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="absolute -bottom-2 right-2 flex items-center gap-0.5 bg-white border border-slate-150 rounded-full px-1.5 py-0.5 shadow-sm text-[12px] select-none">
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
      <div className="p-4 bg-white border-t border-slate-100 flex-shrink-0 select-none">
        <form onSubmit={sendMessage} className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm flex flex-col focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition-colors">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e);
              }
            }}
            placeholder="Send a message"
            className="w-full bg-transparent border-none outline-none resize-none text-slate-800 placeholder:text-slate-400 text-[14px] min-h-[44px] px-2 py-1"
            rows={1}
          />
          <div className="flex justify-end items-center gap-2 mt-1">
            <div className="relative mr-auto">
              <button 
                type="button" 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-9 h-9 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-50 flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">sentiment_satisfied</span>
              </button>
              
              {showEmojiPicker && (
                <div className="absolute bottom-11 left-0 bg-white border border-slate-200 rounded-xl p-3 shadow-lg z-20 w-64 select-none">
                  <div className="flex justify-between items-center mb-2 pb-1 border-b border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Emojis</span>
                    <button 
                      type="button" 
                      onClick={() => setShowEmojiPicker(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                  <div className="grid grid-cols-8 gap-1 max-h-40 overflow-y-auto scrollbar-none">
                    {POPULAR_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setInput(prev => prev + emoji);
                        }}
                        className="text-[18px] hover:bg-slate-100 p-1 rounded-md transition-colors text-center cursor-pointer flex items-center justify-center"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button 
              type="submit" 
              className="h-9 px-5 bg-[#0062ff] hover:bg-[#0052d4] text-white rounded-lg text-[13px] font-semibold transition-colors flex items-center justify-center cursor-pointer"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
