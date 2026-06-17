import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { logout } from '@/app/login/actions';
import NavbarClient from './NavbarClient';

export default async function Navbar() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  let isPro = false;
  let username = '';

  if (user) {
    try {
      const { data: profile } = await supabase.from('profiles').select('is_pro, username').eq('id', user.id).single();
      isPro = !!profile?.is_pro;
      username = profile?.username || user.email?.split('@')[0] || 'User';
    } catch (e) {
      console.error('Error in Navbar fetching profile:', e);
      username = user.email?.split('@')[0] || 'User';
    }
  }

  return <NavbarClient user={user} isPro={isPro} username={username} />;
}

