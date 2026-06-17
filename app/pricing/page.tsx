import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function Pricing(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const success = searchParams.success === 'true';
  const canceled = searchParams.canceled === 'true';
  const sessionId = searchParams.session_id;

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  let isPro = false;
  if (user) {
    // Direct Stripe verification on success redirect for instant local upgrades
    if (success && sessionId && typeof sessionId === 'string' && sessionId.startsWith('cs_')) {
      try {
        const stripe = new (await import('stripe')).default(process.env.STRIPE_SECRET_KEY!);
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status === 'paid' && session.metadata?.userId === user.id) {
          await supabase.from('profiles').update({ is_pro: true }).eq('id', user.id);
          isPro = true;
        }
      } catch (err) {
        console.error('Error verifying Stripe session on page load:', err);
      }
    }

    try {
      const { data: profile } = await supabase.from('profiles').select('is_pro').eq('id', user.id).single();
      isPro = isPro || !!profile?.is_pro;
    } catch (err) {
      console.error('Error checking user pro status:', err);
    }
  }

  return (
    <main className="flex-grow flex flex-col items-center justify-center pt-32 pb-24 px-margin relative z-10 w-full max-w-container-max mx-auto flex-1">
      {/* Stripe Banners */}
      {success && (
        <div className="w-full max-w-xl p-4 mb-8 bg-primary/10 border border-primary/30 rounded-xl text-primary flex items-center gap-3 animate-fade-in backdrop-blur-md">
          <span className="material-symbols-outlined text-[24px]">check_circle</span>
          <div className="text-left">
            <p className="font-semibold text-on-surface">Subscription successful!</p>
            <p className="text-body-sm text-on-surface-variant">Welcome to OptiMax Pro. Unlimited optimizations are now active on your account.</p>
          </div>
        </div>
      )}
      {canceled && (
        <div className="w-full max-w-xl p-4 mb-8 bg-error/10 border border-error/30 rounded-xl text-error flex items-center gap-3 animate-fade-in backdrop-blur-md">
          <span className="material-symbols-outlined text-[24px]">warning</span>
          <div className="text-left">
            <p className="font-semibold text-on-surface">Subscription canceled</p>
            <p className="text-body-sm text-on-surface-variant">Your checkout process was canceled. No charges were made.</p>
          </div>
        </div>
      )}

      {/* Header Text */}
      <div className="text-center mb-16 space-y-4 max-w-2xl">
        <h1 className="font-display text-[64px] leading-[1.1] font-bold text-on-surface tracking-tight">Scale Without Limits</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Unlock hyper-optimized media processing engineered for maximum velocity. Choose the tier that powers your workflow.
        </p>
      </div>

      {/* Pricing Cards Container */}
      <div className="flex flex-col md:flex-row gap-gutter w-full max-w-5xl justify-center items-stretch perspective-1000">
        
        {/* Free Tier Card */}
        <div className="flex-1 max-w-md w-full bg-white/[0.03] backdrop-blur-[16px] border border-white/10 rounded-xl p-8 flex flex-col relative transition-all duration-300 hover:bg-white/[0.04]">
          {/* Top Edge Highlight */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          
          <div className="mb-8">
            <h3 className="font-headline-md text-headline-md text-on-surface-variant">Free Tier</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-display text-[40px] font-bold text-on-surface">$0</span>
              <span className="font-body-md text-body-md text-on-surface-variant">/forever</span>
            </div>
            <p className="font-body-md text-body-md text-outline mt-2">Essential optimization for lightweight projects.</p>
          </div>
          
          <div className="flex-grow space-y-4 mb-8">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-outline">check</span>
              <span className="font-body-md text-body-md text-on-surface">5 files per day limit</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-outline">check</span>
              <span className="font-body-md text-body-md text-on-surface">Basic JPEG/PNG compression</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-outline">check</span>
              <span className="font-body-md text-body-md text-on-surface">Standard processing queue</span>
            </div>
            <div className="flex items-center gap-3 opacity-50">
              <span className="material-symbols-outlined text-surface-variant">close</span>
              <span className="font-body-md text-body-md text-on-surface-variant line-through">Hyper-optimization formats</span>
            </div>
          </div>
          
          <Link href="/" className="w-full py-3 rounded-lg border border-white/10 bg-white/5 font-label-md text-label-md text-on-surface hover:bg-white/10 hover:border-white/20 transition-all duration-300 mt-auto text-center block">
            Get Started Free
          </Link>
        </div>

        {/* Pro Tier Card (Active/Glowing) */}
        <div className="flex-1 max-w-md w-full bg-white/[0.03] backdrop-blur-[20px] border border-primary rounded-xl p-8 flex flex-col relative shadow-[0_0_20px_rgba(173,198,255,0.15)] transform md:-translate-y-4 transition-transform duration-500 hover:-translate-y-6 overflow-hidden">
          {/* Glowing Outer Edge Effect (Dual Stroke Illusion) */}
          <div className="absolute inset-[-1px] rounded-xl border border-primary/40 shadow-[0_0_15px_rgba(173,198,255,0.3)] pointer-events-none"></div>
          {/* Internal Gradient Bloom */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[60px] pointer-events-none -translate-y-1/2 translate-x-1/4"></div>
          
          <div className="mb-8 relative z-10">
            <div className="flex justify-between items-start">
              <h3 className="font-headline-md text-headline-md text-primary font-bold">Pro Tier</h3>
              <span className="bg-primary/15 text-primary px-3 py-1 rounded-full font-code text-code border border-primary/30">Most Popular</span>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-display text-[64px] font-bold text-on-surface">$2</span>
              <span className="font-body-md text-body-md text-on-surface-variant">/mo</span>
            </div>
            <p className="font-body-md text-body-md text-primary/80 mt-2">Maximum velocity. Zero restrictions.</p>
          </div>
          
          <div className="flex-grow space-y-4 mb-8 relative z-10">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">all_inclusive</span>
              <span className="font-body-md text-body-md text-on-surface font-medium">Unlimited compressions</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">auto_awesome</span>
              <span className="font-body-md text-body-md text-on-surface font-medium">Hyper-optimization (AVIF/WebM)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-tertiary">bolt</span>
              <span className="font-body-md text-body-md text-on-surface font-medium">Lightning-fast processing</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">block</span>
              <span className="font-body-md text-body-md text-on-surface font-medium">Zero ads, pure focus</span>
            </div>
          </div>
          
          {isPro ? (
            <div className="w-full py-4 rounded-lg bg-primary/20 border border-primary/40 font-label-md text-label-md text-primary mt-auto relative z-10 text-center font-bold flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[20px]">stars</span>
              Active Plan
            </div>
          ) : (
            <Link 
              href={user ? '/api/checkout' : '/login?next=/pricing'} 
              className="w-full py-4 rounded-lg bg-gradient-to-r from-primary-container to-secondary-container border-t border-white/30 font-label-md text-label-md text-on-primary-container shadow-[0_0_20px_rgba(77,142,255,0.2)] hover:shadow-[0_0_30px_rgba(77,142,255,0.5)] transition-all duration-300 mt-auto relative z-10 overflow-hidden group text-center block"
            >
              <span className="relative z-10">Upgrade to Pro</span>
              {/* Hover gradient slide */}
              <div className="absolute inset-0 bg-gradient-to-r from-secondary-container to-primary-container opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </Link>
          )}
        </div>

      </div>
    </main>
  );
}
