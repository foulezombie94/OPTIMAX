'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import T from '@/components/Translate';
import { claimReferralReward } from '@/app/profile/referral/actions';

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
  const [stats, setStats] = useState({ registered: 0, subscribed: 0, rewarded: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  
  const loadReferralData = async () => {
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
        subscribed: enrichedReferrals.filter((r: any) => r.status === 'subscribed' || r.status === 'completed').length,
        rewarded: enrichedReferrals.filter((r: any) => r.status === 'completed').length
      });
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    loadReferralData();
  }, [userId]);

  const referralLink = typeof window !== 'undefined' ? `${window.location.origin}/login?ref=${code}` : '';

  const copyToClipboard = () => {
    if (!referralLink) return;
    
    // Simplest copy fallback that works universally
    const textArea = document.createElement("textarea");
    textArea.value = referralLink;
    
    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
    }
    
    document.body.removeChild(textArea);
  };

  const handleClaimReward = async (referralId: string) => {
    if (claimingId) return;
    setClaimingId(referralId);
    try {
      const result = await claimReferralReward(referralId);
      if (result.success) {
        // Recharge les données pour mettre à jour l'UI
        await loadReferralData();
      } else {
        alert(result.error || 'Erreur lors de la réclamation.');
      }
    } catch (e) {
      console.error(e);
      alert('Une erreur est survenue.');
    } finally {
      setClaimingId(null);
    }
  };

  if (isLoading) return (
    <div className="w-full space-y-6">
      <div className="glass-panel rounded-2xl h-[200px] animate-pulse bg-white/5 border border-white/10"></div>
      <div className="glass-panel rounded-2xl h-[300px] animate-pulse bg-white/5 border border-white/10"></div>
    </div>
  );

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      
      {/* Statistiques & Lien */}
      <div className="glass-panel rounded-3xl p-8 relative overflow-hidden bg-surface/40 border border-white/10 shadow-2xl backdrop-blur-xl">
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/20 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-tertiary/20 rounded-full blur-[80px] pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
            <div>
              <h2 className="text-headline-lg font-display-brand text-on-surface font-black mb-2 flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[32px]">redeem</span>
                <T>Vos Récompenses</T>
              </h2>
              <p className="text-body-lg text-on-surface-variant max-w-xl">
                <T>Invitez vos amis ! S'ils s'abonnent à la version Pro via votre lien, vous gagnez</T> <strong className="text-tertiary font-bold"><T>2 mois offerts</T></strong> <T>sur votre propre abonnement.</T>
              </p>
            </div>
            
            {proUntil && new Date(proUntil) > new Date() && (
              <div className="flex p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 items-center gap-3 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px] text-emerald-400">verified</span>
                </div>
                <div>
                  <p className="text-[11px] text-emerald-400/80 font-bold uppercase tracking-wide"><T>Statut Actif</T></p>
                  <p className="text-body-md text-emerald-400 font-bold">
                    <T>Pro jusqu'au</T> {new Date(proUntil).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-7 bg-surface-dim/40 rounded-2xl border border-white/5 p-6 flex flex-col justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <p className="text-[12px] uppercase tracking-widest text-on-surface-variant font-bold mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">link</span> <T>Votre lien unique</T>
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-grow bg-black/20 rounded-xl px-4 py-3 border border-white/10 flex items-center overflow-hidden">
                  <code className="text-primary font-code text-body-md truncate w-full">
                    {referralLink}
                  </code>
                </div>
                <button 
                  type="button"
                  onClick={copyToClipboard}
                  className={`px-6 py-3 rounded-xl font-label-md flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer relative z-20 ${
                    copied 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-primary text-white hover:bg-inverse-primary hover:scale-105 hover:shadow-[0_0_20px_rgba(78,142,255,0.4)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {copied ? 'check' : 'content_copy'}
                  </span>
                  {copied ? <T>Copié !</T> : <T>Copier</T>}
                </button>
              </div>
            </div>
            
            <div className="md:col-span-5 grid grid-cols-2 gap-4">
              <div className="bg-surface-dim/40 rounded-2xl p-5 flex flex-col justify-center items-center border border-white/5 text-center group hover:border-primary/30 transition-colors">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-primary">group</span>
                </div>
                <p className="text-display-sm font-display font-black text-on-surface leading-none mb-1">{stats.registered}</p>
                <p className="text-[12px] uppercase tracking-wider text-on-surface-variant font-bold"><T>Inscrits</T></p>
              </div>
              <div className="bg-surface-dim/40 rounded-2xl p-5 flex flex-col justify-center items-center border border-white/5 text-center group hover:border-tertiary/30 transition-colors">
                <div className="w-12 h-12 rounded-full bg-tertiary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-tertiary">star</span>
                </div>
                <p className="text-display-sm font-display font-black text-tertiary leading-none mb-1">{stats.subscribed}</p>
                <p className="text-[12px] uppercase tracking-wider text-tertiary/80 font-bold"><T>Abonnés Pro</T></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des filleuls */}
      <div className="glass-panel rounded-3xl p-8 bg-surface/30 border border-white/10">
        <h3 className="font-headline-md text-headline-md text-on-surface mb-6 flex items-center gap-3">
          <span className="material-symbols-outlined text-[24px]">history</span>
          <T>Historique des parrainages</T>
        </h3>
        
        {referralsList.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl border border-white/10 border-dashed bg-white/5">
            <div className="w-16 h-16 rounded-full bg-surface-dim/50 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-[32px] text-on-surface-variant">person_add_disabled</span>
            </div>
            <h4 className="text-title-lg text-on-surface font-bold mb-2"><T>Aucun parrainage</T></h4>
            <p className="text-body-md text-on-surface-variant max-w-md mx-auto">
              <T>Partagez votre lien ci-dessus pour inviter vos amis et commencer à gagner des mois gratuits.</T>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {referralsList.map((ref) => (
              <div key={ref.id} className="group bg-surface-dim/30 hover:bg-surface-dim/50 border border-white/5 hover:border-white/10 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-300">
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-title-md font-bold text-white shrink-0 shadow-lg relative">
                    {ref.profile?.avatar_url ? (
                      <img src={ref.profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      (ref.profile?.username || ref.profile?.email || 'U').charAt(0).toUpperCase()
                    )}
                    {ref.status === 'completed' && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-tertiary rounded-full border-2 border-surface flex items-center justify-center">
                        <span className="material-symbols-outlined text-[10px] text-white">check</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-title-md text-on-surface font-bold">
                      {ref.profile?.username || ref.profile?.email?.split('@')[0] || 'Utilisateur'}
                    </h4>
                    <p className="text-body-sm text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                      <T>Inscrit le</T> {new Date(ref.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                  {/* Status Badges */}
                  <div className="flex-shrink-0">
                    {ref.status === 'completed' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-tertiary/10 text-tertiary text-[12px] font-bold tracking-wide uppercase border border-tertiary/20">
                        <span className="material-symbols-outlined text-[14px]">military_tech</span>
                        <T>Récompensé</T>
                      </span>
                    ) : ref.status === 'subscribed' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[12px] font-bold tracking-wide uppercase border border-primary/20">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                        <T>Abonné Pro</T>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 text-on-surface-variant text-[12px] font-bold tracking-wide uppercase border border-white/10">
                        <span className="w-2 h-2 rounded-full bg-on-surface-variant/50"></span>
                        <T>Inscrit</T>
                      </span>
                    )}
                  </div>

                  {/* Claim Action */}
                  {ref.status === 'subscribed' && (
                    <button
                      onClick={() => handleClaimReward(ref.id)}
                      disabled={claimingId === ref.id}
                      className="relative overflow-hidden group/btn px-6 py-2.5 rounded-xl bg-gradient-to-r from-tertiary to-orange-400 text-white font-label-md font-bold shadow-[0_0_20px_rgba(251,146,60,0.3)] hover:shadow-[0_0_30px_rgba(251,146,60,0.6)] hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100"
                    >
                      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
                      <span className="relative flex items-center gap-2">
                        {claimingId === ref.id ? (
                          <>
                            <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                            <T>Réclamation...</T>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[18px] animate-bounce">redeem</span>
                            <T>Réclamer mes 2 mois</T>
                          </>
                        )}
                      </span>
                    </button>
                  )}
                </div>
                
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
