'use client';

import { useTransition } from 'react';
import { deactivateAccount } from './actions';
import T from '@/components/Translate';

export default function DeactivateAccountButton() {
  const [isPending, startTransition] = useTransition();

  const handleDeactivate = () => {
    const isConfirmed = window.confirm(
      "Are you sure you want to delete your account? Your account will be deactivated for 30 days before being permanently deleted. To reactivate it during this period, you must contact customer support."
    );

    if (isConfirmed) {
      startTransition(() => {
        deactivateAccount();
      });
    }
  };

  return (
    <button 
      onClick={handleDeactivate}
      disabled={isPending}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span className={`material-symbols-outlined text-on-surface-variant transition-colors ${!isPending && 'group-hover:text-error'} ${isPending && 'animate-spin'}`}>
        {isPending ? 'autorenew' : 'delete'}
      </span>
      <span className={`text-body-md text-on-surface transition-colors ${!isPending && 'group-hover:text-error'}`}>
        <T>Delete Account</T>
      </span>
    </button>
  );
}
