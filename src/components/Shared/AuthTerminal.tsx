import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Lock, 
  User as UserIcon, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  ArrowRight,
  Zap,
  Globe,
  Fingerprint
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface AuthTerminalProps {
  authMode: 'login' | 'register';
  setAuthMode: (mode: 'login' | 'register') => void;
  username: string;
  setUsername: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  handleLogin: (e: React.FormEvent) => void;
  handleGoogleLogin: () => void;
  isLoading: boolean;
}

export const AuthTerminal = ({
  authMode,
  setAuthMode,
  username,
  setUsername,
  password,
  setPassword,
  handleLogin,
  handleGoogleLogin,
  isLoading
}: AuthTerminalProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // 3D Tilt Logic
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [10, -10]), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-10, 10]), { stiffness: 150, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(mouseX / width - 0.5);
    y.set(mouseY / height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-[#0a0a0a]">
      {/* Immersive Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-amber-600/5 rounded-full blur-[120px] mix-blend-screen animate-pulse" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[100px] mix-blend-screen" />
        
        {/* Floating Grid Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[480px]"
      >
        {/* Shadow Layer for 3D depth */}
        <div className="absolute -inset-4 bg-black/40 blur-3xl rounded-[3rem] -z-10 translate-y-8 scale-95" />

        <div className="relative group overflow-hidden glass-card rounded-[2.5rem] border border-white/10 p-8 sm:p-12 space-y-8 bg-stone-950/40 backdrop-blur-2xl">
          {/* Internal Glows */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent opacity-50" />
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-600/10 rounded-full blur-3xl" />
          
          {/* Header */}
          <div className="text-center space-y-3 relative">
            <motion.div 
              style={{ transform: 'translateZ(50px)' }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="w-16 h-16 bg-amber-600 rounded-3xl mx-auto flex items-center justify-center shadow-[0_0_40px_rgba(217,119,6,0.3)] border border-amber-400/20"
            >
              <Zap size={32} className="text-stone-950" />
            </motion.div>
            
            <div style={{ transform: 'translateZ(40px)' }}>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-gradient">
                Access Terminal
              </h2>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="h-px w-8 bg-stone-800" />
                <p className="text-stone-500 text-[10px] font-black uppercase tracking-[0.3em]">
                  Encrypted Level 4
                </p>
                <span className="h-px w-8 bg-stone-800" />
              </div>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-6 relative" style={{ transform: 'translateZ(30px)' }}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={authMode}
                initial={{ x: 20, opacity: 0, filter: 'blur(10px)' }}
                animate={{ x: 0, opacity: 1, filter: 'blur(0px)' }}
                exit={{ x: -20, opacity: 0, filter: 'blur(10px)' }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                {/* Inputs */}
                <div className="space-y-4">
                  <div className="group/input space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-black text-stone-500 uppercase tracking-widest ml-4 transition-colors group-focus-within/input:text-amber-500">
                      <UserIcon size={12} />
                      Identifier
                    </label>
                    <motion.div 
                      whileTap={{ scale: 0.995 }}
                      className="relative"
                    >
                      <input 
                        type="text" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="w-full px-6 py-5 rounded-2xl bg-white/[0.03] border border-white/[0.05] text-white focus:border-amber-600/50 focus:bg-white/[0.05] outline-none transition-all placeholder:text-stone-700 text-sm font-medium"
                        placeholder={authMode === 'login' ? "ENTER USERNAME" : "CREATE USERNAME"}
                      />
                      <motion.div 
                        initial={false}
                        animate={{ 
                          opacity: 1,
                          boxShadow: "0 0 20px rgba(217, 119, 6, 0)"
                        }}
                        whileFocus={{ 
                          boxShadow: "0 0 20px rgba(217, 119, 6, 0.1)"
                        }}
                        className="absolute inset-0 rounded-2xl pointer-events-none border border-amber-600/0 transition-colors group-focus-within/input:border-amber-600/30" 
                      />
                    </motion.div>
                  </div>

                  <div className="group/input space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-black text-stone-500 uppercase tracking-widest ml-4 transition-colors group-focus-within/input:text-amber-500">
                      <Lock size={12} />
                      Access Key
                    </label>
                    <motion.div 
                      whileTap={{ scale: 0.995 }}
                      className="relative"
                    >
                      <input 
                        type={showPassword ? "text" : "password"} 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full px-6 py-5 rounded-2xl bg-white/[0.03] border border-white/[0.05] text-white focus:border-amber-600/50 focus:bg-white/[0.05] outline-none transition-all placeholder:text-stone-700 text-sm font-medium pr-14"
                        placeholder={authMode === 'login' ? "••••••••••••" : "CHOOSE PASSWORD"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-stone-600 hover:text-stone-400 transition-colors z-10"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                      <motion.div 
                        initial={false}
                        className="absolute inset-0 rounded-2xl pointer-events-none border border-amber-600/0 transition-colors group-focus-within/input:border-amber-600/30" 
                      />
                    </motion.div>
                  </div>
                </div>

                {/* Main Action */}
                <div className="space-y-4 pt-2">
                  <motion.button 
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98, y: 0 }}
                    type="submit"
                    disabled={isLoading}
                    className="group/btn relative w-full py-6 bg-amber-600 text-stone-950 rounded-2xl font-black text-xs uppercase tracking-[0.3em] overflow-hidden transition-all shadow-[0_20px_40px_rgba(217,119,6,0.2)]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] pointer-events-none" />
                    <span className="flex items-center justify-center gap-3 relative z-10">
                      {isLoading ? (
                        <RefreshCw size={18} className="animate-spin" />
                      ) : (
                        <>
                          {authMode === 'login' ? "Authorize Link" : "Initialize Account"}
                          <ArrowRight size={18} className="transition-transform group-hover/btn:translate-x-1" />
                        </>
                      )}
                    </span>
                  </motion.button>

                  <div className="flex items-center gap-4 px-2">
                    <div className="h-px flex-1 bg-white/5" />
                    <span className="text-[9px] font-black text-stone-600 uppercase tracking-[0.4em]">External Gate</span>
                    <div className="h-px flex-1 bg-white/5" />
                  </div>

                  {/* Google login */}
                  <motion.button 
                    whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.05)" }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full py-4 border border-white/5 rounded-2xl flex items-center justify-center gap-3 transition-all group/google"
                  >
                    <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center transition-colors group-hover/google:bg-white/10">
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 group-hover/google:text-white transition-colors">
                      Continue with Google
                    </span>
                  </motion.button>
                </div>
              </motion.div>
            </AnimatePresence>
          </form>

          {/* Footer toggle */}
          <div className="pt-4 text-center relative z-10" style={{ transform: 'translateZ(20px)' }}>
            <button 
              type="button"
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="group/toggle inline-flex flex-col items-center gap-2"
            >
              <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest group-hover/toggle:text-amber-500 transition-colors">
                {authMode === 'login' ? "New System User?" : "System Registered?"}
              </span>
              <span className="text-[9px] font-black text-amber-600/60 uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border border-amber-600/20 group-hover/toggle:bg-amber-600 group-hover/toggle:text-stone-950 transition-all">
                {authMode === 'login' ? "Open Registration" : "Return to Login"}
              </span>
            </button>
          </div>
        </div>

        {/* Floating status marks */}
        <div className="absolute -left-12 top-1/2 -translate-y-1/2 space-y-8 hidden md:block">
          {[AuthStatusIcon, AuthSecureIcon, AuthGlobalIcon].map((Icon, i) => (
            <motion.div
              key={i}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="w-10 h-10 rounded-xl glass border border-white/5 flex items-center justify-center text-stone-500 hover:text-amber-500 hover:border-amber-500/30 transition-all cursor-crosshair"
            >
              <Icon size={18} />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Decoys / Tech markings */}
      <div className="fixed bottom-8 left-8 flex items-center gap-4 opacity-20 hidden lg:flex">
        <div className="flex -space-x-2">
          {[1,2,3,4].map(i => <div key={i} className="w-8 h-8 rounded-full border border-white/20 bg-stone-900" />)}
        </div>
        <div className="text-[8px] font-mono text-stone-400 uppercase tracking-widest leading-none">
          Active Nodes: 12.04.1.22<br />
          Latency: 14ms (Direct)
        </div>
      </div>
    </div>
  );
};

const AuthStatusIcon = ({ size }: { size: number }) => <RefreshCw size={size} />;
const AuthSecureIcon = ({ size }: { size: number }) => <ShieldCheck size={size} />;
const AuthGlobalIcon = ({ size }: { size: number }) => <Globe size={size} />;
