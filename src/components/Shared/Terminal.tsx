import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

export const Terminal = ({ lines }: { lines: string[] }) => (
  <div className="bg-stone-950/80 backdrop-blur-lg border border-white/5 rounded-3xl p-4 sm:p-8 font-mono text-[11px] leading-relaxed overflow-hidden shadow-2xl">
    <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
      <div className="flex items-center gap-2">
        <div className="flex gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-stone-800" />
          <div className="w-2.5 h-2.5 rounded-full bg-stone-800" />
          <div className="w-2.5 h-2.5 rounded-full bg-stone-800" />
        </div>
        <span className="text-stone-600 ml-3 text-[10px] font-bold uppercase tracking-widest">Engine v6.0.0-real</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-1 h-1 rounded-full bg-amber-500 animate-ping" />
        <span className="text-[8px] font-black text-amber-500/60 uppercase tracking-widest">AI Learning Active</span>
      </div>
    </div>
    <div className="space-y-1.5 h-48 overflow-y-auto scrollbar-hide">
      {lines.map((line, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className={cn(
            line.startsWith('>') ? "text-amber-500" : 
            line.startsWith('[ERROR]') ? "text-red-400" : 
            line.startsWith('[OK]') ? "text-amber-200" : "text-stone-500"
          )}
        >
          {line}
        </motion.div>
      ))}
      <motion.div 
        animate={{ opacity: [1, 0] }}
        transition={{ repeat: Infinity, duration: 0.8 }}
        className="inline-block w-1.5 h-3.5 bg-amber-600 align-middle ml-1"
      />
    </div>
  </div>
);
