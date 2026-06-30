'use client';

import { useState } from 'react';

export default function StripeConnectButton({ isConnected }: { isConnected: boolean }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/stripe/connect', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to connect to Stripe');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (isConnected) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group">
        <span className="material-symbols-outlined">account_balance</span>
        <span className="text-body-md font-medium">Stripe Connecté</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isLoading}
      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group text-left disabled:opacity-50"
    >
      <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">
        {isLoading ? 'autorenew' : 'account_balance'}
      </span>
      <span className="text-body-md text-on-surface group-hover:text-primary transition-colors">
        {isLoading ? 'Connexion...' : 'Connecter Stripe (Paiements)'}
      </span>
    </button>
  );
}
