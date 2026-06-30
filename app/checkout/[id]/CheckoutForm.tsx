'use client';

import { useState } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

export default function CheckoutForm({ optimizationId, amount }: { optimizationId: string, amount: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/${optimizationId}/success`,
      },
    });

    if (error.type === 'card_error' || error.type === 'validation_error') {
      setMessage(error.message || 'Une erreur est survenue avec votre carte.');
    } else {
      setMessage('Une erreur inattendue est survenue.');
    }

    setIsLoading(false);
  };

  return (
    <form id="payment-form" onSubmit={handleSubmit} className="space-y-6 mt-8">
      <PaymentElement id="payment-element" options={{ layout: 'accordion' }} />
      
      <button
        disabled={isLoading || !stripe || !elements}
        id="submit"
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-neutral-900 font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 select-none shadow-[0_4px_20px_rgba(78,222,163,0.25)] hover:shadow-[0_4px_35px_rgba(78,222,163,0.4)] active:scale-[0.98] transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed mt-8"
      >
        <span id="button-text">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined animate-spin text-[20px]">autorenew</span>
              Traitement en cours...
            </div>
          ) : (
            `Payer ${amount} €`
          )}
        </span>
      </button>
      
      {/* Show any error or success messages */}
      {message && (
        <div id="payment-message" className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-600 font-medium text-sm flex items-start gap-3 mt-6">
          <span className="material-symbols-outlined text-[20px]">error</span>
          <span className="leading-relaxed">{message}</span>
        </div>
      )}
    </form>
  );
}
