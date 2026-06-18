import { createClient } from '@/utils/supabase/server';
import ReactivateButton from './ReactivateButton';

export default async function UsersAdminPage() {
  const supabase = await createClient();
  
  // Fetch all profiles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return <div className="text-error p-4">Erreur lors de la récupération des utilisateurs.</div>;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-display text-4xl font-bold text-on-surface tracking-tight mb-2">Gestion des Utilisateurs</h1>
        <p className="text-on-surface-variant text-body-lg">Consultez et gérez les comptes de votre plateforme.</p>
      </div>

      <div className="glass-panel border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-body-sm text-on-surface-variant">
            <thead className="text-[11px] uppercase tracking-widest text-on-surface bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-bold">Utilisateur</th>
                <th className="px-6 py-4 font-bold">Email</th>
                <th className="px-6 py-4 font-bold">Statut</th>
                <th className="px-6 py-4 font-bold">Rôle</th>
                <th className="px-6 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {profiles?.map((profile) => {
                const isDeactivated = profile.deactivated_at !== null;
                return (
                  <tr key={profile.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-medium text-on-surface flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                        {(profile.username || profile.email?.split('@')[0] || 'U').charAt(0).toUpperCase()}
                      </div>
                      {profile.username || 'Sans nom'}
                    </td>
                    <td className="px-6 py-4">{profile.email || 'N/A'}</td>
                    <td className="px-6 py-4">
                      {isDeactivated ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-error/10 text-error border border-error/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
                          Désactivé
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          Actif
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${profile.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-surface-dim text-on-surface-variant'}`}>
                        {profile.role || 'user'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isDeactivated && <ReactivateButton userId={profile.id} />}
                    </td>
                  </tr>
                );
              })}
              {profiles?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant">
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
