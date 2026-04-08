import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Usb, Activity, CheckCircle2 } from 'lucide-react';

export const PhoneAnimation = ({ type }: { type: string }) => {
  return (
    <div className="relative w-full max-w-[300px] aspect-[9/19] mx-auto glass rounded-[3.5rem] border-[12px] border-white/[0.03] shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-b from-amber-900/10 to-stone-900/5" />
      <AnimatePresence mode="wait">
        {type === 'plug' && (
          <motion.div key="plug" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="flex flex-col items-center gap-10 z-10">
            <div className="relative">
              <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.5, 0.2] }} transition={{ repeat: Infinity, duration: 3 }} className="absolute inset-0 bg-amber-600 blur-3xl rounded-full" />
              <Usb className="w-28 h-28 text-amber-500 relative" />
            </div>
            <div className="w-2 h-32 bg-white/5 rounded-full relative overflow-hidden">
              <motion.div animate={{ y: [-64, 128] }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-transparent via-amber-500/50 to-transparent" />
            </div>
            <p className="text-amber-500/80 font-mono text-[10px] uppercase tracking-[0.4em] font-black">Awaiting Bridge</p>
          </motion.div>
        )}
        {type === 'button' && (
          <motion.div key="button" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col items-center gap-12 z-10">
            <div className="relative">
              <div className="w-32 h-32 rounded-full border border-white/5 flex items-center justify-center">
                <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }} transition={{ repeat: Infinity, duration: 2 }} className="w-20 h-20 bg-amber-600 rounded-full shadow-[0_0_60px_rgba(217,119,6,0.3)]" />
              </div>
              <div className="absolute -right-24 top-1/2 -translate-y-1/2 flex items-center gap-5">
                <motion.div animate={{ x: [0, -15, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="w-16 h-2.5 bg-amber-500/50 rounded-full" />
                <span className="text-[10px] font-mono text-amber-500 uppercase font-black tracking-widest">Hold</span>
              </div>
            </div>
            <p className="text-amber-500/80 font-mono text-[10px] uppercase tracking-[0.4em] font-black">Bootloader</p>
          </motion.div>
        )}
        {type === 'wait' && (
          <motion.div key="wait" className="flex flex-col items-center gap-10 z-10">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="2" fill="transparent" className="text-white/5" />
                <motion.circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="2" fill="transparent" strokeDasharray="351.8" animate={{ strokeDashoffset: [351.8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="text-amber-600" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Activity className="text-amber-600 w-10 h-10 animate-pulse" />
              </div>
            </div>
            <p className="text-stone-500 font-mono text-[10px] uppercase tracking-[0.4em] font-black">Syncing Data</p>
          </motion.div>
        )}
        {type === 'success' && (
          <motion.div key="success" initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} className="flex flex-col items-center gap-10 z-10">
            <div className="w-32 h-32 bg-amber-600 rounded-full flex items-center justify-center shadow-[0_0_80px_rgba(217,119,6,0.4)]">
              <CheckCircle2 className="w-20 h-20 text-stone-950" />
            </div>
            <p className="text-amber-500 font-mono text-[10px] uppercase tracking-[0.4em] font-black">Unlocked</p>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="absolute top-10 w-28 h-2.5 bg-white/5 rounded-full" />
      <div className="absolute bottom-10 w-16 h-16 rounded-full border border-white/5" />
    </div>
  );
};
