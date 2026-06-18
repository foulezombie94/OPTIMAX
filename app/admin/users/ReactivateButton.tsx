'use client';

import { useTransition } from 'react';
import { reactivateUser } from '../actions';

export default function ReactivateButton({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleReactivate = () => {
    if (window.confirm("Voulez-vous vraiment réactiver ce compte ? L'utilisateur pourra s'y reconnecter immédiatement.")) {
      startTransition(async () => {
        const result = await reactivateUser(userId);
        if (result.error) {
          alert(result.error);
        }
      });
    }
  };

  return (
    <button
      onClick={handleReactivate}
      disabled={isPending}
      className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-[12px] border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
    >
      {isPending ? 'Réactivation...' : 'Réactiver le compte'}
    </button>
  );
}
