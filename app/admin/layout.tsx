import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const metadata = {
  title: 'Admin - OptiMax',
  robots: 'noindex, nofollow'
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    notFound(); // Triggers 404 if not logged in
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    notFound(); // Triggers 404 if not an admin
  }

  return (
    <div className="flex h-screen bg-[#070709] overflow-hidden">
      {/* Admin Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-[#101014] flex flex-col hidden md:flex z-50 relative pt-[80px]">
        <div className="p-6">
          <h2 className="text-emerald-400 font-label-lg font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
            Espace Admin
          </h2>
          <nav className="space-y-2">
            <Link href="/admin" className="flex items-center gap-3 px-4 py-3 rounded-xl text-on-surface hover:bg-white/5 hover:text-emerald-400 transition-colors">
              <span className="material-symbols-outlined text-[20px]">dashboard</span>
              Vue d'ensemble
            </Link>
            <Link href="/admin/users" className="flex items-center gap-3 px-4 py-3 rounded-xl text-on-surface hover:bg-white/5 hover:text-emerald-400 transition-colors">
              <span className="material-symbols-outlined text-[20px]">group</span>
              Utilisateurs
            </Link>
          </nav>
        </div>
        
        <div className="mt-auto p-6 border-t border-white/5">
          <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-xl text-on-surface-variant hover:bg-white/5 transition-colors">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            Retour au site
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-y-auto pt-[80px] z-10">
        <div className="absolute inset-0 tech-grid opacity-10 pointer-events-none"></div>
        <div className="p-8 md:p-12 max-w-7xl mx-auto relative z-20">
          {children}
        </div>
      </main>
    </div>
  );
}
