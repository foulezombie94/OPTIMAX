'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const next = (formData.get('next') as string) || '/profile';
  const keepSignedIn = formData.get('keepSignedIn') === 'on';

  const supabase = await createClient({ keepSignedIn });

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Check if account is deactivated
  if (data.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('deactivated_at')
      .eq('id', data.user.id)
      .single();
      
    if (profile?.deactivated_at) {
      await supabase.auth.signOut();
      return { error: "Ce compte a été désactivé. Veuillez contacter le service client pour le réactiver." };
    }
  }

  revalidatePath('/', 'layout');
  redirect(next);
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const username = formData.get('username') as string;
  const useCase = formData.get('useCase') as string;
  const plan = formData.get('plan') as string;
  const next = (formData.get('next') as string) || '/profile';
  const ref = formData.get('ref') as string;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
      data: {
        username,
        use_case: useCase,
      }
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    try {
      // Quietly update the profiles table with custom user details
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          username: username || null,
          location: useCase || null,
        })
        .eq('id', data.user.id);
      
      if (profileError) {
        console.error('Error updating profile in signup:', profileError);
      }
    } catch (e) {
      console.error('Failed to update profile during signup:', e);
    }

    if (ref) {
      try {
        const { data: refCode } = await supabase
          .from('referral_codes')
          .select('user_id')
          .eq('code', ref)
          .single();
          
        if (refCode && refCode.user_id !== data.user.id) {
          await supabase.from('referrals').insert({
            referrer_id: refCode.user_id,
            referee_id: data.user.id,
            status: 'registered'
          });
          console.log(`Referral registered: referrer ${refCode.user_id} -> referee ${data.user.id}`);
        }
      } catch (e) {
        console.error('Failed to register referral:', e);
      }
    }
  }

  // If email confirmation is disabled, Supabase returns the session immediately
  if (data.session) {
    revalidatePath('/', 'layout');
    if (plan === 'pro') {
      redirect('/api/checkout');
    } else {
      redirect(next);
    }
  }

  return { success: true, message: 'Account created successfully! Please check your email to confirm.' };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  
  revalidatePath('/', 'layout');
  redirect('/login');
}
