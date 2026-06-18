import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';

export default async function AdminDashboard() {
  const supabase = await createClient();
  
  // Fetch high-level stats
  const [usersCount, deactivatedCount, optimizationsCount] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).not('deactivated_at', 'is', null),
    supabase.from('optimizations').select('id', { count: 'exact', head: true })
  ]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-display text-4xl font-bold text-on-surface tracking-tight mb-2">Tableau de bord</h1>
        <p className="text-on-surface-variant text-body-lg">Bienvenue dans l'espace d'administration sécurisé.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-3xl border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10 transition-opacity group-hover:opacity-100 opacity-50"></div>
          <span className="material-symbols-outlined text-primary text-[32px] mb-4">group</span>
          <p className="text-on-surface-variant text-body-md font-medium">Utilisateurs inscrits</p>
          <p className="text-display-md font-bold text-on-surface mt-1">{usersCount.count || 0}</p>
        </div>

        <div className="glass-panel p-6 rounded-3xl border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-error/10 rounded-full blur-2xl -mr-10 -mt-10 transition-opacity group-hover:opacity-100 opacity-50"></div>
          <span className="material-symbols-outlined text-error text-[32px] mb-4">person_off</span>
          <p className="text-on-surface-variant text-body-md font-medium">Comptes désactivés</p>
          <p className="text-display-md font-bold text-on-surface mt-1">{deactivatedCount.count || 0}</p>
        </div>

        <div className="glass-panel p-6 rounded-3xl border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-opacity group-hover:opacity-100 opacity-50"></div>
          <span className="material-symbols-outlined text-emerald-400 text-[32px] mb-4">view_in_ar</span>
          <p className="text-on-surface-variant text-body-md font-medium">Modèles optimisés</p>
          <p className="text-display-md font-bold text-on-surface mt-1">{optimizationsCount.count || 0}</p>
        </div>
      </div>

      <div className="glass-panel p-8 rounded-3xl border-white/5 mt-8">
        <h2 className="font-headline-md text-xl font-bold text-on-surface mb-4">Actions Rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/admin/users" className="flex items-center justify-between p-5 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined">manage_accounts</span>
              </div>
              <div>
                <h3 className="font-bold text-on-surface">Gérer les utilisateurs</h3>
                <p className="text-on-surface-variant text-body-sm">Réactiver ou examiner les comptes</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
