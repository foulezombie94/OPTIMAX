'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { login, signup } from './actions';

const onboardingSteps = [
  {
    title: "Multi-Format 3D Converter",
    description: "Convert and compress STL, FBX, OBJ, GLB, and GLTF models seamlessly. Optimized for web fidelity and microscopic file sizes.",
    icon: "view_in_ar",
    accent: "text-primary",
    bgGlow: "rgba(173, 198, 255, 0.15)"
  },
  {
    title: "100% Client-Side Processing",
    description: "Your intellectual property remains fully secure. Conversions are processed locally in sandboxed WebAssembly inside your browser.",
    icon: "security",
    accent: "text-tertiary",
    bgGlow: "rgba(78, 222, 163, 0.15)"
  },
  {
    title: "Interactive WebGL Inspector",
    description: "Inspect converted files instantly in 3D. Rotate, zoom, and review file weight savings directly on your personal profile dashboard.",
    icon: "3d_rotation",
    accent: "text-secondary",
    bgGlow: "rgba(221, 183, 255, 0.15)"
  },
  {
    title: "Unrestricted Pro Scaling",
    description: "Upgrade to Pro for just $2/month to unlock unlimited file sizes, priority queue speeds, and persistent cloud preview links.",
    icon: "bolt",
    accent: "text-primary",
    bgGlow: "rgba(77, 142, 255, 0.2)"
  }
];

