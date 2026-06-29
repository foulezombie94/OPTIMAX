'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function claimReferralReward(referralId: string) {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error(`[Referral Claim] ❌ Unauthorized attempt to claim referral ${referralId}:`, authError);
    return { success: false, error: 'Non authentifié' };
  }

  console.log(`[Referral Claim] 🔄 User ${user.id} is attempting to claim referral ${referralId}`);

  // Vérifier le parrainage
  const { data: referral, error: referralError } = await supabase
    .from('referrals')
    .select('*')
    .eq('id', referralId)
    .eq('referrer_id', user.id)
    .single();

  if (referralError || !referral) {
    console.error(`[Referral Claim] ❌ Referral ${referralId} not found for user ${user.id}:`, referralError);
    return { success: false, error: 'Parrainage introuvable' };
  }

  if (referral.status !== 'subscribed') {
    console.warn(`[Referral Claim] ⚠️ Referral ${referralId} for user ${user.id} is not eligible (status: ${referral.status})`);
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
    console.error(`[Referral Claim] ❌ DB Error: Failed to update status to 'completed' for referral ${referralId}:`, updateError);
    return { success: false, error: 'Erreur lors de la mise à jour' };
  }

  // Ajouter 60 jours au pro_until de l'utilisateur
  const { data: profile, error: fetchProfileError } = await supabaseAdmin
    .from('profiles')
    .select('pro_until')
    .eq('id', user.id)
    .single();

  if (fetchProfileError) {
    console.error(`[Referral Claim] ❌ DB Error: Failed to fetch profile for user ${user.id}:`, fetchProfileError);
    return { success: false, error: 'Erreur lors de la récupération du profil' };
  }

  const currentProUntil = profile?.pro_until ? new Date(profile.pro_until).getTime() : Date.now();
  const newProUntil = new Date(Math.max(currentProUntil, Date.now()) + 60 * 24 * 60 * 60 * 1000).toISOString();

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ pro_until: newProUntil, is_pro: true })
    .eq('id', user.id);

  if (profileError) {
    console.error(`[Referral Claim] ❌ DB Error: Failed to add 60 days to profile for user ${user.id}:`, profileError);
    return { success: false, error: 'Erreur lors de l\'attribution de la récompense' };
  }

  // --- STRIPE INTEGRATION: Pause billing for 2 months ---
  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    
    // Rechercher l'abonnement actif de l'utilisateur
    const subscriptions = await stripe.subscriptions.search({
      query: `metadata['userId']:'${user.id}' AND status:'active'`,
      limit: 1,
    });

    if (subscriptions.data.length > 0) {
      const activeSub = subscriptions.data[0];
      
      console.log(`[Referral Claim] 💳 Active Stripe subscription found (${activeSub.id}). Applying 2-month 100% discount...`);

      // Créer un coupon dynamique de 2 mois gratuits
      const coupon = await stripe.coupons.create({
        duration: 'repeating',
        duration_in_months: 2,
        percent_off: 100,
        name: 'Parrainage - 2 Mois Offerts',
      });

      // Appliquer le coupon à l'abonnement
      await stripe.subscriptions.update(activeSub.id, {
        coupon: coupon.id,
      });

      console.log(`[Referral Claim] 💳✅ Successfully applied coupon ${coupon.id} to subscription ${activeSub.id}`);
    } else {
      console.log(`[Referral Claim] 💳 No active Stripe subscription found. The user will just get +60 days in database.`);
    }
  } catch (stripeError) {
    console.error(`[Referral Claim] ❌ Stripe Error: Failed to apply discount for user ${user.id}:`, stripeError);
    // On ne bloque pas le processus si Stripe échoue, car ils ont quand même eu l'update en base de données.
  }
  // --- END STRIPE INTEGRATION ---

  console.log(`[Referral Claim] ✅ Success! Added 60 days to user ${user.id} for referral ${referralId}. New pro_until: ${newProUntil}`);

  revalidatePath('/profile');
  revalidatePath('/profile/referral');

  return { success: true };
}
