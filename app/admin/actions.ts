'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function reactivateUser(userId: string) {
  const supabase = await createClient();
  
  // Verify admin status
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autorisé" };

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (adminProfile?.role !== 'admin') {
    return { error: "Action refusée" };
  }

  // Reactivate user (clear deactivated_at)
  const { error } = await supabase
    .from('profiles')
    .update({ deactivated_at: null })
    .eq('id', userId);

  if (error) {
    console.error('Failed to reactivate user:', error);
    return { error: "Échec de la réactivation." };
  }

  revalidatePath('/admin/users');
  return { success: true };
}

export async function deleteUserPermanently(userId: string) {
  // Normally requires Service Role Key to delete from auth.users
  // Here we just hard-delete the profile or set a specific flag if full auth deletion is not possible without Service Key.
  // We will leave this stubbed out, as a true hard-delete requires SUPABASE_SERVICE_ROLE_KEY.
  return { error: "La suppression définitive nécessite une Service Role Key via le dashboard Supabase pour nettoyer auth.users." };
}
