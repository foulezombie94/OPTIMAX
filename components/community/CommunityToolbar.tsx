export type SortOptions = 'popularity' | 'likes' | 'views' | 'newest';

type CommunityToolbarProps = {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  sortBy: SortOptions;
  setSortBy: (val: SortOptions) => void;
};

export function CommunityToolbar({ searchQuery, setSearchQuery, sortBy, setSortBy }: CommunityToolbarProps) {
  return (
    <div className="glass-panel p-5 rounded-3xl flex flex-col lg:flex-row gap-5 items-center justify-between bg-surface/30 border-white/5 shadow-2xl relative z-20">
      {/* Search Input */}
      <div className="relative w-full lg:w-96 group">
        <input 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          maxLength={80}
          className="w-full pl-12 pr-6 py-3.5 bg-white/[0.02] border border-white/10 rounded-2xl focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all outline-none text-on-surface placeholder:text-on-surface-variant/40 text-body-md shadow-inner group-hover:border-white/15" 
          placeholder="Rechercher un modèle ou un créateur..." 
          type="text" 
        />
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 transition-colors group-focus-within:text-emerald-400">search</span>
      </div>

      {/* Sorting Actions */}
      <div className="flex gap-2.5 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
        {[
          { id: 'popularity', label: 'Populaires', icon: 'trending_up' },
          { id: 'likes', label: 'Plus aimés', icon: 'favorite' },
          { id: 'views', label: 'Plus vus', icon: 'visibility' },
          { id: 'newest', label: 'Plus récents', icon: 'calendar_month' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSortBy(tab.id as SortOptions)}
            className={`px-5 py-3 rounded-2xl text-body-sm font-bold flex items-center gap-2 transition-all focus:outline-none whitespace-nowrap active:scale-95 ${sortBy === tab.id ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg' : 'glass-panel text-on-surface-variant hover:text-on-surface hover:bg-white/5 border-white/5'}`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
