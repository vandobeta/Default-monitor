import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

export const GlassCard = ({ children, className, delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    className={cn("glass-card rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-8", className)}
  >
    {children}
  </motion.div>
);
