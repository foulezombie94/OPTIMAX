'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import T from '@/components/Translate';

type RefereeProfile = {
  id: string;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
};

type EnrichedReferral = {
  id: string;
  referee_id: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  profile?: RefereeProfile;
};

export default function ReferralSection({ userId, proUntil }: { userId: string, proUntil?: string | null }) {
  const [code, setCode] = useState<string>('');
  const [referralsList, setReferralsList] = useState<EnrichedReferral[]>([]);
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
        const newCode = 'OPT-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const { data: newRef } = await supabase
          .from('referral_codes')
          .insert({ user_id: userId, code: newCode })
          .select('code')
          .single();
        refCode = newRef;
      }
      
      if (refCode) setCode(refCode.code);
      
      // Get referrals
      const { data: referrals } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', userId)
        .order('created_at', { ascending: false });
        
      if (referrals && referrals.length > 0) {
        const refereeIds = referrals.map((r: any) => r.referee_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, email, avatar_url')
          .in('id', refereeIds);
          
        const enrichedReferrals = referrals.map((r: any) => {
          const profile = profiles?.find((p: any) => p.id === r.referee_id);
          return { ...r, profile };
        });
        
        setReferralsList(enrichedReferrals);
        setStats({ 
          registered: enrichedReferrals.length, 
          subscribed: enrichedReferrals.filter((r: any) => r.status === 'subscribed').length 
        });
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
    <div className="glass-panel rounded-xl p-6 mb-8 order-first lg:col-span-4 w-full">
      <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[28px] text-tertiary">group_add</span>
          <h3 className="font-headline-md text-headline-md text-on-surface">Programme de Parrainage</h3>
        </div>
        {proUntil && new Date(proUntil) > new Date() && (
          <div className="hidden md:flex p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-emerald-400">verified</span>
            <p className="text-[12px] text-emerald-400 font-bold uppercase tracking-wide">
              Pro actif jusqu'au {new Date(proUntil).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>
      
      <p className="text-body-md text-on-surface-variant mb-6">
        Invitez vos amis ! S'ils s'abonnent à la version Pro via votre lien, 
        ils reçoivent <strong className="text-primary">1 mois gratuit</strong> et vous gagnez <strong className="text-tertiary">2 mois offerts</strong>.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2 bg-surface-dim/50 rounded-lg border border-white/10 p-4 flex flex-col md:flex-row items-center gap-4">
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
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-lg p-4 flex flex-col justify-center items-center border border-white/5 text-center">
            <p className="text-body-sm text-on-surface-variant mb-1">Inscrits</p>
            <p className="font-headline-md text-on-surface">{stats.registered}</p>
          </div>
          <div className="bg-tertiary/5 rounded-lg p-4 flex flex-col justify-center items-center border border-tertiary/20 text-center">
            <p className="text-body-sm text-tertiary mb-1">Abonnés</p>
            <p className="font-headline-md text-tertiary">{stats.subscribed}</p>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h4 className="font-label-lg text-label-lg text-on-surface mb-4">Vos filleuls ({referralsList.length})</h4>
        
        {referralsList.length === 0 ? (
          <div className="text-center p-8 bg-white/5 rounded-lg border border-white/10 border-dashed">
            <span className="material-symbols-outlined text-[32px] text-on-surface-variant/50 mb-2">sentiment_dissatisfied</span>
            <p className="text-on-surface-variant">Vous n'avez parrainé personne pour le moment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-3 px-4 text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">Utilisateur</th>
                  <th className="py-3 px-4 text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">Date d'inscription</th>
                  <th className="py-3 px-4 text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">Statut</th>
                </tr>
              </thead>
              <tbody>
                {referralsList.map((ref) => (
                  <tr key={ref.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {ref.profile?.avatar_url ? (
                          <img src={ref.profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          (ref.profile?.username || ref.profile?.email || 'U').charAt(0).toUpperCase()
                        )}
                      </div>
                      <span className="font-medium text-on-surface truncate max-w-[120px] md:max-w-[200px]">
                        {ref.profile?.username || ref.profile?.email?.split('@')[0] || 'Utilisateur inconnu'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-body-sm text-on-surface-variant">
                      {new Date(ref.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4">
                      {ref.status === 'subscribed' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tertiary/10 text-tertiary text-[11px] font-bold tracking-wide uppercase border border-tertiary/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                          Abonné Pro
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-on-surface-variant text-[11px] font-bold tracking-wide uppercase border border-white/10">
                          <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/50"></span>
                          Inscrit
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {proUntil && new Date(proUntil) > new Date() && (
        <div className="mt-6 md:hidden p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
          <span className="material-symbols-outlined text-emerald-400">verified</span>
          <p className="text-body-sm text-emerald-400">
            Vos avantages Pro sont actifs jusqu'au <strong>{new Date(proUntil).toLocaleDateString()}</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