function LoginContent() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  
  // Multi-step signup onboarding wizard state
  const [signupStep, setSignupStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [useCase, setUseCase] = useState('Blender Artist');
  const [plan, setPlan] = useState('free');
  
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next') || '/profile';
  const refParam = searchParams.get('ref') || '';

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % onboardingSteps.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError('');
    setSuccess('');

    const action = isLogin ? login : signup;
    const result = await action(formData);

    if (result) {
      if ('error' in result && result.error) {
        setError(result.error);
      } else if ('success' in result && result.success) {
        setSuccess((result as any).message || 'Success');
      }
    }
    
    setIsLoading(false);
  }

  return (
    <main className="pt-[76px] flex font-body-md text-on-surface flex-1 w-full min-h-[calc(100vh-76px)] relative z-10 bg-background">
      {/* Background decoration elements */}
      <div className="absolute inset-0 bg-technical-grid opacity-30 pointer-events-none z-[-1]"></div>
      
      {/* Main Split Container */}
      <div className="flex flex-col md:flex-row w-full flex-1 relative overflow-hidden">
        
        {/* Left Panel: Form Area */}
        <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-center relative z-10 border-r border-white/5 bg-background/60 backdrop-blur-md">
          <div className="max-w-md mx-auto w-full space-y-8">
            
            {/* Logo */}
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-3xl animate-[spin_20s_linear_infinite]" style={{ fontVariationSettings: "'FILL' 1" }}>
                lens_blur
              </span>
              <span className="font-display text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-tertiary to-secondary">
                OptiMax
              </span>
            </div>
            
            {/* Header Text */}
            <div>
              <h1 className="font-display text-[32px] font-bold text-on-surface tracking-tight mb-2">
                {isLogin ? 'Welcome back, creative!' : 'Unlock professional rendering'}
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {isLogin 
                  ? 'Access your unified client-side 3D optimization workplace.' 
                  : 'Start optimizing, converting, and inspecting your 3D models.'}
              </p>
            </div>
            
            {/* Onboarding Wizard Progress Bar (Visible only for signup) */}
            {!isLogin && (
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                  <span className={signupStep >= 1 ? 'text-primary' : 'opacity-40'}>1. Account</span>
                  <span className={signupStep >= 2 ? 'text-tertiary' : 'opacity-40'}>2. Personalize</span>
                  <span className={signupStep >= 3 ? 'text-secondary' : 'opacity-40'}>3. Speed</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary via-tertiary to-secondary transition-all duration-500 ease-out"
                    style={{ width: `${(signupStep / 3) * 100}%` }}
                  />
                </div>
              </div>
            )}
            
            {/* Segmented Toggle (Sign In / Sign Up Selector, hidden once user starts onboarding steps) */}
            {isLogin || signupStep === 1 ? (
              <div className="flex p-1 bg-white/[0.03] border border-white/10 rounded-full relative">
                <div 
                  className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-primary-container border-t border-white/20 rounded-full shadow-lg transition-all duration-300 ease-out" 
                  style={{ transform: isLogin ? 'translateX(0)' : 'translateX(100%)' }} 
                />
                <button 
                  type="button"
                  onClick={() => { setIsLogin(true); setError(''); setSuccess(''); setSignupStep(1); }} 
                  className={`flex-1 py-2.5 text-center rounded-full font-label-md text-label-md z-10 transition-colors duration-300 ${isLogin ? 'text-on-primary-container font-semibold' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  Sign In
                </button>
                <button 
                  type="button"
                  onClick={() => { setIsLogin(false); setError(''); setSuccess(''); }} 
                  className={`flex-1 py-2.5 text-center rounded-full font-label-md text-label-md z-10 transition-colors duration-300 ${!isLogin ? 'text-on-primary-container font-semibold' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  Sign Up
                </button>
              </div>
            ) : null}
            
            {/* Status Messages */}
            {error && (
              <div className="p-4 rounded-xl border border-error/20 bg-error/10 text-error font-body-sm flex items-center gap-2 animate-scale-in">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/10 text-primary font-body-sm flex items-center gap-2 animate-scale-in">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>{success}</span>
              </div>
            )}

            {/* Wizard Form */}
            <form className="space-y-5" action={handleSubmit}>
              <input type="hidden" name="next" value={nextParam} />
              <input type="hidden" name="ref" value={refParam} />
              
              {/* --- STEP 1: CREDENTIALS (Email & Password) --- */}
              {isLogin || signupStep === 1 ? (
                <div className="space-y-5">
                  {/* Email Input */}
                  <div className="space-y-1.5">
                    <label className="text-body-sm font-medium text-on-surface-variant ml-1">Email Address</label>
                    <div className="relative">
                      <input 
                        name="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-6 pr-12 py-4 bg-white/[0.02] border border-white/10 rounded-xl focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none text-on-surface placeholder:text-on-surface-variant/40" 
                        placeholder="name@example.com" 
                        type="email" 
                        maxLength={255}
                      />
                      <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-on-surface-variant/50">mail</span>
                    </div>
                  </div>
                  
                  {/* Password Input */}
                  <div className="space-y-1.5">
                    <label className="text-body-sm font-medium text-on-surface-variant ml-1">Password</label>
                    <div className="relative">
                      <input 
                        name="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-6 pr-12 py-4 bg-white/[0.02] border border-white/10 rounded-xl focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none text-on-surface placeholder:text-on-surface-variant/40" 
                        placeholder="••••••••" 
                        type={showPassword ? 'text' : 'password'} 
                        maxLength={255}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface transition-colors focus:outline-none"
                      >
                        <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Options (Login only) */}
                  {isLogin && (
                    <div className="flex items-center justify-between px-1 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div className="relative flex items-center justify-center w-5 h-5">
                          <input 
                            name="keepSignedIn"
                            defaultChecked 
                            className="peer appearance-none w-5 h-5 border border-white/20 rounded-md bg-transparent checked:bg-primary checked:border-primary transition-all cursor-pointer" 
                            type="checkbox" 
                          />
                          <span className="material-symbols-outlined absolute text-on-primary text-[14px] opacity-0 peer-checked:opacity-100 pointer-events-none font-bold">check</span>
                        </div>
                        <span className="font-body-sm text-body-sm text-on-surface-variant group-hover:text-on-surface transition-colors">Keep me signed in</span>
                      </label>
                      <a className="font-body-sm text-body-sm text-primary hover:underline transition-all" href="#">Forgot password?</a>
                    </div>
                  )}

                  {/* Buttons for Step 1 */}
                  {isLogin ? (
                    <button 
                      disabled={isLoading}
                      className="w-full py-4 bg-gradient-to-r from-primary-container to-secondary-container border-t border-white/20 text-on-primary-container rounded-xl font-label-lg text-label-lg shadow-lg hover:shadow-primary-container/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-center flex items-center justify-center gap-2" 
                      type="submit"
                    >
                      {isLoading ? (
                        <>
                          <span className="material-symbols-outlined animate-spin text-[20px]">autorenew</span>
                          Signing In...
                        </>
                      ) : (
                        'Sign In to Workspace'
                      )}
                    </button>
                  ) : (
                    <button 
                      type="button"
                      onClick={() => {
                        if (!email || !email.includes('@')) {
                          setError('Please enter a valid email address.');
                        } else if (password.length < 6) {
                          setError('Password must be at least 6 characters.');
                        } else {
                          setSignupStep(2);
                          setError('');
                        }
                      }}
                      className="w-full py-4 bg-primary text-on-primary-container font-semibold rounded-xl hover:brightness-110 transition-all active:scale-[0.98] text-center"
                    >
                      Continue
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <input type="hidden" name="email" value={email} />
                  <input type="hidden" name="password" value={password} />
                </>
              )}

              {/* --- STEP 2: PROFILE SETUP (Username & Use Case) --- */}
              {!isLogin && signupStep === 2 && (
                <div className="space-y-5 animate-scale-in">
                  {/* Username Input */}
                  <div className="space-y-1.5">
                    <label className="text-body-sm font-medium text-on-surface-variant ml-1">Choose Username</label>
                    <div className="relative">
                      <input 
                        name="username"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full pl-6 pr-12 py-4 bg-white/[0.02] border border-white/10 rounded-xl focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none text-on-surface placeholder:text-on-surface-variant/40" 
                        placeholder="your_legendary_name" 
                        type="text" 
                        maxLength={50}
                      />
                      <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-on-surface-variant/50">person</span>
                    </div>
                  </div>

                  {/* Use Case Selection */}
                  <div className="space-y-1.5">
                    <label className="text-body-sm font-medium text-on-surface-variant ml-1">Primary Use Case</label>
                    <div className="relative">
                      <select 
                        name="useCase"
                        value={useCase}
                        onChange={(e) => setUseCase(e.target.value)}
                        className="w-full pl-6 pr-12 py-4 bg-[#18181b] border border-white/10 rounded-xl focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none text-on-surface appearance-none"
                      >
                        <option value="Blender Artist">Blender Artist</option>
                        <option value="Game Dev (Unity/Unreal)">Game Dev (Unity/Unreal)</option>
                        <option value="3D Printing & Hobbyist">3D Printing & Hobbyist</option>
                        <option value="CAD & Product Designer">CAD & Product Designer</option>
                        <option value="Web3D & Creative Developer">Web3D & Creative Developer</option>
                        <option value="Other">Other</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-on-surface-variant/50 pointer-events-none">expand_more</span>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button" 
                      onClick={() => setSignupStep(1)}
                      className="flex-1 py-4 glass-panel text-on-surface rounded-xl hover:bg-white/5 active:scale-[0.98] transition-all"
                    >
                      Back
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        if (username.trim().length >= 3) {
                          setSignupStep(3);
                          setError('');
                        } else {
                          setError('Username must be at least 3 characters.');
                        }
                      }}
                      className="flex-1 py-4 bg-primary text-on-primary-container font-semibold rounded-xl hover:brightness-110 active:scale-[0.98] transition-all"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}
              {!isLogin && signupStep > 2 && (
                <>
                  <input type="hidden" name="username" value={username} />
                  <input type="hidden" name="useCase" value={useCase} />
                </>
              )}

              {/* --- STEP 3: PLANS & LAUNCH --- */}
              {!isLogin && signupStep === 3 && (
                <div className="space-y-5 animate-scale-in">
                  <div className="text-center mb-4">
                    <h3 className="font-display text-lg font-bold text-on-surface">Choose Your Compression Engine</h3>
                    <p className="text-body-sm text-on-surface-variant">Select a speed plan to launch your workspace.</p>
                  </div>

                  <input type="hidden" name="plan" value={plan} />

                  <div className="grid grid-cols-2 gap-4">
                    {/* Free Plan Card */}
                    <div 
                      onClick={() => setPlan('free')}
                      className={`glass-panel p-5 rounded-2xl cursor-pointer transition-all duration-300 border flex flex-col justify-between text-left ${plan === 'free' ? 'border-primary bg-primary/5 shadow-[0_0_15px_rgba(173,198,255,0.15)]' : 'border-white/10 hover:border-white/20'}`}
                    >
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-on-surface text-body-sm">Free Tier</span>
                          {plan === 'free' && <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>}
                        </div>
                        <p className="text-headline-sm font-bold text-on-surface">$0</p>
                        <p className="text-[11px] text-on-surface-variant mt-1.5 leading-relaxed">5 files/day, basic queue processing.</p>
                      </div>
                    </div>

                    {/* Pro Plan Card */}
                    <div 
                      onClick={() => setPlan('pro')}
                      className={`glass-panel p-5 rounded-2xl cursor-pointer transition-all duration-300 border flex flex-col justify-between text-left relative overflow-hidden ${plan === 'pro' ? 'border-tertiary bg-tertiary/5 shadow-[0_0_15px_rgba(78,222,163,0.15)]' : 'border-white/10 hover:border-white/20'}`}
                    >
                      {plan === 'pro' && (
                        <div className="absolute top-0 right-0 bg-tertiary text-background text-[9px] font-bold px-2 py-0.5 rounded-bl-lg uppercase">
                          Best
                        </div>
                      )}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-tertiary text-body-sm">Pro Plan</span>
                          {plan === 'pro' && <span className="material-symbols-outlined text-tertiary text-[18px]">check_circle</span>}
                        </div>
                        <p className="text-headline-sm font-bold text-on-surface">$2<span className="text-xs font-normal">/mo</span></p>
                        <p className="text-[11px] text-on-surface-variant mt-1.5 leading-relaxed">Unlimited files, priority speed, cloud storage.</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button" 
                      onClick={() => setSignupStep(2)}
                      className="flex-1 py-4 glass-panel text-on-surface rounded-xl hover:bg-white/5 active:scale-[0.98] transition-all"
                      disabled={isLoading}
                    >
                      Back
                    </button>
                    <button 
                      disabled={isLoading}
                      type="submit"
                      className="flex-1 py-4 bg-gradient-to-r from-primary-container to-secondary-container text-on-primary-container font-semibold rounded-xl hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <span className="material-symbols-outlined animate-spin text-[20px]">autorenew</span>
                          Launching...
                        </>
                      ) : (
                        plan === 'pro' ? 'Continue to Checkout' : 'Complete Registration'
                      )}
                    </button>
                  </div>
                </div>
              )}
              
              {/* Divider */}
              {(isLogin || signupStep === 1) && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 py-2">
                    <div className="flex-1 h-px bg-white/5"></div>
                    <span className="font-body-sm text-body-sm text-on-surface-variant/40 uppercase tracking-wider text-[11px] font-semibold">secured entry</span>
                    <div className="flex-1 h-px bg-white/5"></div>
                  </div>
                  
                  {/* Terms Text */}
                  <p className="text-center text-body-sm text-on-surface-variant/60 leading-relaxed max-w-sm mx-auto">
                    By entering, you confirm you agree to our <a className="text-primary hover:underline" href="#">Terms of Service</a> and <a className="text-primary hover:underline" href="#">Privacy Policy</a>.
                  </p>
                </div>
              )}
            </form>
          </div>
        </div>
        
        {/* Right Panel: Onboarding Visual Area */}
        <div className="hidden md:flex md:w-1/2 relative flex-col items-center justify-center p-16 overflow-hidden bg-[#0a0a0c]">
          {/* Subtle moving blobs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-primary/10 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-tertiary/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
          </div>
          
          {/* Shaded artwork backdrop */}
          <div className="absolute inset-0 tech-grid opacity-20 pointer-events-none mix-blend-overlay"></div>
          
          {/* Onboarding Carousel Slide Container */}
          <div className="w-full max-w-lg relative z-10 flex flex-col items-center">
            
            {/* Carousel Item */}
            <div className="w-full glass-panel rounded-2xl p-8 shadow-2xl relative overflow-hidden transition-all duration-500 hover:border-white/20 min-h-[300px] flex flex-col justify-between">
              
              {/* Color Bloom Effect behind the card */}
              <div 
                className="absolute -top-24 -left-24 w-48 h-48 rounded-full blur-[60px] transition-all duration-700 pointer-events-none"
                style={{ backgroundColor: onboardingSteps[activeStep].bgGlow }}
              />
              
              <div>
                {/* Floating animated icon */}
                <div className="w-14 h-14 bg-white/[0.03] border border-white/10 rounded-xl flex items-center justify-center mb-6 relative">
                  <span className={`material-symbols-outlined text-[32px] ${onboardingSteps[activeStep].accent} animate-[pulse_3s_infinite]`}>
                    {onboardingSteps[activeStep].icon}
                  </span>
                </div>
                
                {/* Slide title */}
                <h2 className="font-display text-2xl font-bold text-on-surface mb-3 tracking-tight transition-all duration-300">
                  {onboardingSteps[activeStep].title}
                </h2>
                
                {/* Slide description */}
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed transition-all duration-300">
                  {onboardingSteps[activeStep].description}
                </p>
              </div>

              {/* Dot Indicators */}
              <div className="flex gap-2.5 mt-8 items-center">
                {onboardingSteps.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setActiveStep(index)}
                    className={`h-2.5 rounded-full transition-all duration-300 ${activeStep === index ? `w-6 bg-primary` : 'w-2.5 bg-white/15 hover:bg-white/30'}`}
                    title={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="pt-[76px] flex font-body-md text-on-surface flex-1 w-full relative z-10 justify-center items-center bg-background min-h-[500px]">
        <div className="text-center space-y-4">
          <span className="material-symbols-outlined text-primary animate-spin text-[48px]">autorenew</span>
          <p className="text-on-surface-variant font-medium">Loading OptiMax authentication...</p>
        </div>
      </main>
    }>
      <LoginContent />
    </Suspense>
  );
}
