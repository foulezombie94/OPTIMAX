'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

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

export default function GlobalCallListener() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  // Active Session State
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);

  // Calling States
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'calling-incoming' | 'connected'>('idle');
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [activeFilter, setActiveFilter] = useState<'none' | 'neon' | 'cyber' | 'ghost' | 'thermal'>('none');
  const [speakerOn, setSpeakerOn] = useState(true);
  const [pipCorner, setPipCorner] = useState<'top-right' | 'bottom-right' | 'bottom-left' | 'top-left'>('top-right');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Call Partner Details
  const [callPartner, setCallPartner] = useState<{
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
  } | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const partnerCanvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const pcRef = useRef<RTCPeerConnection | null>(null);
  
  const partnerChannelRef = useRef<any>(null);

  // Determine if direct conversation view is open for the calling partner
  const currentChatId = pathname?.split('/').pop() || '';
  const isDirectChatActive = pathname?.startsWith('/messages/') && currentChatId === callPartner?.id;

  // Fetch current user session details
  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUserId(session.user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, email, avatar_url')
          .eq('id', session.user.id)
          .single();
        if (profile) {
          setCurrentUserProfile({
            id: profile.id,
            displayName: profile.username || session.user.email?.split('@')[0] || 'Me',
            username: profile.username || session.user.email?.split('@')[0] || 'me',
            avatarUrl: profile.avatar_url || undefined
          });
        }
      }
    };
    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUserId(session.user.id);
        fetchSession();
      } else {
        setCurrentUserId(null);
        setCurrentUserProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Dispatch custom status events for sidebar syncing
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('global-call-status-changed', {
      detail: {
        callStatus,
        partnerId: callPartner?.id || null
      }
    }));
  }, [callStatus, callPartner]);

  // Reply to layout request events
  useEffect(() => {
    const handleRequest = () => {
      window.dispatchEvent(new CustomEvent('global-call-status-changed', {
        detail: {
          callStatus,
          partnerId: callPartner?.id || null
        }
      }));
    };
    window.addEventListener('request-global-call-status', handleRequest);
    return () => {
      window.removeEventListener('request-global-call-status', handleRequest);
    };
  }, [callStatus, callPartner]);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!partnerCanvasRef.current) return;
    const rect = partnerCanvasRef.current.getBoundingClientRect();
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      active: true
    };
  };

  const handleCanvasMouseLeave = () => {
    mouseRef.current.active = false;
  };

  // Sound generator
  const playBeep = (freq: number, type: 'sine' | 'square' | 'triangle' | 'sawtooth', duration: number) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = type;
      osc.frequency.value = freq;
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.02);
      gainNode.gain.setValueAtTime(0.08, ctx.currentTime + duration - 0.05);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start();
      setTimeout(() => {
        osc.stop();
        ctx.close();
      }, duration * 1000 + 100);
    } catch (e) {
      console.warn("Audio Context failed", e);
    }
  };

  const playRingTone = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc1.frequency.value = 440;
      osc2.frequency.value = 480;
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime + 1.2);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.4);
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc1.start();
      osc2.start();
      
      setTimeout(() => {
        osc1.stop();
        osc2.stop();
        ctx.close();
      }, 2000);
    } catch (e) {
      console.warn("Audio Context failed", e);
    }
  };

  // Ringtone loop
  useEffect(() => {
    if (callStatus !== 'calling' && callStatus !== 'calling-incoming') return;
    playRingTone();
    const interval = setInterval(() => {
      playRingTone();
    }, 3000);
    return () => clearInterval(interval);
  }, [callStatus]);

  // WebRTC Peer Connection Helper
  const createPeerConnection = (stream: MediaStream) => {
    if (pcRef.current) {
      pcRef.current.close();
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && partnerChannelRef.current) {
        partnerChannelRef.current.send({
          type: 'broadcast',
          event: 'webrtc-ice',
          payload: { candidate: event.candidate }
        });
      }
    };

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      const remoteVideo = document.getElementById('remoteVideo') as HTMLVideoElement;
      if (remoteVideo) {
        remoteVideo.srcObject = remoteStream;
      }
    };

    pcRef.current = pc;
    return pc;
  };

  const initiateWebRTC = async () => {
    let stream = localStream;
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: callType === 'video', audio: true });
        setLocalStream(stream);
      } catch (e) {
        console.error("Could not obtain user media", e);
        return;
      }
    }

    const pc = createPeerConnection(stream);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    if (partnerChannelRef.current) {
      partnerChannelRef.current.send({
        type: 'broadcast',
        event: 'webrtc-offer',
        payload: { sdp: offer }
      });
    }
  };

  const handleOffer = async (sdp: RTCSessionDescriptionInit) => {
    setCallStatus('connected');
    playBeep(660, 'sine', 0.15);

    let stream = localStream;
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: callType === 'video', audio: true });
        setLocalStream(stream);
      } catch (e) {
        console.error("Could not obtain user media", e);
        return;
      }
    }

    const pc = createPeerConnection(stream);
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    if (partnerChannelRef.current) {
      partnerChannelRef.current.send({
        type: 'broadcast',
        event: 'webrtc-answer',
        payload: { sdp: answer }
      });
    }
  };

  const handleAnswer = async (sdp: RTCSessionDescriptionInit) => {
    if (pcRef.current) {
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
    }
  };

  // Permanent signaling listener
  useEffect(() => {
    if (!currentUserId) return;

    let active = true;
    let myChannel: any = null;
    const channelName = `user_calls_${currentUserId}`;

    const setupChannel = async () => {
      const existing = supabase.channel(channelName);
      await supabase.removeChannel(existing);

      if (!active) return;

      myChannel = supabase.channel(channelName);
      myChannel
        .on('broadcast', { event: 'call-initiated' }, async ({ payload }: { payload: any }) => {
          if (callStatus !== 'idle') {
            const busyChannelName = `user_calls_${payload.callerId}`;
            const existingBusy = supabase.channel(busyChannelName);
            await supabase.removeChannel(existingBusy);
            const busyChannel = supabase.channel(busyChannelName);
            busyChannel.subscribe((status) => {
              if (status === 'SUBSCRIBED') {
                busyChannel.send({
                  type: 'broadcast',
                  event: 'call-declined',
                  payload: { senderId: currentUserId }
                });
                setTimeout(() => {
                  supabase.removeChannel(busyChannel);
                }, 1000);
              }
            });
            return;
          }

          setCallPartner({
            id: payload.callerId,
            displayName: payload.callerName,
            username: payload.callerUsername,
            avatarUrl: payload.callerAvatarUrl
          });
          setCallType(payload.callType);
          setCallStatus('calling-incoming');

          if (partnerChannelRef.current) {
            await supabase.removeChannel(partnerChannelRef.current);
          }
          const pChannelName = `user_calls_${payload.callerId}`;
          const existingPartner = supabase.channel(pChannelName);
          await supabase.removeChannel(existingPartner);

          const pChannel = supabase.channel(pChannelName);
          partnerChannelRef.current = pChannel;
          pChannel.subscribe();
        })
        .on('broadcast', { event: 'call-accepted' }, async () => {
          setCallStatus('connected');
          playBeep(660, 'sine', 0.15);
          await initiateWebRTC();
        })
        .on('broadcast', { event: 'call-declined' }, () => {
          endCallLocally();
        })
        .on('broadcast', { event: 'call-canceled' }, () => {
          endCallLocally();
        })
        .on('broadcast', { event: 'webrtc-offer' }, async ({ payload }: { payload: any }) => {
          await handleOffer(payload.sdp);
        })
        .on('broadcast', { event: 'webrtc-answer' }, async ({ payload }: { payload: any }) => {
          await handleAnswer(payload.sdp);
        })
        .on('broadcast', { event: 'webrtc-ice' }, async ({ payload }: { payload: any }) => {
          if (pcRef.current) {
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (e) {
              console.error("Error adding ICE candidate", e);
            }
          }
        })
        .subscribe();
    };

    setupChannel();

    return () => {
      active = false;
      if (myChannel) {
        supabase.removeChannel(myChannel);
      }
    };
  }, [currentUserId, callStatus, localStream, callType]);

  // Hook to start a call via Custom Event from ChatWindow
  useEffect(() => {
    const handleStartCall = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { partnerId, partnerName, partnerUsername, partnerAvatarUrl, type } = customEvent.detail;
      const partnerObj = {
        id: partnerId,
        displayName: partnerName,
        username: partnerUsername,
        avatarUrl: partnerAvatarUrl
      };
      setCallPartner(partnerObj);
      startCall(type, partnerObj);
    };

    window.addEventListener('start-global-call', handleStartCall);
    return () => {
      window.removeEventListener('start-global-call', handleStartCall);
    };
  }, [currentUserId, currentUserProfile]);

  const startCall = async (type: 'audio' | 'video', partner: { id: string; displayName: string; username: string; avatarUrl?: string }) => {
    setCallType(type);
    setCallStatus('calling');
    setIsMuted(false);
    setIsCamOff(false);
    setFacingMode('user');

    if (partnerChannelRef.current) {
      await supabase.removeChannel(partnerChannelRef.current);
    }

    const channelName = `user_calls_${partner.id}`;
    const existing = supabase.channel(channelName);
    await supabase.removeChannel(existing);

    const pChannel = supabase.channel(channelName);
    partnerChannelRef.current = pChannel;

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: type === 'video', audio: true });
      setLocalStream(stream);
    } catch (e) {
      console.warn("Camera access denied, using initials fallback", e);
    }

    pChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        pChannel.send({
          type: 'broadcast',
          event: 'call-initiated',
          payload: {
            callerId: currentUserId,
            callerName: currentUserProfile.displayName,
            callerUsername: currentUserProfile.username,
            callerAvatarUrl: currentUserProfile.avatarUrl,
            callType: type
          }
        });
      }
    });
  };

  const acceptCall = async () => {
    setCallStatus('connected');
    playBeep(660, 'sine', 0.15);

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: callType === 'video', audio: true });
      setLocalStream(stream);
    } catch (e) {
      console.warn("Camera access denied, using initials fallback", e);
    }

    if (partnerChannelRef.current) {
      partnerChannelRef.current.send({
        type: 'broadcast',
        event: 'call-accepted',
        payload: { senderId: currentUserId }
      });
    }

    // Redirect to partner discussion page if not already there
    if (!pathname?.startsWith('/messages/') || currentChatId !== callPartner?.id) {
      router.push(`/messages/${callPartner?.id}`);
    }
  };

  const declineCall = () => {
    if (partnerChannelRef.current) {
      partnerChannelRef.current.send({
        type: 'broadcast',
        event: 'call-declined',
        payload: { senderId: currentUserId }
      });
    }
    endCallLocally();
  };

  const endCall = () => {
    if (partnerChannelRef.current) {
      partnerChannelRef.current.send({
        type: 'broadcast',
        event: callStatus === 'calling' ? 'call-canceled' : 'call-declined',
        payload: { senderId: currentUserId }
      });
    }
    endCallLocally();
  };

  const endCallLocally = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    const remoteVideo = document.getElementById('remoteVideo') as HTMLVideoElement;
    if (remoteVideo) {
      remoteVideo.srcObject = null;
    }
    if (partnerChannelRef.current) {
      supabase.removeChannel(partnerChannelRef.current);
      partnerChannelRef.current = null;
    }
    setCallStatus('idle');
    setCallPartner(null);
    playBeep(220, 'sine', 0.25);
  };

  const toggleCam = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCamOff(!videoTrack.enabled);
      }
    } else {
      setIsCamOff(!isCamOff);
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    } else {
      setIsMuted(!isMuted);
    }
  };

  const flipCamera = async () => {
    if (!localStream || !callPartner) return;
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);

    localStream.getTracks().forEach(track => track.stop());

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextMode },
        audio: true
      });
      setLocalStream(stream);
      playBeep(480, 'sine', 0.1);
    } catch (e) {
      console.warn("Failed to flip camera, reverting", e);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      setFacingMode('user');
    }
  };

  const cyclePipCorner = () => {
    const corners: Array<'top-right' | 'bottom-right' | 'bottom-left' | 'top-left'> = [
      'top-right', 'bottom-right', 'bottom-left', 'top-left'
    ];
    const nextIndex = (corners.indexOf(pipCorner) + 1) % corners.length;
    setPipCorner(corners[nextIndex]);
    playBeep(520, 'sine', 0.05);
  };

  // Bind local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callStatus]);

  // Clean up
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (pcRef.current) {
        pcRef.current.close();
      }
      if (partnerChannelRef.current) {
        supabase.removeChannel(partnerChannelRef.current);
      }
    };
  }, [localStream]);

  // Particles canvas visualizer loop
  useEffect(() => {
    if ((callStatus !== 'connected' && callStatus !== 'calling-incoming') || !callPartner) return;
    // Only paint canvas if either connected, or direct chat active (ringing state)
    if (callStatus === 'calling-incoming' && !isDirectChatActive) return;

    const canvas = partnerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles: Array<{ x: number; y: number; r: number; dx: number; dy: number; color: string }> = [];
    for (let i = 0; i < 45; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 4 + 2.5,
        dx: (Math.random() - 0.5) * 1.6,
        dy: (Math.random() - 0.5) * 1.6,
        color: `rgba(${Math.floor(Math.random() * 120 + 80)}, ${Math.floor(Math.random() * 120 + 80)}, 255, ${Math.random() * 0.4 + 0.25})`
      });
    }

    let time = 0;
    const draw = () => {
      if (!ctx || !canvas) return;
      ctx.fillStyle = '#0b0c10';
      ctx.fillRect(0, 0, width, height);

      const remoteVideo = document.getElementById('remoteVideo') as HTMLVideoElement;
      let streamDrawn = false;
      if (callStatus === 'connected' && remoteVideo && !remoteVideo.paused && remoteVideo.srcObject) {
        ctx.drawImage(remoteVideo, 0, 0, width, height);
        streamDrawn = true;
      }

      if (!streamDrawn) {
        const grad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, Math.max(width, height) / 1.4);
        grad.addColorStop(0, 'rgba(15, 23, 42, 0.45)');
        grad.addColorStop(1, 'rgba(11, 12, 16, 1)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      time += 0.02;
      const waveAmplitude = isMuted ? 1.5 : 45;
      
      ctx.beginPath();
      ctx.strokeStyle = isMuted ? 'rgba(239, 68, 68, 0.25)' : 'rgba(59, 130, 246, 0.3)';
      ctx.lineWidth = isMuted ? 1.5 : 2.5;
      for (let x = 0; x < width; x++) {
        const y = height / 2 + Math.sin(x * 0.005 + time) * waveAmplitude * Math.cos(x * 0.002 + time * 0.5);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.beginPath();
      ctx.strokeStyle = isMuted ? 'rgba(239, 68, 68, 0.15)' : 'rgba(139, 92, 246, 0.2)';
      ctx.lineWidth = 1.5;
      for (let x = 0; x < width; x++) {
        const y = height / 2 + Math.cos(x * 0.007 - time) * (waveAmplitude * 0.7) * Math.sin(x * 0.003 - time * 0.7);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      particles.forEach(p => {
        if (mouseRef.current.active) {
          const dx = mouseRef.current.x - p.x;
          const dy = mouseRef.current.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const force = (120 - dist) / 120;
            p.x -= (dx / dist) * force * 2.5;
            p.y -= (dy / dist) * force * 2.5;
          }
        }

        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0 || p.x > width) p.dx = -p.dx;
        if (p.y < 0 || p.y > height) p.dy = -p.dy;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });

      if (!streamDrawn) {
        ctx.save();
        const circleX = width / 2;
        const circleY = height / 2;
        
        ctx.beginPath();
        ctx.arc(circleX, circleY, 70, 0, Math.PI * 2);
        ctx.strokeStyle = isMuted ? 'rgba(239, 68, 68, 0.25)' : 'rgba(59, 130, 246, 0.35)';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(circleX, circleY, 60, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fill();
        ctx.strokeStyle = isMuted ? 'rgba(239, 68, 68, 0.5)' : 'rgba(59, 130, 246, 0.65)';
        ctx.stroke();

        ctx.font = 'bold 36px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(getInitials(callPartner.displayName), circleX, circleY);
        
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = isMuted ? '#ef4444' : '#10b981';
        ctx.fillText(isMuted ? 'MICROPHONE COUPÉ' : 'FLUX EN DIRECT', circleX, circleY + 88);
        
        ctx.restore();
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [callStatus, callPartner, isMuted, isDirectChatActive]);

  // Determine if we should show the full screen overlay or a popup notification
  // Full overlay is visible:
  // - If call is connected
  // - If call is outgoing ('calling')
  // - If call is incoming ('calling-incoming') AND the user is already inside the direct chat page with the caller
  const showFullCallOverlay = 
    callStatus === 'connected' ||
    callStatus === 'calling' ||
    (callStatus === 'calling-incoming' && isDirectChatActive);

  // Show floating notification popup:
  // - If call is incoming ('calling-incoming') AND the user is NOT inside the direct chat page with the caller
  const showIncomingCallPopup = callStatus === 'calling-incoming' && !isDirectChatActive && callPartner;

  if (callStatus === 'idle') return null;

  return (
    <>
      {/* 1. Global Call Overlay (Connected, Outgoing, or Active Chat Incoming) */}
      {showFullCallOverlay && callPartner && (
        <div className="fixed inset-0 bg-[#0b0c10] z-[9999] flex flex-col justify-between text-white select-none animate-fade-in font-sans">
          
          {/* Ringing / Calling View */}
          {(callStatus === 'calling' || callStatus === 'calling-incoming') ? (
            <div className="flex-grow flex flex-col items-center justify-center relative">
              <div className="relative w-36 h-36 flex items-center justify-center mb-8">
                <div className="absolute inset-0 bg-blue-500/10 rounded-full animate-ping duration-[1800ms]"></div>
                <div className="absolute inset-2 bg-indigo-500/15 rounded-full animate-pulse"></div>
                {callPartner.avatarUrl ? (
                  <img
                    src={callPartner.avatarUrl}
                    alt={callPartner.displayName}
                    className="w-24 h-24 rounded-full object-cover border-2 border-white/20 relative z-10 shadow-2xl"
                  />
                ) : (
                  <div className={`w-24 h-24 rounded-full bg-gradient-to-tr ${getAvatarColor(callPartner.displayName)} flex items-center justify-center font-bold text-[32px] border-2 border-white/20 relative z-10 shadow-2xl`}>
                    {getInitials(callPartner.displayName)}
                  </div>
                )}
              </div>
              
              <h2 className="text-2xl font-black tracking-tight mb-2 text-white/95">{callPartner.displayName}</h2>
              <p className="text-[12px] text-blue-400 font-mono tracking-widest uppercase animate-pulse">
                {callStatus === 'calling-incoming' 
                  ? (callType === 'video' ? 'Appel vidéo entrant...' : 'Appel vocal entrant...')
                  : (callType === 'video' ? 'Appel vidéo sortant...' : 'Appel vocal sortant...')
                }
              </p>
            </div>
          ) : (
            // Connected view
            <div className="flex-grow w-full h-full relative overflow-hidden">
              <canvas 
                ref={partnerCanvasRef} 
                onMouseMove={handleCanvasMouseMove}
                onMouseLeave={handleCanvasMouseLeave}
                className="absolute inset-0 w-full h-full object-cover cursor-crosshair"
              />
              <video id="remoteVideo" autoPlay playsInline className="hidden" />

              {/* Snapchat-style PiP window */}
              {callType === 'video' && (
                <div 
                  onClick={cyclePipCorner}
                  className={`absolute w-32 h-44 rounded-3xl overflow-hidden border-2 border-white/20 shadow-2xl z-20 bg-black transition-all duration-500 ease-in-out cursor-pointer hover:scale-[1.03] active:scale-95 ${
                    pipCorner === 'top-right' ? 'top-4 right-4' :
                    pipCorner === 'bottom-right' ? 'bottom-28 right-4' :
                    pipCorner === 'bottom-left' ? 'bottom-28 left-4' : 'top-4 left-4'
                  }`}
                  title="Cliquez pour déplacer la caméra"
                >
                  {!isCamOff ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover transition-all duration-300 ${
                        activeFilter === 'neon' ? 'filter saturate-200 hue-rotate(180deg) brightness(1.1) contrast(1.2)' :
                        activeFilter === 'cyber' ? 'filter grayscale(0.5) sepia(0.5) hue-rotate(80deg) saturate(300%) contrast(1.4) brightness(0.95)' :
                        activeFilter === 'thermal' ? 'filter saturate(5) hue-rotate(250deg) invert(0.2) contrast(1.8)' :
                        activeFilter === 'ghost' ? 'filter invert(1) hue-rotate(180deg) saturate(1.5) contrast(1.3)' : ''
                      }`}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 gap-2">
                      <span className="material-symbols-outlined text-[24px] text-slate-500">videocam_off</span>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Cam OFF</span>
                    </div>
                  )}
                  {activeFilter !== 'none' && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[8px] font-black tracking-wider text-blue-400 font-mono uppercase border border-white/5 whitespace-nowrap">
                      {activeFilter}
                    </div>
                  )}
                </div>
              )}

              {/* Call Details Overlay */}
              <div className="absolute top-4 left-4 flex items-center gap-3 bg-black/50 backdrop-blur-lg px-4 py-2.5 rounded-2xl border border-white/10 z-20 shadow-lg select-none">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
                <div>
                  <h4 className="text-[13px] font-bold text-white/95 leading-none mb-1">{callPartner.displayName}</h4>
                  <p className="text-[9px] text-slate-400 font-mono uppercase tracking-wider leading-none">
                    {callType === 'video' ? 'Vidéo en direct' : 'Audio en direct'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Controls Bar */}
          <div className="w-full bg-gradient-to-t from-black via-black/85 to-transparent z-20 relative flex flex-col items-center py-6 gap-6">
            
            {/* Snapchat lens filters (Connected Video Call only) */}
            {callStatus === 'connected' && callType === 'video' && (
              <div className="w-full px-8">
                <div className="flex items-center justify-center gap-4 overflow-x-auto pb-1 scrollbar-none max-w-sm mx-auto">
                  <button 
                    onClick={() => { setActiveFilter('none'); playBeep(520, 'sine', 0.05); }}
                    className={`flex flex-col items-center shrink-0 gap-1.5 transition-all cursor-pointer ${
                      activeFilter === 'none' ? 'scale-105 opacity-100' : 'scale-90 opacity-60 hover:opacity-85'
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center border-2 shadow-md ${
                      activeFilter === 'none' ? 'bg-white/20 border-white shadow-[0_0_12px_rgba(255,255,255,0.2)]' : 'bg-white/5 border-white/10'
                    }`}>
                      <span className="material-symbols-outlined text-[18px]">face</span>
                    </div>
                    <span className="text-[9px] font-bold tracking-wide">Normal</span>
                  </button>

                  <button 
                    onClick={() => { setActiveFilter('neon'); playBeep(560, 'sine', 0.05); }}
                    className={`flex flex-col items-center shrink-0 gap-1.5 transition-all cursor-pointer ${
                      activeFilter === 'neon' ? 'scale-105 opacity-100' : 'scale-90 opacity-60 hover:opacity-85'
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center border-2 shadow-md ${
                      activeFilter === 'neon' ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.3)]' : 'bg-white/5 border-white/10'
                    }`}>
                      <span className="material-symbols-outlined text-[18px] text-cyan-400">blur_on</span>
                    </div>
                    <span className="text-[9px] font-bold tracking-wide">Néon</span>
                  </button>

                  <button 
                    onClick={() => { setActiveFilter('cyber'); playBeep(600, 'sine', 0.05); }}
                    className={`flex flex-col items-center shrink-0 gap-1.5 transition-all cursor-pointer ${
                      activeFilter === 'cyber' ? 'scale-105 opacity-100' : 'scale-90 opacity-60 hover:opacity-85'
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center border-2 shadow-md ${
                      activeFilter === 'cyber' ? 'bg-emerald-500/20 border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.3)]' : 'bg-white/5 border-white/10'
                    }`}>
                      <span className="material-symbols-outlined text-[18px] text-emerald-400">grid_view</span>
                    </div>
                    <span className="text-[9px] font-bold tracking-wide">Matrix</span>
                  </button>

                  <button 
                    onClick={() => { setActiveFilter('thermal'); playBeep(640, 'sine', 0.05); }}
                    className={`flex flex-col items-center shrink-0 gap-1.5 transition-all cursor-pointer ${
                      activeFilter === 'thermal' ? 'scale-105 opacity-100' : 'scale-90 opacity-60 hover:opacity-85'
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center border-2 shadow-md ${
                      activeFilter === 'thermal' ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.3)]' : 'bg-white/5 border-white/10'
                    }`}>
                      <span className="material-symbols-outlined text-[18px] text-amber-400">thermostat</span>
                    </div>
                    <span className="text-[9px] font-bold tracking-wide">Thermique</span>
                  </button>

                  <button 
                    onClick={() => { setActiveFilter('ghost'); playBeep(680, 'sine', 0.05); }}
                    className={`flex flex-col items-center shrink-0 gap-1.5 transition-all cursor-pointer ${
                      activeFilter === 'ghost' ? 'scale-105 opacity-100' : 'scale-90 opacity-60 hover:opacity-85'
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center border-2 shadow-md ${
                      activeFilter === 'ghost' ? 'bg-purple-500/20 border-purple-400 shadow-[0_0_12px_rgba(192,132,252,0.3)]' : 'bg-white/5 border-white/10'
                    }`}>
                      <span className="material-symbols-outlined text-[18px] text-purple-400">psychology</span>
                    </div>
                    <span className="text-[9px] font-bold tracking-wide">Spectre</span>
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            {callStatus === 'calling-incoming' ? (
              /* Incoming Controls */
              <div className="flex items-center justify-center gap-12 w-full max-w-xs py-4">
                <div className="flex flex-col items-center gap-2">
                  <button 
                    onClick={declineCall}
                    className="w-14 h-14 bg-red-600 hover:bg-red-700 hover:scale-105 active:scale-95 text-white rounded-full flex items-center justify-center transition-all cursor-pointer shadow-[0_4px_14px_rgba(239,68,68,0.4)] border border-red-500/20"
                  >
                    <span className="material-symbols-outlined text-[24px]">call_end</span>
                  </button>
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Décliner</span>
                </div>
                
                <div className="flex flex-col items-center gap-2">
                  <button 
                    onClick={acceptCall}
                    className="w-14 h-14 bg-emerald-500 hover:bg-emerald-600 hover:scale-105 active:scale-95 text-white rounded-full flex items-center justify-center transition-all cursor-pointer shadow-[0_4px_14px_rgba(16,185,129,0.4)] border border-emerald-400/20"
                  >
                    <span className="material-symbols-outlined text-[24px]">call</span>
                  </button>
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Accepter</span>
                </div>
              </div>
            ) : (
              /* Outgoing or Active Connected Controls */
              <div className="flex items-center justify-center gap-6 w-full max-w-xs">
                <button 
                  onClick={toggleMute}
                  className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-md ${
                    isMuted 
                      ? 'bg-red-500/25 border-red-500/40 text-red-400 hover:bg-red-500/35' 
                      : 'bg-white/10 border-white/15 text-white hover:bg-white/15'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{isMuted ? 'mic_off' : 'mic'}</span>
                </button>

                <button 
                  onClick={endCall}
                  className="w-16 h-16 bg-red-600 hover:bg-red-700 hover:scale-105 active:scale-95 text-white rounded-full flex items-center justify-center transition-all cursor-pointer shadow-[0_0_25px_rgba(239,68,68,0.55)] border border-red-500/30"
                >
                  <span className="material-symbols-outlined text-[28px] font-bold">call_end</span>
                </button>

                {callType === 'video' ? (
                  <div className="flex gap-4">
                    <button 
                      onClick={toggleCam}
                      className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-md ${
                        isCamOff 
                          ? 'bg-red-500/25 border-red-500/40 text-red-400 hover:bg-red-500/35' 
                          : 'bg-white/10 border-white/15 text-white hover:bg-white/15'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">{isCamOff ? 'videocam_off' : 'videocam'}</span>
                    </button>

                    {callStatus === 'connected' && !isCamOff && (
                      <button 
                        onClick={flipCamera}
                        className="w-12 h-12 rounded-full border bg-white/10 border-white/15 text-white hover:bg-white/15 flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-md"
                      >
                        <span className="material-symbols-outlined text-[20px]">flip_camera_ios</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <button 
                    onClick={() => { setSpeakerOn(!speakerOn); playBeep(580, 'sine', 0.05); }}
                    className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-md ${
                      !speakerOn 
                        ? 'bg-amber-500/25 border-amber-500/40 text-amber-400 hover:bg-amber-500/35' 
                        : 'bg-white/10 border-white/15 text-white hover:bg-white/15'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{speakerOn ? 'volume_up' : 'volume_down'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Global Glassmorphic Incoming Call Toast Notification (Out-of-Chat View) */}
      {showIncomingCallPopup && (
        <div className="fixed top-6 right-6 z-[10000] w-80 bg-slate-950/85 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl text-white flex flex-col gap-3 animate-slide-in select-none font-sans">
          
          <div className="flex items-center gap-3">
            {/* Pulsing ring around caller avatar */}
            <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
              <span className="absolute inset-0 bg-blue-500/25 rounded-full animate-ping"></span>
              {callPartner.avatarUrl ? (
                <img
                  src={callPartner.avatarUrl}
                  alt={callPartner.displayName}
                  className="w-10 h-10 rounded-full object-cover border border-white/10 relative z-10"
                />
              ) : (
                <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${getAvatarColor(callPartner.displayName)} flex items-center justify-center font-bold text-[14px] border border-white/10 relative z-10`}>
                  {getInitials(callPartner.displayName)}
                </div>
              )}
            </div>
            
            <div className="flex-grow min-w-0">
              <h4 className="text-[14px] font-black tracking-tight text-white/95 truncate">
                {callPartner.displayName}
              </h4>
              <p className="text-[11px] text-blue-400 font-semibold flex items-center gap-1 mt-0.5">
                <span className="material-symbols-outlined text-[13px] animate-bounce">
                  {callType === 'video' ? 'videocam' : 'call'}
                </span>
                <span>
                  {callType === 'video' ? 'Appel vidéo...' : 'Appel audio...'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-white/5 pt-2.5">
            <button 
              onClick={declineCall}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[11px] font-bold tracking-wider uppercase transition-colors cursor-pointer flex items-center gap-1 shadow-md shadow-red-600/15"
            >
              <span className="material-symbols-outlined text-[13px]">call_end</span>
              Décliner
            </button>
            <button 
              onClick={acceptCall}
              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-bold tracking-wider uppercase transition-colors cursor-pointer flex items-center gap-1 shadow-md shadow-emerald-500/15"
            >
              <span className="material-symbols-outlined text-[13px]">call</span>
              Répondre
            </button>
          </div>
          
        </div>
      )}
    </>
  );
}
