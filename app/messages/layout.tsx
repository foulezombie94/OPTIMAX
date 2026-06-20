import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import MessagesLayoutClient from '@/components/MessagesLayoutClient';
import { getUserConversationsAndProfiles } from '@/app/actions/messages';

export const metadata = {
  title: 'Messages - OptiMax',
};

export default async function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch cached data via Redis Server Action
  const { latestMsgs, partners } = await getUserConversationsAndProfiles(user.id);

  // Format and sort partners
  const sortedPartners = partners.map(partner => {
    const latestMsg = latestMsgs?.find((m: any) => m.partner_id === partner.id);
    
    let snippet = 'Cliquer pour ouvrir la discussion';
    if (latestMsg) {
      if (latestMsg.content === '__CALL_INITIATED_AUDIO__') {
        snippet = '📞 Appel vocal';
      } else if (latestMsg.content === '__CALL_INITIATED_VIDEO__') {
        snippet = '📹 Appel vidéo';
      } else if (latestMsg.content.toLowerCase().endsWith('.pdf')) {
        snippet = '📄 Fichier PDF';
      } else {
        snippet = latestMsg.content;
      }
    }

    const isOpenedByPartner = latestMsg ? (latestMsg.sender_id === user.id && latestMsg.is_read) : false;
    let timeToDisplay = latestMsg ? new Date(latestMsg.created_at).getTime() : undefined;
    if (isOpenedByPartner && latestMsg && latestMsg.read_at) {
      timeToDisplay = new Date(latestMsg.read_at).getTime();
    }

    return {
      id: partner.id,
      displayName: partner.username || partner.email?.split('@')[0] || 'Unknown User',
      username: partner.username || partner.email?.split('@')[0] || 'unknown',
      avatarUrl: partner.avatar_url || undefined,
      latestMessageSnippet: snippet,
      latestMessageAt: timeToDisplay,
      isUnread: latestMsg ? (latestMsg.receiver_id === user.id && !latestMsg.is_read) : false,
      lastSenderId: latestMsg ? latestMsg.sender_id : undefined,
      isOpenedByPartner,
    };
  }).sort((a, b) => {
    const timeA = typeof a.latestMessageAt === 'number' ? a.latestMessageAt : 0;
    const timeB = typeof b.latestMessageAt === 'number' ? b.latestMessageAt : 0;
    return timeB - timeA;
  });

  return (
    <MessagesLayoutClient dbPartners={sortedPartners} currentUserId={user.id}>
      {children}
    </MessagesLayoutClient>
  );
}
