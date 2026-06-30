'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function GlobalCallListener() {
  const router = useRouter();
  const supabase = createClient();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Fetch current user session details
  useEffect(() => {
    let isMounted = true;
    let currentIdStr = '';

    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && isMounted) {
        currentIdStr = session.user.id;
        setCurrentUserId(session.user.id);
      }
    };
    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (!isMounted) return;
      if (session?.user) {
        if (session.user.id !== currentIdStr) {
          currentIdStr = session.user.id;
          setCurrentUserId(session.user.id);
        }
      } else {
        currentIdStr = '';
        setCurrentUserId(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  // Hook to listen to call initiation trigger messages in DB
  useEffect(() => {
    if (!currentUserId) return;
    
    // Check if we are already in a call to avoid redirect loops
    const isInCallPage = window.location.pathname.startsWith('/call/');
    if (isInCallPage) return;

    console.log("[GlobalCallListener] Subscribing to DB for incoming calls...");

    const dbCallChannel = supabase
      .channel('global_incoming_calls_db')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${currentUserId}`
        },
        async (payload: any) => {
          const newMsg = payload.new as { id: string; sender_id: string; content: string; created_at: string };
          
          if (
            newMsg.content === '__CALL_INITIATED_AUDIO__' ||
            newMsg.content === '__CALL_INITIATED_VIDEO__'
          ) {
            console.log("[GlobalCallListener] Detected call trigger message in DB! Redirecting...");
            
            const callType = newMsg.content === '__CALL_INITIATED_VIDEO__' ? 'video' : 'audio';
            const partnerId = newMsg.sender_id;

            // Mark message as read since it's just a system trigger
            await supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id);

            // Redirect immediately to the dedicated incoming call page
            router.push(`/call/${partnerId}?type=${callType}&incoming=true`);
          }
        }
      )
      .subscribe((status: any) => {
        console.log(`[GlobalCallListener] DB subscription status: ${status}`);
      });

    return () => {
      console.log("[GlobalCallListener] Cleaning up DB subscription");
      supabase.removeChannel(dbCallChannel);
    };
  }, [currentUserId, router, supabase]);

  // We no longer render any overlay. We redirect to /call/[id]
  return null;
}
