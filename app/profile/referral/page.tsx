import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import ReferralSection from '@/components/ReferralSection';
import T from '@/components/Translate';

export const metadata = {
  title: 'Parrainage - OptiMax',
};

export default async function ReferralPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, pro_until')
    .eq('id', user.id)
    .single();

  return (
    <main className="flex-grow pt-[80px] pb-16 px-6 md:px-12 relative w-full flex-1 z-10">
      <div className="hero-bg" title="Abstract liquid background"></div>
      
      <div className="max-w-5xl mx-auto">
        <Link href="/profile" className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors mb-8 mt-4">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span className="font-label-md"><T>Retour au profil</T></span>
        </Link>
        
        {/* Hero Section */}
        <div className="text-center mb-12 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-tertiary/30 blur-[60px] rounded-full pointer-events-none"></div>
          <h1 className="text-display-sm md:text-display-md font-display-brand text-on-surface font-black mb-4 relative z-10">
            <T>Programme de Parrainage</T>
          </h1>
          <p className="text-body-lg text-on-surface-variant max-w-2xl mx-auto relative z-10">
            <T>Partagez OptiMax avec vos amis et débloquez des avantages exclusifs pour vous et vos filleuls.</T>
          </p>
        </div>

        {/* The existing Referral Component */}
        <div className="relative z-10">
          <ReferralSection userId={user.id} proUntil={profile?.pro_until} />
        </div>
      </div>
    </main>
  );
}
