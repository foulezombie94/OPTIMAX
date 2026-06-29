'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function claimReferralReward(referralId: string) {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Non authentifié' };
  }

  // Vérifier le parrainage
  const { data: referral, error: referralError } = await supabase
    .from('referrals')
    .select('*')
    .eq('id', referralId)
    .eq('referrer_id', user.id)
    .single();

  if (referralError || !referral) {
    return { success: false, error: 'Parrainage introuvable' };
  }

  if (referral.status !== 'subscribed') {
    return { success: false, error: 'Ce parrainage n\'est pas encore éligible à la récompense ou a déjà été réclamé.' };
  }

  // Accès administrateur pour modifier le pro_until
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  const { createClient: createAdminClient } = await import('@supabase/supabase-js');
  const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceKey);

  // Mettre à jour le statut du parrainage
  const { error: updateError } = await supabaseAdmin
    .from('referrals')
    .update({ status: 'completed' })
    .eq('id', referralId);

  if (updateError) {
    console.error('Erreur lors de la mise à jour du parrainage:', updateError);
    return { success: false, error: 'Erreur lors de la mise à jour' };
  }

  // Ajouter 60 jours au pro_until de l'utilisateur
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('pro_until')
    .eq('id', user.id)
    .single();

  const currentProUntil = profile?.pro_until ? new Date(profile.pro_until).getTime() : Date.now();
  const newProUntil = new Date(Math.max(currentProUntil, Date.now()) + 60 * 24 * 60 * 60 * 1000).toISOString();

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ pro_until: newProUntil, is_pro: true })
    .eq('id', user.id);

  if (profileError) {
    console.error('Erreur lors de la mise à jour du profil:', profileError);
    // On pourrait théoriquement rollback le status du referral ici si on voulait être 100% safe
    return { success: false, error: 'Erreur lors de l\'attribution de la récompense' };
  }

  revalidatePath('/profile');
  revalidatePath('/profile/referral');

  return { success: true };
}
