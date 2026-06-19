import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import OptimizationsGrid from '@/components/OptimizationsGrid';

import ProfileBackButton from '@/components/ProfileBackButton';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const resolvedParams = await params;
  return {
    title: `${resolvedParams.username} - OptiMax Profile`,
  };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const resolvedParams = await params;
  const username = decodeURIComponent(resolvedParams.username);
  const supabase = await createClient();
  
  // Try to find user by username
  let { data: profile } = await supabase
    .from('profiles')
    .select('id, username, email, is_pro, location, website, created_at, avatar_url, deactivated_at')
    .eq('username', username)
    .maybeSingle();

  if (!profile) {
    // Fallback to checking by ID if it's a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(username)) {
      const res = await supabase.from('profiles').select('id, username, email, is_pro, location, website, created_at, avatar_url, deactivated_at').eq('id', username).maybeSingle();
      profile = res.data;
    }
  }

  if (!profile) {
    // Fallback to checking by email prefix
    const res = await supabase
      .from('profiles')
      .select('id, username, email, is_pro, location, website, created_at, avatar_url, deactivated_at')
      .ilike('email', `${username}@%`)
      .limit(1)
      .maybeSingle();
    profile = res.data;
  }

  if (!profile || profile.deactivated_at) {
    notFound();
  }

  // Get current logged-in user to pass to the message form
  const { data: { session } } = await supabase.auth.getSession();
  const currentUser = session?.user ?? null;

  // Fetch their public creations
  const { data: publicOptimizations } = await supabase
    .from('optimizations')
    .select('id, file_name, original_size, compressed_size, file_type, created_at, preview_url, is_public, views, likes, shares')
    .eq('user_id', profile.id)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(50);

  const optimizations = publicOptimizations || [];

  const initial = (profile.username || 'U').charAt(0).toUpperCase();

  const filesOptimized = optimizations.length;
  const spaceSaved = optimizations.reduce((acc: number, opt: any) => acc + (opt.original_size - opt.compressed_size), 0);
  
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
        <ProfileBackButton />

        {/* Profile Header Card */}
        <div className="glass-panel rounded-2xl p-8 md:p-10 mb-12 flex flex-col md:flex-row items-center md:items-start gap-8 mt-6 relative overflow-hidden bg-surface/40">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 to-teal-400"></div>
          
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(78,222,163,0.15)] border-4 border-emerald-500/30 select-none">
            <span className="text-[54px] md:text-[68px] font-black tracking-tighter text-emerald-400 font-display">
              {initial}
            </span>
          </div>
          
          <div className="flex-grow text-center md:text-left space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-1 justify-center md:justify-start">
                <h1 className="text-display-brand font-display-brand text-on-surface text-[32px] font-bold">
                  {profile.username || profile.email?.split('@')[0] || 'Anonymous User'}
                </h1>
                {profile.is_pro ? (
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1 shadow-[0_0_10px_rgba(78,222,163,0.15)]">
                    <span className="material-symbols-outlined text-[14px]">stars</span> Pro
                  </span>
                ) : (
                  <span className="bg-white/10 text-on-surface-variant border border-white/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                    Community
                  </span>
                )}
              </div>
            </div>
            <p className="text-on-surface-variant max-w-2xl text-body-md leading-relaxed">
              {profile.location || "OptiMax Creator. Exploring the digital frontier with optimized 3D models."}
            </p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start pt-2">
              <span className="px-3 py-1 rounded-full glass-panel text-body-sm text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">location_on</span> {profile.location || 'Earth'}
              </span>
              <span className="px-3 py-1 rounded-full glass-panel text-body-sm text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">link</span> {profile.website || 'optimax.app'}
              </span>
              <span className="px-3 py-1 rounded-full glass-panel text-body-sm text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">calendar_month</span> Joined {new Date(profile.created_at || new Date()).getFullYear()}
              </span>
            </div>
          </div>
        </div>
        
        {/* Stats & Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar: Stats & Links */}
          <div className="lg:col-span-1 space-y-8">
            {/* Stats Card */}
            <div className="glass-panel rounded-xl p-6">
              <h3 className="font-headline-md text-headline-md text-on-surface mb-6 border-b border-white/10 pb-4">Public Stats</h3>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>image</span>
                  </div>
                  <div>
                    <p className="text-body-sm text-on-surface-variant">Public Models</p>
                    <p className="font-headline-md text-headline-md text-on-surface">{filesOptimized}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>save</span>
                  </div>
                  <div>
                    <p className="text-body-sm text-on-surface-variant">Space Saved</p>
                    <p className="font-headline-md text-headline-md text-on-surface">{formatBytes(spaceSaved)}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Secure Messaging Section in Sidebar */}
            <div className="glass-panel bg-surface/40 border border-white/5 rounded-2xl p-6 text-center">
              <span className="material-symbols-outlined text-[48px] text-emerald-400 mb-2">forum</span>
              <h3 className="text-on-surface font-label-lg mb-2">Contact User</h3>
              {currentUser ? (
                <Link href={`/messages/${profile.id}`} className="w-full py-3 bg-emerald-500 text-white rounded-lg font-label-md hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">chat_bubble</span> Message
                </Link>
              ) : (
                <Link href={`/login`} className="w-full py-3 bg-surface text-on-surface rounded-lg font-label-md hover:bg-surface-dim transition-colors flex items-center justify-center gap-2 border border-white/10">
                  <span className="material-symbols-outlined text-[20px]">login</span> Log in to Message
                </Link>
              )}
            </div>
          </div>
          
          {/* Right Content: Recent Creations Bento Grid */}
          <div className="lg:col-span-3">
            <div className="flex justify-between items-end mb-6">
              <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400 text-[24px]">view_in_ar</span> 
                Public Creations
              </h2>
            </div>
            
            <OptimizationsGrid optimizations={optimizations} />
          </div>
        </div>
      </div>
    </main>
  );
}
