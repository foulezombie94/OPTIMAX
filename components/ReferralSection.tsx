'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import T from '@/components/Translate';

export default function ReferralSection({ userId, proUntil }: { userId: string, proUntil?: string | null }) {
  const [code, setCode] = useState<string>('');
  const [stats, setStats] = useState({ registered: 0, subscribed: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    async function loadReferralData() {
      const supabase = createClient();
      
      // Get or create referral code
      let { data: refCode } = await supabase
        .from('referral_codes')
        .select('code')
        .eq('user_id', userId)
        .single();
        
      if (!refCode) {
        // Generate new code
        const newCode = 'OPT-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const { data: newRef } = await supabase
          .from('referral_codes')
          .insert({ user_id: userId, code: newCode })
          .select('code')
          .single();
        refCode = newRef;
      }
      
      if (refCode) setCode(refCode.code);
      
      // Get stats
      const { data: referrals } = await supabase
        .from('referrals')
        .select('status')
        .eq('referrer_id', userId);
        
      if (referrals) {
        const registered = referrals.filter((r: any) => r.status === 'registered').length;
        const subscribed = referrals.filter((r: any) => r.status === 'subscribed').length;
        setStats({ registered, subscribed });
      }
      
      setIsLoading(false);
    }
    
    loadReferralData();
  }, [userId]);

  const referralLink = typeof window !== 'undefined' ? `${window.location.origin}/login?ref=${code}` : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) return <div className="glass-panel rounded-xl p-6 mt-8 h-48 animate-pulse bg-white/5"></div>;

  return (
    <div className="glass-panel rounded-xl p-6 mt-8">
      <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
        <span className="material-symbols-outlined text-[28px] text-tertiary">group_add</span>
        <h3 className="font-headline-md text-headline-md text-on-surface">Programme de Parrainage</h3>
      </div>
      
      <p className="text-body-md text-on-surface-variant mb-6">
        Invitez vos amis ! S'ils s'abonnent à la version Pro via votre lien, 
        ils reçoivent <strong className="text-primary">1 mois gratuit</strong> et vous gagnez <strong className="text-tertiary">2 mois offerts</strong>.
      </p>

      <div className="bg-surface-dim/50 rounded-lg border border-white/10 p-4 mb-8 flex flex-col md:flex-row items-center gap-4">
        <div className="flex-grow w-full text-center md:text-left">
          <p className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold mb-1">Votre lien unique</p>
          <code className="text-primary font-code bg-primary/10 px-3 py-1 rounded text-body-sm block break-all">
            {referralLink}
          </code>
        </div>
        <button 
          onClick={copyToClipboard}
          className="w-full md:w-auto px-6 py-3 bg-white/10 hover:bg-white/20 transition-colors rounded-lg font-label-md flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">
            {copied ? 'check' : 'content_copy'}
          </span>
          {copied ? 'Copié !' : 'Copier'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/5 rounded-lg p-4 flex items-center justify-between border border-white/5 hover:border-white/10 transition-colors">
          <div>
            <p className="text-body-sm text-on-surface-variant">Clics / Inscrits</p>
            <p className="font-headline-md text-on-surface">{stats.registered + stats.subscribed}</p>
          </div>
          <span className="material-symbols-outlined text-[32px] text-on-surface-variant/30">touch_app</span>
        </div>
        
        <div className="bg-tertiary/5 rounded-lg p-4 flex items-center justify-between border border-tertiary/20">
          <div>
            <p className="text-body-sm text-tertiary">Abonnements Convertis</p>
            <p className="font-headline-md text-tertiary">{stats.subscribed}</p>
          </div>
          <span className="material-symbols-outlined text-[32px] text-tertiary/30">stars</span>
        </div>
      </div>

      {proUntil && new Date(proUntil) > new Date() && (
        <div className="mt-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
          <span className="material-symbols-outlined text-emerald-400">verified</span>
          <p className="text-body-sm text-emerald-400">
            Vos avantages de parrainage Pro sont actifs jusqu'au <strong>{new Date(proUntil).toLocaleDateString()}</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
