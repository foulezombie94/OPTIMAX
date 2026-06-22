export default function Loading() {
  return (
    <div className="w-full h-[70vh] flex flex-col items-center justify-center gap-6 relative z-10">
      <div className="relative w-24 h-24 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-primary animate-spin opacity-80"></div>
        <div className="absolute inset-2 rounded-full border-b-2 border-l-2 border-tertiary animate-[spin_1.5s_linear_infinite_reverse] opacity-60"></div>
        <span className="material-symbols-outlined text-on-surface animate-pulse" style={{ fontSize: '32px' }}>hourglass_top</span>
      </div>
      <div className="flex flex-col items-center">
        <h2 className="font-headline-md text-on-surface mb-2 tracking-wide animate-pulse">Chargement</h2>
        <div className="flex gap-1 mt-1">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}
