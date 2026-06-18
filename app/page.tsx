import OptimizationWorkspace from "@/components/OptimizationWorkspace";
import Footer from "@/components/Footer";
import T from "@/components/Translate";

export default function Home() {
  return (
    <main className="pt-32 pb-24 px-4 sm:px-8 md:px-margin w-full max-w-[100vw] sm:max-w-container-max mx-auto flex flex-col gap-16 flex-1 z-10 relative overflow-x-hidden">
      {/* Hero Section */}
      <section className="text-center max-w-3xl mx-auto flex flex-col items-center gap-6">
        <div className="text-center mb-16 relative w-full">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[300px] sm:max-w-[600px] h-[300px] bg-primary/20 blur-[120px] rounded-full pointer-events-none"></div>
          
          <h1 className="text-headline-lg font-black mb-6 tracking-tight leading-[1.1]">
            <span className="text-on-background block mb-2"><T>Impeccable quality.</T></span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#b3c1ff] via-[#e6b3ff] to-[#ffb3e6]"><T>Microscopic weight.</T></span>
          </h1>
          
          <p className="text-body-md text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
            <T>The ultimate engine for professional file optimization. Harness liquid-fast processing, imperceptible compression loss, and a UI built for power users.</T>
          </p>
        </div>
      </section>

      {/* Interactive Layout Grid */}
      <OptimizationWorkspace />
    </main>
  );
}
