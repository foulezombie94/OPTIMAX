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

  // Hook to listen to call initiation via Broadcast
  useEffect(() => {
    if (!currentUserId) return;
    
    console.log("[GlobalCallListener] Subscribing to Broadcast for incoming calls...");

    const channelName = `user_signal_${currentUserId}`;
    const signalChannel = supabase.channel(channelName);

    signalChannel.on('broadcast', { event: 'signal' }, async ({ payload }: { payload: any }) => {
      if (payload.type === 'invite') {
        const callerId = payload.callerId;
        const callType = payload.callType || 'video';

        const currentPath = window.location.pathname;
        const isInCallPage = currentPath.startsWith('/call/');

        if (isInCallPage) {
          // If we are already handling a call from this exact user, ignore the duplicate invite.
          if (currentPath.includes(`/call/${callerId}`)) {
             return;
          }

          // I am already in a call with someone else, reply with busy
          console.log("[GlobalCallListener] Received invite but I am busy, sending busy signal.");
          const callerChannel = supabase.channel(`user_signal_${callerId}`);
          callerChannel.subscribe((status: string) => {
             if (status === 'SUBSCRIBED') {
                setTimeout(() => {
                  callerChannel.send({
                    type: 'broadcast',
                    event: 'signal',
                    payload: { type: 'busy', responderId: currentUserId }
                  });
                  setTimeout(() => supabase.removeChannel(callerChannel), 500);
                }, 50);
             }
          });
          return;
        }

        console.log("[GlobalCallListener] Detected call invite! Redirecting...");
        router.push(`/call/${callerId}?type=${callType}&incoming=true`);
      }
    });

    signalChannel.subscribe((status: any) => {
      console.log(`[GlobalCallListener] Broadcast subscription status: ${status}`);
    });

    return () => {
      console.log("[GlobalCallListener] Cleaning up Broadcast subscription");
      supabase.removeChannel(signalChannel);
    };
  }, [currentUserId, router, supabase]);

  // We no longer render any overlay. We redirect to /call/[id]
  return null;
}
