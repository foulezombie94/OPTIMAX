'use server';

import { createClient } from '@/utils/supabase/server';

export type UserProfile = {
  id: string;
  username: string;
  avatar_url: string | null;
  display_name: string;
};

export type RelationshipType = 'none' | 'friends' | 'request_sent' | 'request_received';

type FriendRequestRaw = {
  status: 'pending' | 'accepted' | 'rejected';
  sender_id: string;
  receiver_id: string;
};

export async function searchUsers(query: string) {
  if (!query || query.trim().length < 2) return [];

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const searchTerm = query.trim().toLowerCase();
  const sanitizedSearch = searchTerm.replace(/[%_]/g, '\\$&');

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, email')
    .neq('id', user.id)
    .ilike('username', `${sanitizedSearch}%`)
    .limit(10);

  if (error) {
    console.error('Error searching users:', error);
    return [];
  }

  const profileIds = (data || []).map(p => p.id);
  let requests: FriendRequestRaw[] = [];
  
  if (profileIds.length > 0) {
    const { data: reqs } = await supabase
      .from('friend_requests')
      .select('status, sender_id, receiver_id')
      .or(`and(sender_id.eq.${user.id},receiver_id.in.(${profileIds.join(',')})),and(receiver_id.eq.${user.id},sender_id.in.(${profileIds.join(',')}))`);
    requests = reqs as FriendRequestRaw[] || [];
  }

  // Fetch friend request status for each user
  const profilesWithStatus = (data || []).map((profile) => {
    const request = requests.find(r => 
      (r.sender_id === user.id && r.receiver_id === profile.id) || 
      (r.sender_id === profile.id && r.receiver_id === user.id)
    );

    let relationship: RelationshipType = 'none';
    if (request) {
      if (request.status === 'accepted') relationship = 'friends';
      else if (request.status === 'pending') {
        relationship = request.sender_id === user.id ? 'request_sent' : 'request_received';
      }
    }

    return {
      id: profile.id,
      username: profile.username || profile.email?.split('@')[0] || 'Unknown',
      avatar_url: profile.avatar_url,
      display_name: profile.username || profile.email?.split('@')[0] || 'Unknown',
      relationship
    };
  });

  return profilesWithStatus;
}

export async function sendFriendRequest(receiverId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (receiverId === user.id) {
    return { success: false, error: "Vous ne pouvez pas vous ajouter vous-même." };
  }

  const { data: existing } = await supabase
    .from('friend_requests')
    .select('id, status')
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "Une relation existe déjà avec cet utilisateur." };
  }

  const { error } = await supabase
    .from('friend_requests')
    .insert({
      sender_id: user.id,
      receiver_id: receiverId,
      status: 'pending'
    });

  if (error) {
    console.error('Error sending friend request:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function acceptFriendRequest(requestId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('receiver_id', user.id)
    .eq('status', 'pending');

  if (error) {
    console.error('Error accepting friend request:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function rejectFriendRequest(requestId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Typically we can just delete it or mark as rejected
  const { error } = await supabase
    .from('friend_requests')
    .delete()
    .eq('id', requestId)
    .eq('receiver_id', user.id);

  if (error) {
    console.error('Error rejecting friend request:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function getPendingRequests() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('friend_requests')
    .select(`
      id,
      created_at,
      sender_id,
      profiles!friend_requests_sender_id_fkey (
        id,
        username,
        avatar_url,
        email
      )
    `)
    .eq('receiver_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pending requests:', error);
    return [];
  }

  type PendingRequest = {
    id: string;
    created_at: string;
    sender_id: string;
    profiles: {
      id: string;
      username: string | null;
      avatar_url: string | null;
      email: string | null;
    } | null;
  };

  return (data as unknown as PendingRequest[] || []).map((req) => ({
    id: req.id,
    created_at: req.created_at,
    sender: {
      id: req.profiles?.id,
      username: req.profiles?.username || req.profiles?.email?.split('@')[0] || 'Unknown',
      avatar_url: req.profiles?.avatar_url,
      display_name: req.profiles?.username || req.profiles?.email?.split('@')[0] || 'Unknown'
    }
  }));
}
