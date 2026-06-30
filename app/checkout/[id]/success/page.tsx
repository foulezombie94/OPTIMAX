'use client';

import { useEffect, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function CheckoutSuccessPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const paymentIntentStatus = searchParams.get('redirect_status');
  const paymentIntentId = searchParams.get('payment_intent');

  const [status, setStatus] = useState<'success' | 'processing' | 'error'>('processing');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (!paymentIntentStatus || !paymentIntentId) {
      return;
    }

    if (paymentIntentStatus === 'succeeded') {
      setIsVerifying(true);
      // Fallback Verification: Ensure the purchase is recorded in the DB instantly
      fetch('/api/stripe/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_intent: paymentIntentId }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setStatus('success');
          } else {
            setStatus('error');
          }
        })
        .catch(() => {
          // If the network fails, but Stripe said 'succeeded', we'll tentatively show success,
          // hoping the webhook got it. Or show error. Let's be safe and show processing/error.
          setStatus('error');
        })
        .finally(() => {
          setIsVerifying(false);
        });
    } else if (paymentIntentStatus === 'processing') {
      setStatus('processing');
    } else {
      setStatus('error');
    }
  }, [paymentIntentStatus, paymentIntentId]);

  return (
    <main className="min-h-screen pt-[76px] flex items-center justify-center bg-[#070709] relative overflow-hidden p-4">
      {/* Premium Background Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen opacity-50"></div>
      <div className="absolute inset-0 tech-grid opacity-[0.05] pointer-events-none z-0 mix-blend-overlay"></div>
      
      <div className="glass-panel max-w-md w-full p-10 rounded-[40px] border border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)] relative z-10 text-center bg-[#101014]/80 backdrop-blur-3xl overflow-hidden">
        
        {/* Animated Glow Border */}
        <div className="absolute -inset-1 bg-gradient-to-b from-emerald-500/20 to-transparent opacity-50 blur-xl pointer-events-none -z-10"></div>

        {status === 'success' && !isVerifying && (
          <div className="animate-fade-in relative z-10">
            <div className="w-28 h-28 mx-auto rounded-[32px] bg-gradient-to-br from-emerald-400/20 to-teal-600/10 flex items-center justify-center border border-emerald-400/30 mb-8 shadow-[0_0_50px_rgba(16,185,129,0.3),inset_0_2px_10px_rgba(16,185,129,0.2)]">
              <span className="material-symbols-outlined text-emerald-400 text-[56px] drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]">check_circle</span>
            </div>
            <h1 className="font-display text-4xl font-black text-white mb-4 tracking-tight drop-shadow-sm">Achat validé !</h1>
            <p className="text-on-surface-variant mb-10 leading-relaxed text-[15px] font-medium">
              Votre transaction a été sécurisée et finalisée. Le modèle 3D haute résolution a été ajouté à votre collection personnelle.
            </p>
            <Link 
              href={`/community?show=${resolvedParams.id}`}
              className="group relative w-full py-5 rounded-[20px] bg-gradient-to-r from-emerald-500 to-teal-400 text-neutral-950 font-label-lg text-[16px] font-black flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(16,185,129,0.3)] hover:shadow-[0_10px_40px_rgba(16,185,129,0.5)] active:scale-[0.98] transition-all overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
              <span className="material-symbols-outlined text-[22px] relative z-10">view_in_ar</span>
              <span className="relative z-10 tracking-wide">Ouvrir l'inspecteur 3D</span>
            </Link>
          </div>
        )}

        {(status === 'processing' || isVerifying) && (
          <div className="animate-fade-in relative z-10">
            <div className="w-28 h-28 mx-auto flex items-center justify-center mb-8 relative">
              <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-emerald-400 rounded-full border-t-transparent animate-spin"></div>
              <span className="material-symbols-outlined text-emerald-400 text-[40px] animate-pulse">lock</span>
            </div>
            <h1 className="font-display text-3xl font-black text-white mb-4 tracking-tight">Vérification...</h1>
            <p className="text-on-surface-variant mb-10 leading-relaxed text-[15px]">
              Nous synchronisons de manière sécurisée votre achat avec nos serveurs. Ne fermez pas cette page.
            </p>
          </div>
        )}

        {status === 'error' && !isVerifying && (
          <div className="animate-fade-in relative z-10">
            <div className="w-28 h-28 mx-auto rounded-[32px] bg-gradient-to-br from-error/20 to-red-600/10 flex items-center justify-center border border-error/30 mb-8 shadow-[0_0_50px_rgba(255,84,73,0.3),inset_0_2px_10px_rgba(255,84,73,0.2)]">
              <span className="material-symbols-outlined text-error text-[56px] drop-shadow-[0_0_15px_rgba(255,84,73,0.8)]">error</span>
            </div>
            <h1 className="font-display text-3xl font-black text-white mb-4 tracking-tight">Paiement échoué</h1>
            <p className="text-on-surface-variant mb-10 leading-relaxed text-[15px]">
              La transaction a été refusée ou n'a pas pu aboutir. Aucun montant n'a été prélevé sur votre carte.
            </p>
            <Link 
              href={`/checkout/${resolvedParams.id}`}
              className="w-full py-5 rounded-[20px] bg-white/5 hover:bg-white/10 border border-white/10 text-white font-label-lg text-[16px] font-bold flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[22px]">replay</span>
              Essayer une autre carte
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
