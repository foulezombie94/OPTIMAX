import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full py-gutter bg-surface/20 backdrop-blur-xl border-t border-white/5 mt-auto relative z-10">
      <div className="flex flex-col md:flex-row justify-between items-center px-margin max-w-container-max mx-auto gap-unit">
        <div className="font-label-md text-label-md text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>copyright</span>
          © {new Date().getFullYear()} OptiMax. Liquid Glass Design.
        </div>
        <nav className="flex items-center gap-6 font-body-md text-body-md">
          <Link href="#" className="text-on-surface-variant hover:text-tertiary transition-colors">Terms</Link>
          <Link href="#" className="text-on-surface-variant hover:text-tertiary transition-colors">Privacy</Link>
          <Link href="#" className="text-on-surface-variant hover:text-tertiary transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[18px]">open_in_new</span> Twitter
          </Link>
        </nav>
      </div>
    </footer>
  );
}
