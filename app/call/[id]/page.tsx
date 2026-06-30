import { createClient } from '@/utils/supabase/server';
import { redirect, notFound } from 'next/navigation';
import CallInterface from '@/components/CallInterface';

export async function generateMetadata() {
  return {
    title: 'Appel Vidéo - OptiMax',
  };
}

export default async function CallPage({ 
  params,
  searchParams,
}: { 
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const partnerId = resolvedParams.id;
  
  const incoming = resolvedSearchParams.incoming === 'true';
  const outgoing = resolvedSearchParams.outgoing === 'true';
  const callType = (resolvedSearchParams.type as 'audio' | 'video') || 'video';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch partner profile
  const { data: partner } = await supabase
    .from('profiles')
    .select('id, username, email, avatar_url')
    .eq('id', partnerId)
    .single();

  if (!partner) {
    notFound();
  }

  const partnerName = partner.username || partner.email?.split('@')[0] || 'Unknown User';

  // We also need my own profile for the chat display
  const { data: myProfile } = await supabase
    .from('profiles')
    .select('id, username, email, avatar_url')
    .eq('id', user.id)
    .single();

  const myName = myProfile?.username || myProfile?.email?.split('@')[0] || 'Me';

  return (
    <div className="w-screen h-screen overflow-hidden bg-black text-white font-sans">
      <CallInterface 
        currentUserId={user.id}
        currentUserName={myName}
        currentUserAvatarUrl={myProfile?.avatar_url || undefined}
        partnerId={partnerId}
        partnerName={partnerName}
        partnerAvatarUrl={partner.avatar_url || undefined}
        initialIncoming={incoming}
        initialOutgoing={outgoing}
        initialCallType={callType}
      />
    </div>
  );
}
