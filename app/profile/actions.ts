'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function deactivateAccount() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return { error: "Vous devez être connecté pour effectuer cette action." };
  }

  // Set the deactivated_at timestamp
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ deactivated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (updateError) {
    console.error('Failed to deactivate account:', updateError);
    return { error: "Une erreur s'est produite lors de la désactivation du compte." };
  }

  // Log the user out
  await supabase.auth.signOut();
  
  revalidatePath('/', 'layout');
  redirect('/login?message=Account%20deactivated');
}
