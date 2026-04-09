import React from 'react';
import { motion } from 'framer-motion';

export const AndroidBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    <motion.div 
      animate={{ scale: [1, 1.1, 1], x: [0, 30, 0], y: [0, 20, 0] }} 
      transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} 
      style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)' }}
      className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] rounded-full will-change-transform" 
    />
    <motion.div 
      animate={{ scale: [1, 1.15, 1], x: [0, -20, 0], y: [0, -30, 0] }} 
      transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 1 }} 
      style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)' }}
      className="absolute top-[40%] -right-[10%] w-[50%] h-[50%] rounded-full will-change-transform" 
    />
    <motion.div 
      animate={{ rotate: 360 }} 
      transition={{ duration: 40, repeat: Infinity, ease: "linear" }} 
      className="absolute top-[20%] right-[20%] w-24 h-24 border border-emerald-500/10 rounded-3xl will-change-transform" 
    />
    <motion.div 
      animate={{ rotate: -360, scale: [1, 1.1, 1] }} 
      transition={{ duration: 35, repeat: Infinity, ease: "linear" }} 
      className="absolute bottom-[20%] left-[20%] w-16 h-16 border border-green-500/10 rounded-full will-change-transform" 
    />
  </div>
);

export const IPhoneBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    <motion.div 
      animate={{ scale: [1, 1.1, 1], x: [0, 25, 0], y: [0, 25, 0] }} 
      transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }} 
      style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)' }}
      className="absolute -top-[10%] -right-[10%] w-[60%] h-[60%] rounded-full will-change-transform" 
    />
    <motion.div 
      animate={{ scale: [1, 1.15, 1], x: [0, -20, 0], y: [0, -25, 0] }} 
      transition={{ duration: 19, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} 
      style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)' }}
      className="absolute top-[30%] -left-[10%] w-[50%] h-[50%] rounded-full will-change-transform" 
    />
    <motion.div 
      animate={{ y: [0, -15, 0], rotate: [12, 24, 12] }} 
      transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} 
      className="absolute top-[30%] left-[25%] w-20 h-20 border border-blue-500/10 rounded-2xl will-change-transform" 
    />
    <motion.div 
      animate={{ y: [0, 20, 0], scale: [1, 1.05, 1] }} 
      transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} 
      className="absolute bottom-[25%] right-[25%] w-12 h-12 border border-cyan-500/10 rounded-full will-change-transform" 
    />
  </div>
);

export const HuaweiBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    <motion.div 
      animate={{ scale: [1, 1.15, 1], x: [0, 20, 0], y: [0, 30, 0] }} 
      transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} 
      style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 70%)' }}
      className="absolute -top-[20%] left-[10%] w-[50%] h-[50%] rounded-full will-change-transform" 
    />
    <motion.div 
      animate={{ scale: [1, 1.1, 1], x: [0, -30, 0], y: [0, -20, 0] }} 
      transition={{ duration: 17, repeat: Infinity, ease: "easeInOut", delay: 1 }} 
      style={{ background: 'radial-gradient(circle, rgba(244,63,94,0.15) 0%, transparent 70%)' }}
      className="absolute bottom-[10%] -right-[10%] w-[60%] h-[60%] rounded-full will-change-transform" 
    />
    <motion.div 
      animate={{ rotate: [0, 90, 0], scale: [1, 1.05, 1] }} 
      transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }} 
      className="absolute top-[40%] right-[20%] w-0 h-0 border-l-[30px] border-l-transparent border-r-[30px] border-r-transparent border-b-[50px] border-b-red-500/10 will-change-transform" 
    />
    <motion.div 
      animate={{ rotate: [0, -90, 0], scale: [1, 1.1, 1] }} 
      transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }} 
      className="absolute bottom-[30%] left-[20%] w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[40px] border-t-rose-500/10 will-change-transform" 
    />
  </div>
);

export const FeaturePhoneBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    <motion.div 
      animate={{ scale: [1, 1.1, 1], x: [0, 25, 0], y: [0, 15, 0] }} 
      transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} 
      style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)' }}
      className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] rounded-full will-change-transform" 
    />
    <motion.div 
      animate={{ scale: [1, 1.15, 1], x: [0, -20, 0], y: [0, -25, 0] }} 
      transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 1 }} 
      style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%)' }}
      className="absolute top-[40%] -right-[10%] w-[50%] h-[50%] rounded-full will-change-transform" 
    />
    <motion.div 
      animate={{ opacity: [0.1, 0.4, 0.1], y: [0, -10, 0] }} 
      transition={{ duration: 6, repeat: Infinity, ease: "linear" }} 
      className="absolute top-[20%] right-[25%] w-8 h-8 bg-amber-500/10 will-change-transform" 
    />
    <motion.div 
      animate={{ opacity: [0.1, 0.5, 0.1], y: [0, 10, 0] }} 
      transition={{ duration: 8, repeat: Infinity, ease: "linear" }} 
      className="absolute bottom-[25%] left-[25%] w-12 h-12 bg-orange-500/10 will-change-transform" 
    />
    <motion.div 
      animate={{ opacity: [0.05, 0.3, 0.05] }} 
      transition={{ duration: 7, repeat: Infinity, ease: "linear" }} 
      className="absolute top-[50%] left-[10%] w-6 h-6 bg-yellow-500/10 will-change-transform" 
    />
  </div>
);
