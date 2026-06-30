'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CustomVideoPlayer from './CustomVideoPlayer';

// Simulation de GIFs pour le prototype (Évite les erreurs 403 d'API)
const MOCK_GIFS = [
  "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif",
  "https://media.giphy.com/media/11ISwbgCxEzMyY/giphy.gif",
  "https://media.giphy.com/media/3oKIPa2TdahYIGany8/giphy.gif",
  "https://media.giphy.com/media/26AHONQ79FdWZhAI0/giphy.gif",
  "https://media.giphy.com/media/xT0xezQGU5xCDJuCPe/giphy.gif",
  "https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif",
  "https://media.giphy.com/media/l0HlOBZcl7mbj5I6s/giphy.gif",
  "https://media.giphy.com/media/26gskj8FpG7T0hM9G/giphy.gif"
];

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
  raw_date: string;
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

const formatDateHeader = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === now.toDateString()) {
    return "AUJOURD'HUI";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "HIER";
  } else {
    // e.g. "7 JUIN, 2023"
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('fr-FR', options).toUpperCase();
  }
};

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const AudioMessageBubble = ({ content, isMe }: { content: string, isMe: boolean }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Parse __AUDIO__|duration|base64|transcript
  const parts = content.split(':');
  let duration = parseInt(parts[1], 10) || 0;
  let parsedBase64 = '';
  let parsedTranscript = '';

  if (content.startsWith('__AUDIO__|')) {
     const split = content.split('|');
     duration = parseInt(split[1], 10) || 0;
     parsedBase64 = split[2] || '';
     parsedTranscript = split[3] || '';
  }

  const togglePlay = async () => {
     if (!parsedBase64 || !audioRef.current) return;
     try {
       if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
       } else {
          await audioRef.current.play();
          setIsPlaying(true);
       }
     } catch (err) {
       console.error("Audio playback error:", err);
       setIsPlaying(false);
     }
  };

  const handleTimeUpdate = () => {
     if (audioRef.current) {
        const current = audioRef.current.currentTime;
        const total = audioRef.current.duration || duration || 1;
        setProgress(current / total);
     }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = () => {
         setIsPlaying(false);
         setProgress(0);
         if (audioRef.current) audioRef.current.currentTime = 0;
      };
    }
  }, []);

  // Determinist waveform heights for 30 bars
  const waveformHeights = [30, 50, 80, 40, 100, 60, 40, 90, 70, 50, 70, 30, 50, 80, 40, 60, 90, 30, 50, 100, 40, 70, 80, 50, 90, 40, 60, 30, 80, 50];

  return (
    <div className={`flex flex-col w-full min-w-[280px] p-3 rounded-2xl shadow-sm ${isMe ? 'bg-[#1c1c1e] border-l-[3px] border-[#f23c57]' : 'bg-[#1c1c1e] border-l-[3px] border-[#00a6ff]'}`}>
      <div className="flex items-center gap-3">
        <button onClick={togglePlay} className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-lg cursor-pointer ${isMe ? 'bg-[#f23c57] hover:bg-[#ff0050]' : 'bg-[#00a6ff] hover:bg-[#33b8ff]'} transition-colors`}>
          <span className="material-symbols-outlined text-white text-[28px] ml-0.5" style={{fontVariationSettings: "'FILL' 1"}}>{isPlaying ? 'pause' : 'play_arrow'}</span>
        </button>
        <div className="flex-grow flex flex-col justify-center gap-1.5">
           {/* Waveform */}
           <div className="flex items-center justify-between gap-[3px] h-7 w-full">
              {waveformHeights.map((height, i) => {
                const isPlayed = (i / waveformHeights.length) <= progress;
                const activeColor = isMe ? 'bg-[#f23c57]' : 'bg-[#00a6ff]';
                const inactiveColor = 'bg-[#444]';
                return (
                  <div 
                    key={i} 
                    className={`flex-grow max-w-[4px] rounded-full transition-colors duration-100 ${isPlayed ? activeColor : inactiveColor}`} 
                    style={{height: `${height}%`}}
                  ></div>
                );
              })}
           </div>
           <div className="flex justify-between items-center px-1">
             <span className={`text-[12px] font-mono transition-opacity duration-300 ${isPlaying ? 'opacity-0' : 'text-white/60'}`}>
                {formatDuration(duration)}
             </span>
             <div className="bg-white/10 px-1.5 py-0.5 rounded text-[9px] font-bold text-white/80 tracking-widest">1X</div>
           </div>
        </div>
      </div>
      <div className="mt-2 text-center border-t border-white/5 pt-2">
        <button onClick={() => setShowTranscript(!showTranscript)} className="text-[12px] font-bold text-[#888] hover:text-white transition-colors cursor-pointer select-none">
          {showTranscript ? "Masquer la transcription" : "Afficher la transcription"}
        </button>
        {showTranscript && (
          <div className="mt-2 p-2 bg-black/40 rounded-lg text-left">
             <p className="text-[13px] text-white/90 italic font-medium leading-relaxed">
               {parsedTranscript ? `"${parsedTranscript}"` : "Aucune transcription disponible."}
             </p>
          </div>
        )}
      </div>
      {parsedBase64 && <audio ref={audioRef} src={parsedBase64} onTimeUpdate={handleTimeUpdate} className="hidden" />}
    </div>
  );
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
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearch, setGifSearch] = useState('');

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [transcript, setTranscript] = useState("");
  
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const recordingDurationRef = useRef(0);
  const transcriptRef = useRef("");

  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        if (audioBlob.size === 0) {
           console.error("Audio blob is empty.");
           return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          const currentTranscript = transcriptRef.current;
          const duration = recordingDurationRef.current || 1; // minimum 1 second to avoid 0s audio
          sendDirectMessage(`__AUDIO__|${duration}|${base64Audio}|${currentTranscript}`);
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingDurationRef.current = 0;
      setTranscript("");
      transcriptRef.current = "";

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
           recordingDurationRef.current = prev + 1;
           return prev + 1;
        });
      }, 1000);

      // Start Transcription
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'fr-FR';
        recognition.interimResults = true;
        recognition.continuous = true;

        recognition.onresult = (event: any) => {
          let currentTrans = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTrans += event.results[i][0].transcript;
          }
          setTranscript(currentTrans);
          transcriptRef.current = currentTrans;
        };

        recognition.start();
        recognitionRef.current = recognition;
      }
    } catch (err) {
      console.error("Microphone access denied or error:", err);
      alert("Impossible d'accéder au microphone.");
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      // We stop the tracks inside the onstop callback now to ensure data is fully flushed
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore if already stopped
      }
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('messages')
      .select('id, sender_id, content, created_at')
      .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${currentUserId})`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      // Reverse so oldest is first in the chat UI
      const reversedData = [...data].reverse();
      const formatted = reversedData
        .filter((msg: any) => !msg.content.startsWith('__CALL_INITIATED_'))
        .map((msg: { id: string; sender_id: string; content: string; created_at: string }) => {
        const isPdf = msg.content.toLowerCase().endsWith('.pdf');
        return {
          id: msg.id,
          sender_id: msg.sender_id,
          content: msg.content,
          created_at: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          raw_date: msg.created_at,
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
            if (newMsg.content.startsWith('__CALL_INITIATED_')) return;
            const isPdf = newMsg.content.toLowerCase().endsWith('.pdf');
            setMessages((prev) => [...prev, {
              id: newMsg.id,
              sender_id: newMsg.sender_id,
              content: newMsg.content,
              created_at: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              raw_date: newMsg.created_at,
              isPdf,
              fileSize: isPdf ? '1.2 MB' : undefined,
            }]);

            // Automatically mark this new message as read since the chat is open
            supabase
              .from('messages')
              .update({ is_read: true, read_at: new Date().toISOString() })
              .eq('id', newMsg.id)
              .then(({ error }: { error: any }) => {
                if (error) console.error('Error marking new message as read:', error);
              });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partnerId, currentUserId, supabase, fetchMessages]);

  // Mark unread messages from this partner as read
  useEffect(() => {
    const markAsRead = async () => {
      await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('sender_id', partnerId)
        .eq('receiver_id', currentUserId)
        .eq('is_read', false);
    };
    markAsRead();
  }, [partnerId, currentUserId, supabase]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendDirectMessage = async (content: string) => {
    const now = new Date();
    const tempId = crypto.randomUUID();
    const isPdf = content.toLowerCase().endsWith('.pdf');
    const newMsg: Message = {
      id: tempId,
      sender_id: currentUserId,
      content,
      created_at: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      raw_date: now.toISOString(),
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

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const content = input.trim();
    setInput('');
    await sendDirectMessage(content);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const isVideo = file.type.startsWith('video/') || !!file.name.match(/\.(mp4|mov|avi|mkv)$/i);
      const isImage = file.type.startsWith('image/') || !!file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
      
      const tempId = crypto.randomUUID();
      const tempMsg: Message = {
        id: tempId,
        sender_id: currentUserId,
        content: `__UPLOADING__|${file.name}`,
        created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        raw_date: new Date().toISOString(),
        isPdf: false,
      };
      setMessages(prev => [...prev, tempMsg]);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUserId}-${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage
        .from('chat_attachments')
        .upload(fileName, file);

      setMessages(prev => prev.filter(m => m.id !== tempId));

      if (error) {
        console.error('Error uploading file:', error);
        alert('Erreur lors du téléversement du fichier.');
        setIsUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('chat_attachments')
        .getPublicUrl(fileName);

      let prefix = '[Fichier]';
      if (isVideo) prefix = '[Vidéo]';
      else if (isImage) prefix = '[Image]';

      await sendDirectMessage(`${prefix} ${publicUrl}`);
      setIsUploading(false);
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
            onClick={() => router.push(`/call/${partnerId}?type=audio&outgoing=true`)}
            className="text-white flex items-center justify-center cursor-pointer hover:text-[#f23c57] transition-colors bg-transparent border-none"
          >
            <span className="material-symbols-outlined text-[28px]" style={{fontVariationSettings: "'FILL' 1"}}>call</span>
          </button>
          <button 
            onClick={() => router.push(`/call/${partnerId}?type=video&outgoing=true`)}
            className="text-white flex items-center justify-center cursor-pointer hover:text-[#f23c57] transition-colors bg-transparent border-none"
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
          messages.map((msg, index) => {
            const isMe = msg.sender_id === currentUserId;
            
            let showDateHeader = false;
            if (index === 0) {
              showDateHeader = true;
            } else {
              const prevMsg = messages[index - 1];
              const currentDate = new Date(msg.raw_date).toDateString();
              const prevDate = new Date(prevMsg.raw_date).toDateString();
              if (currentDate !== prevDate) {
                showDateHeader = true;
              }
            }
            
            return (
              <div key={msg.id} className="w-full flex flex-col mb-1 group">
                
                {/* Time header above groups of messages */}
                {showDateHeader && (
                  <div className="text-center my-6">
                    <span className="text-[11px] font-bold text-[#666] tracking-widest uppercase">{formatDateHeader(msg.raw_date)}</span>
                  </div>
                )}

                {isMe ? (
                  /* Snapchat style "Moi" Bubble */
                  <div className="flex flex-col w-full pl-2 pr-4 mt-2">
                    <span className="text-[#f23c57] text-[13px] font-bold mb-1 ml-1 select-none tracking-wide">Moi</span>
                    <div className="flex w-full">
                      <div className="w-1.5 bg-[#f23c57] shrink-0 rounded-l-sm"></div>
                      <div className="bg-[#1c1c1e] text-white px-3 py-3 rounded-r-md min-h-[44px] flex-grow relative overflow-hidden">
                        
                        {msg.isPdf ? (
                           <div className="flex items-center gap-3">
                             <span className="material-symbols-outlined text-white text-[24px]">picture_as_pdf</span>
                             <div className="min-w-0">
                               <h4 className="text-[14px] font-bold text-white truncate">{msg.content.replace(/^\[.*?\] /, '')}</h4>
                             </div>
                           </div>
                        ) : msg.content.startsWith('__AUDIO__') ? (
                          <AudioMessageBubble content={msg.content} isMe={isMe} />
                        ) : msg.content.startsWith('__UPLOADING__|') ? (
                           <div className="flex flex-col gap-2.5 py-1.5 px-2 min-w-[200px]">
                             <div className="flex items-center gap-3 w-full">
                               <div className="relative flex items-center justify-center w-8 h-8 bg-[#333] rounded-full shrink-0 shadow-inner">
                                 <span className="absolute inset-0 rounded-full border-[2.5px] border-[#444]"></span>
                                 <span className="absolute inset-0 rounded-full border-[2.5px] border-t-[#f23c57] border-r-transparent border-b-transparent border-l-transparent animate-spin"></span>
                                 <span className="material-symbols-outlined text-white text-[16px]">cloud_upload</span>
                               </div>
                               <div className="flex flex-col min-w-0 flex-grow">
                                 <span className="text-[14px] font-bold text-white truncate leading-tight">{msg.content.replace('__UPLOADING__|', '')}</span>
                                 <span className="text-[11px] font-bold text-[#888] uppercase tracking-wider mt-0.5">Envoi en cours...</span>
                               </div>
                             </div>
                             <div className="w-full bg-[#333] rounded-full h-1 overflow-hidden relative shadow-inner">
                               <div 
                                 className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-[#f23c57] to-[#ff7b93] rounded-full"
                                 style={{ 
                                   width: '100%',
                                   animation: 'progressSweep 1.5s ease-in-out infinite' 
                                 }}
                               ></div>
                               <style>{`
                                 @keyframes progressSweep {
                                   0% { transform: translateX(-100%); }
                                   100% { transform: translateX(100%); }
                                 }
                               `}</style>
                             </div>
                           </div>
                        ) : msg.content.startsWith('[Vidéo] ') ? (
                           <div className="flex flex-col w-[220px] aspect-[4/5]">
                             <CustomVideoPlayer src={msg.content.replace('[Vidéo] ', '')} className="w-full h-full rounded-xl" />
                           </div>
                        ) : msg.content.startsWith('[Image] ') ? (
                           <div className="flex flex-col">
                             <img src={msg.content.replace('[Image] ', '')} alt="Attachment" className="max-w-[220px] max-h-[300px] rounded-lg object-cover" />
                           </div>
                        ) : msg.content.startsWith('[Fichier] ') ? (
                           <div className="flex items-center gap-3">
                             <span className="material-symbols-outlined text-white text-[24px]">draft</span>
                             <div className="min-w-0">
                               <h4 className="text-[14px] font-bold text-white truncate">{msg.content.replace('[Fichier] ', '')}</h4>
                             </div>
                           </div>
                        ) : (
                          <p className="whitespace-pre-wrap text-[15px] leading-relaxed font-medium">{msg.content}</p>
                        )}
                        
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Snapchat style Partner Bubble */
                  <div className="flex flex-col w-full pl-2 pr-4 mt-3">
                    <span className="text-[#00a6ff] text-[13px] font-bold mb-1 ml-1 select-none tracking-wide">
                      {msg.sender_name || partnerName}
                    </span>
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
                        ) : msg.content.startsWith('__AUDIO__') ? (
                          <AudioMessageBubble content={msg.content} isMe={isMe} />
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
        
        {/* Hidden File Inputs */}
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileUpload} 
          accept="image/*,video/*,.pdf" 
        />
        <input 
          type="file" 
          ref={cameraInputRef} 
          className="hidden" 
          onChange={handleFileUpload} 
          accept="image/*" 
          capture="environment" 
        />

        {/* Camera Button */}
        <button 
          onClick={() => cameraInputRef.current?.click()}
          className="w-10 h-10 bg-[#333] hover:bg-[#444] transition-colors rounded-full flex items-center justify-center shrink-0 cursor-pointer"
        >
          <span className="material-symbols-outlined text-white text-[22px]" style={{fontVariationSettings: "'FILL' 0, 'wght' 400"}}>photo_camera</span>
        </button>

        {/* Input Pill */}
        <form id="chat-form" onSubmit={sendMessage} className="flex-grow flex items-center bg-transparent border border-[#444] rounded-full px-4 py-1.5 min-h-[42px] focus-within:border-[#666] transition-colors relative">
          {isUploading ? (
            <div className="w-full flex items-center justify-center h-[24px] pt-1">
              <div className="w-5 h-5 border-2 border-[#f23c57] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : isRecording ? (
            <div className="w-full flex items-center justify-between px-3 text-[#f23c57] font-medium h-[24px] pt-1 gap-4">
              <div className="flex-grow flex items-center gap-[3px] h-5 overflow-hidden">
                 {/* Live recording waveform */}
                 {Array.from({length: Math.min(30, recordingDuration * 3 + 4)}).map((_, i) => {
                    const h = [30, 50, 80, 40, 100, 60, 40, 90, 70, 50, 70, 30, 50, 80, 40, 60, 90, 30, 50, 100, 40, 70, 80, 50, 90, 40, 60, 30, 80, 50];
                    return <div key={i} className="flex-grow max-w-[4px] bg-[#f23c57] rounded-full animate-pulse transition-all" style={{height: `${h[i % h.length]}%`}}></div>
                 })}
              </div>
              <span className="font-mono text-[16px] shrink-0">{formatDuration(recordingDuration)}</span>
            </div>
          ) : (
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
          )}

          {input.length === 0 ? (
            <button 
              type="button" 
              onClick={toggleRecording}
              className={`shrink-0 transition-colors cursor-pointer pl-2 ${isRecording ? 'text-[#f23c57]' : 'text-[#ccc] hover:text-white'}`}
            >
              {isRecording ? (
                /* Stop recording icon (Square) */
                <span className="material-symbols-outlined text-[28px] mr-1" style={{fontVariationSettings: "'FILL' 1"}}>stop_circle</span>
              ) : (
                /* Waveform SVG */
                <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="2" y="10" width="2.5" height="4" rx="1.25" />
                  <rect x="7" y="7" width="2.5" height="10" rx="1.25" />
                  <rect x="12" y="3" width="2.5" height="18" rx="1.25" />
                  <rect x="17" y="7" width="2.5" height="10" rx="1.25" />
                  <rect x="22" y="10" width="2.5" height="4" rx="1.25" />
                </svg>
              )}
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
              onClick={() => { setShowGifPicker(!showGifPicker); setShowEmojiPicker(false); }}
              className="text-white hover:text-[#ccc] transition-colors flex items-center justify-center cursor-pointer font-bold text-[14px] bg-[#333] hover:bg-[#444] px-2.5 py-1 rounded-md"
            >
              GIF
            </button>
            
            {showGifPicker && (
              <div className="absolute bottom-12 right-0 bg-[#1c1c1e] border border-[#333] rounded-2xl shadow-2xl z-20 w-80 h-96 flex flex-col overflow-hidden select-none">
                <div className="p-3 bg-[#222] border-b border-[#333] flex justify-between items-center">
                  <input 
                    type="text" 
                    value={gifSearch}
                    onChange={(e) => setGifSearch(e.target.value)}
                    placeholder="Rechercher un GIF..." 
                    className="flex-grow bg-[#111] border border-[#333] rounded-lg px-3 py-1.5 text-white text-[14px] outline-none focus:border-[#f23c57] transition-colors mr-2"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowGifPicker(false)}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#333] text-[#888] hover:text-white transition-colors cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
                <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-[#444] scrollbar-track-transparent bg-[#111] p-2">
                  <div className="grid grid-cols-2 gap-2">
                    {MOCK_GIFS.map((url, i) => (
                      <div 
                        key={i}
                        onClick={() => {
                          setShowGifPicker(false);
                          setInput(`[Image] ${url}`);
                          setTimeout(() => {
                             const form = document.getElementById('chat-form') as HTMLFormElement;
                             if (form) form.requestSubmit();
                          }, 50);
                        }}
                        className="cursor-pointer overflow-hidden rounded-lg border border-transparent hover:border-[#f23c57] transition-colors"
                      >
                        <img src={url} alt="GIF" className="w-full h-24 object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button 
              type="button" 
              onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGifPicker(false); }}
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
          
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className="text-white hover:text-[#ccc] transition-colors flex items-center justify-center cursor-pointer"
          >
            <span className="material-symbols-outlined text-[28px]" style={{fontVariationSettings: "'FILL' 0, 'wght' 300"}}>image</span>
          </button>
        </div>
      </div>
    </div>
  );
}
