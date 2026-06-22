import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { logout } from '@/app/login/actions';
import Link from 'next/link';
import OptimizationsGrid from '@/components/OptimizationsGrid';
import T from '@/components/Translate';
import DeactivateAccountButton from './DeactivateAccountButton';
import ReferralSection from '@/components/ReferralSection';
import { checkIsPro } from '@/utils/isPro';

export const metadata = {
  title: 'Profile - OptiMax',
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch profile and stats in parallel
  const [profileResult, optimizationsResult] = await Promise.all([
    supabase.from('profiles').select('id, username, is_pro, pro_until, location, website, created_at, deactivated_at').eq('id', user.id).single(),
    supabase.from('optimizations').select('id, file_name, original_size, compressed_size, file_type, created_at, preview_url, is_public, views, likes, shares').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
  ]);

  const profile = profileResult.data;
  const optimizations = optimizationsResult.data || [];

  if (profile?.deactivated_at) {
    // If the account is deactivated, force logout
    redirect('/login?deactivated=true');
  }

  const initial = (profile?.username || user.email?.split('@')[0] || 'U').charAt(0).toUpperCase();

  const filesOptimized = optimizations.length;
  const spaceSaved = optimizations.reduce((acc, opt) => acc + (opt.original_size - opt.compressed_size), 0);
  
  const formatBytes = (bytes: number) => {
    if (bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <main className="flex-grow pt-[80px] pb-16 px-6 md:px-12 relative w-full flex-1 z-10">
      <div className="hero-bg" title="Abstract liquid background"></div>
      
      <div className="max-w-7xl mx-auto">
        {/* Profile Header Card */}
        <div className="glass-panel rounded-2xl p-8 md:p-10 mb-12 flex flex-col md:flex-row items-center md:items-start gap-8 mt-12 relative overflow-hidden bg-surface/40">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-inverse-primary"></div>
          
          <div className="relative group">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-tr from-primary via-tertiary to-secondary flex items-center justify-center shadow-[0_0_30px_rgba(173,198,255,0.3)] border-4 border-surface-dim select-none transition-transform duration-500 hover:scale-[1.02]">
              <span className="text-[54px] md:text-[68px] font-black tracking-tighter text-surface-container-lowest font-display">
                {initial}
              </span>
            </div>
            <button className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[20px]">edit</span>
            </button>
          </div>
          
          <div className="flex-grow text-center md:text-left space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-1 justify-center md:justify-start">
                <h1 className="text-display-brand font-display-brand text-on-surface text-[32px] font-bold">
                  {profile?.username || user.email?.split('@')[0] || 'User'}
                </h1>
                {checkIsPro(profile) ? (
                  <span className="bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1 shadow-[0_0_10px_rgba(78,142,255,0.15)]">
                    <span className="material-symbols-outlined text-[14px]">stars</span> Pro
                  </span>
                ) : (
                  <span className="bg-white/10 text-on-surface-variant border border-white/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                    <T>Free</T>
                  </span>
                )}
              </div>
              <p className="text-primary font-label-md">
                {user.email}
              </p>
            </div>
            <p className="text-on-surface-variant max-w-2xl text-body-md leading-relaxed">
              {profile?.location ? profile.location : <T>Digital artisan specializing in fluid interfaces, glassmorphism aesthetics, and immersive user experiences. Exploring the intersection of deep atmospheric textures and crisp functional design to create next-generation web applications.</T>}
            </p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start pt-2">
              <span className="px-3 py-1 rounded-full glass-panel text-body-sm text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">location_on</span> {profile?.location ? profile.location : <T>Earth</T>}
              </span>
              <span className="px-3 py-1 rounded-full glass-panel text-body-sm text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">link</span> {profile?.website || 'optimax.app'}
              </span>
              <span className="px-3 py-1 rounded-full glass-panel text-body-sm text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">calendar_month</span> <T>Joined</T> {new Date(profile?.created_at || user.created_at).getFullYear()}
              </span>
            </div>
          </div>
          
          <div className="flex flex-row md:flex-col gap-4 w-full md:w-auto">
            <Link href="/" className="flex-1 md:flex-none px-6 py-3 bg-primary text-white rounded-lg font-label-md hover:bg-inverse-primary transition-colors shadow-[0_4px_14px_0_rgba(78,142,255,0.39)] text-center">
              <T>Go to App</T>
            </Link>
            <form action={logout}>
              <button className="w-full flex-1 md:flex-none px-6 py-3 glass-panel text-error rounded-lg font-label-md hover:bg-error/10 hover:border-error/30 transition-colors">
                <T>Logout</T>
              </button>
            </form>
          </div>
        </div>
        
        {/* Stats & Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar: Stats & Links */}
          <div className="lg:col-span-1 space-y-8">
            {/* Stats Card */}
            <div className="glass-panel rounded-xl p-6">
              <h3 className="font-headline-md text-headline-md text-on-surface mb-6 border-b border-white/10 pb-4"><T>Usage Stats</T></h3>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>image</span>
                  </div>
                  <div>
                    <p className="text-body-sm text-on-surface-variant"><T>Files Optimized</T></p>
                    <p className="font-headline-md text-headline-md text-on-surface">{filesOptimized}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-tertiary/10 flex items-center justify-center text-tertiary">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>save</span>
                  </div>
                  <div>
                    <p className="text-body-sm text-on-surface-variant"><T>Space Saved</T></p>
                    <p className="font-headline-md text-headline-md text-on-surface">{formatBytes(spaceSaved)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-surface-tint/10 flex items-center justify-center text-surface-tint">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>folder</span>
                  </div>
                  <div>
                    <p className="text-body-sm text-on-surface-variant"><T>Projects</T></p>
                    <p className="font-headline-md text-headline-md text-on-surface">3</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Account Management Links */}
            <div className="glass-panel rounded-xl p-6">
              <h3 className="font-label-lg text-label-lg text-on-surface mb-4"><T>Account</T></h3>
              <div className="space-y-3">
                <a className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group" href="/pricing">
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">credit_card</span>
                  <span className="text-body-md text-on-surface group-hover:text-primary transition-colors"><T>Subscription</T></span>
                </a>
                <a className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group" href="#">
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">mail</span>
                  <span className="text-body-md text-on-surface group-hover:text-primary transition-colors"><T>Email Settings</T></span>
                </a>
                <DeactivateAccountButton />
              </div>
            </div>

            {/* Referral Section */}
            <ReferralSection userId={user.id} proUntil={profile?.pro_until} />
          </div>
          
          {/* Right Content: Recent Creations Bento Grid */}
          <div className="lg:col-span-3">
            <div className="flex justify-between items-end mb-6">
              <h2 className="font-headline-md text-headline-md text-on-surface"><T>Recent Optimizations</T></h2>
              <div className="flex gap-2">
                <button className="px-4 py-2 glass-panel rounded-lg text-primary font-label-md bg-white/5"><T>Images</T></button>
                <button className="px-4 py-2 glass-panel rounded-lg text-on-surface-variant font-label-md hover:text-on-surface transition-colors"><T>Videos</T></button>
              </div>
            </div>
            
            <OptimizationsGrid optimizations={optimizations} />
          </div>
        </div>
      </div>
    </main>
  );
}
