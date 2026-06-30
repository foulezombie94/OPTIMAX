'use client';

import { useState, useEffect, use } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '@/app/checkout/[id]/CheckoutForm';
import { getOptimizationDetails } from '@/app/actions/community';
import { PublicOptimization } from '@/components/community/types';
import Link from 'next/link';

// Make sure to call loadStripe outside of a component's render to avoid
// recreating the Stripe object on every render.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [clientSecret, setClientSecret] = useState('');
  const [item, setItem] = useState<PublicOptimization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Fetch item details
    getOptimizationDetails(resolvedParams.id)
      .then((res) => {
        if (!res.data) {
          throw new Error('Objet introuvable.');
        }
        
        const itemData = res.data;
        setItem(itemData as any);
        
        // 2. Create PaymentIntent
        return fetch('/api/stripe/payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            optimizationId: resolvedParams.id,
            amount: (itemData as any).price // Note: Server should re-verify this price
          }),
        });
      })
      .then((res) => {
        if (!res) return;
        if (!res.ok) throw new Error('Erreur lors de la préparation du paiement');
        return res.json();
      })
      .then((data) => {
        if (data?.clientSecret) {
          setClientSecret(data.clientSecret);
        }
      })
      .catch((err) => {
        console.error('Error fetching checkout details:', err);
        setError(err.message || 'Une erreur est survenue');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className="min-h-screen pt-[76px] flex items-center justify-center bg-background">
        <span className="material-symbols-outlined text-emerald-400 animate-spin text-[48px]">autorenew</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-[76px] flex items-center justify-center bg-background text-center p-4">
        <div>
          <span className="material-symbols-outlined text-error text-[64px] mb-4">error</span>
          <h1 className="text-2xl font-bold text-on-surface mb-2">Erreur</h1>
          <p className="text-on-surface-variant mb-6">{error}</p>
          <Link href="/community" className="text-primary hover:underline">Retour à la communauté</Link>
        </div>
      </div>
    );
  }

  const appearance = {
    theme: 'night' as const,
    variables: {
      colorPrimary: '#10b981', // emerald-500
      colorBackground: '#121216',
      colorText: '#e2e2e9',
      colorDanger: '#ff5449',
      fontFamily: 'Inter, system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '12px',
    },
  };

  const options = {
    clientSecret,
    appearance,
  };

  const handleRemoveItem = () => {
    window.location.href = '/community';
  };

  return (
    <main className="min-h-screen pt-[76px] flex items-center justify-center bg-background p-4 sm:p-8 font-sans relative">
      {/* Background decoration */}
      <div className="absolute inset-0 tech-grid opacity-10 pointer-events-none z-0"></div>
      
      {/* Main Split Card */}
      <div className="w-full max-w-[1100px] bg-[#121216] rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col md:flex-row relative z-10 border border-white/10">
        
        {/* Left Panel: Checkout Form */}
        <div className="w-full md:w-[55%] p-8 md:p-12 flex flex-col relative">
          <Link href="/community" className="text-on-surface-variant hover:text-on-surface flex items-center gap-2 mb-8 font-medium transition-colors w-fit">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Retour
          </Link>
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold text-on-surface mb-2">Paiement sécurisé</h1>
            <p className="text-on-surface-variant text-sm">Réglez votre achat via Stripe. Vos données sont chiffrées.</p>
          </div>

          <div className="flex-1">
            {clientSecret ? (
              <Elements options={options} stripe={stripePromise}>
                <CheckoutForm optimizationId={resolvedParams.id} amount={item?.price || 0} />
              </Elements>
            ) : (
              <div className="flex items-center justify-center h-40">
                <span className="material-symbols-outlined animate-spin text-emerald-500 text-3xl">autorenew</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Cart & Price Details */}
        <div className="w-full md:w-[45%] bg-white/[0.02] border-l border-white/5 p-8 md:p-12 flex flex-col">
          
          <h2 className="text-xl font-bold text-on-surface mb-6">Votre Panier</h2>
          
          {/* Cart Item Card */}
          <div className="glass-panel border border-white/10 rounded-2xl p-4 flex items-center justify-between mb-10 hover:border-white/20 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl flex items-center justify-center border border-emerald-500/30">
                <span className="material-symbols-outlined text-emerald-400 text-2xl">view_in_ar</span>
              </div>
              <div>
                <h3 className="text-on-surface font-semibold text-sm line-clamp-1 max-w-[120px]" title={item?.file_name || 'Modèle 3D'}>{item?.file_name || 'Modèle 3D'}</h3>
                <p className="text-emerald-400 font-bold mt-1">{item?.price?.toFixed(2) || '0.00'} €</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 bg-black/20 px-3 py-1.5 rounded-full border border-white/5 opacity-50 cursor-not-allowed" title="Quantité unique pour les biens numériques">
                <button className="text-on-surface-variant" disabled>-</button>
                <span className="text-on-surface text-sm">1</span>
                <button className="text-on-surface-variant" disabled>+</button>
              </div>
              <button onClick={handleRemoveItem} className="text-on-surface-variant hover:text-error transition-colors" title="Annuler et retourner à la communauté">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          </div>

          <h2 className="text-xl font-bold text-on-surface mb-6">Détails du prix</h2>
          
          {/* Price Details Card */}
          <div className="glass-panel border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex justify-between text-on-surface-variant text-sm font-medium">
              <span>Modèle 3D</span>
              <span>{item?.price?.toFixed(2) || '0.00'} €</span>
            </div>
            <div className="flex justify-between text-on-surface-variant text-sm font-medium">
              <span>TVA (Inclus)</span>
              <span>0.00 €</span>
            </div>
            <div className="flex justify-between text-on-surface-variant text-sm font-medium border-b border-white/10 pb-4">
              <span>Frais de livraison</span>
              <span>0.00 €</span>
            </div>

            <div className="flex justify-between text-on-surface font-bold text-lg mt-2">
              <span>Total</span>
              <span className="text-emerald-400">{item?.price?.toFixed(2) || '0.00'} €</span>
            </div>
          </div>
          
        </div>
        
      </div>
    </main>
  );
}
