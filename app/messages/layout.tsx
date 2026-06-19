import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import MessagesLayoutClient from '@/components/MessagesLayoutClient';

export const metadata = {
  title: 'Messages - OptiMax',
};

export default async function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (!user) {
    redirect('/login');
  }

  // Fetch only the latest message per conversation for performance
  const { data: latestMsgs } = await supabase
    .rpc('get_user_conversations', { uid: user.id });

  // Extract conversational partners
  const partnerIds = new Set<string>();
  if (latestMsgs) {
    latestMsgs.forEach((msg: any) => {
      if (msg.partner_id) partnerIds.add(msg.partner_id);
    });
  }

  type PartnerProfile = {
    id: string;
    username: string | null;
    email: string | null;
    is_pro: boolean | null;
    avatar_url: string | null;
  };

  // Fetch partner profiles
  let partners: PartnerProfile[] = [];
  if (partnerIds.size > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, email, is_pro, avatar_url')
      .in('id', Array.from(partnerIds));
    partners = profiles || [];
  }

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
