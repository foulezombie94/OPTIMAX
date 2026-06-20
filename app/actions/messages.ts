'use server';

import { createClient } from '@/utils/supabase/server';
import { getCachedData } from '@/utils/redis';

export type PartnerProfile = {
  id: string;
  username: string | null;
  email: string | null;
  is_pro: boolean | null;
  avatar_url: string | null;
};

export async function getUserConversationsAndProfiles(userId: string) {
  return await getCachedData(
    `conversations_profiles_${userId}`,
    async () => {
      const supabase = await createClient();
      
      // Fetch only the latest message per conversation
      const { data: latestMsgs, error: msgsError } = await supabase
        .rpc('get_user_conversations', { uid: userId });

      if (msgsError) {
        console.error('Error fetching conversations:', msgsError);
        return { latestMsgs: null, partners: [] };
      }

      // Extract conversational partners
      const partnerIds = new Set<string>();
      if (latestMsgs) {
        latestMsgs.forEach((msg: any) => {
          if (msg.partner_id) partnerIds.add(msg.partner_id);
        });
      }

      // Fetch partner profiles
      let partners: PartnerProfile[] = [];
      if (partnerIds.size > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, email, is_pro, avatar_url')
          .in('id', Array.from(partnerIds));
          
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        } else {
          partners = profiles || [];
        }
      }

      return { latestMsgs, partners };
    },
    15 // Cache for 15 seconds. Realtime will handle updates on the client side.
  );
}
