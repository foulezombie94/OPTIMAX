import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { logout } from '@/app/login/actions';
import NavbarClient from './NavbarClient';
import { checkIsPro } from '@/utils/isPro';

export default async function Navbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isPro = false;
  let username = '';

  if (user) {
    try {
      const { data: profile } = await supabase.from('profiles').select('is_pro, pro_until, username').eq('id', user.id).single();
      isPro = checkIsPro(profile);
      username = profile?.username || user.email?.split('@')[0] || 'User';
    } catch (e) {
      console.error('Error in Navbar fetching profile:', e);
      username = user.email?.split('@')[0] || 'User';
    }
  }

  return <NavbarClient user={user} isPro={isPro} username={username} />;
}

