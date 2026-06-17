import { createClient } from '@/utils/supabase/server';
import { redirect, notFound } from 'next/navigation';
import ChatWindow from '@/components/ChatWindow';

export async function generateMetadata() {
  return {
    title: 'Chat - OptiMax',
  };
}

export default async function MessageConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const partnerId = resolvedParams.id;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (!user) {
    redirect('/login');
  }

  // Fetch partner profile to ensure they exist and get their name
  const { data: partner } = await supabase
    .from('profiles')
    .select('id, username, email, avatar_url')
    .eq('id', partnerId)
    .single();

  if (!partner) {
    notFound();
  }

  const partnerName = partner.username || partner.email?.split('@')[0] || 'Unknown User';
  const partnerUsername = partner.username || partner.email?.split('@')[0] || 'unknown';

  return (
    <div className="flex-1 w-full h-full relative">
      <div className="absolute inset-0 bg-white"></div>
      
      <div className="absolute inset-0 z-10 flex flex-col">
        <ChatWindow 
          key={partnerId}
          currentUserId={user.id} 
          partnerId={partnerId} 
          partnerName={partnerName} 
          partnerUsername={partnerUsername}
          partnerAvatarUrl={partner.avatar_url || undefined}
        />
      </div>
    </div>
  );
}
