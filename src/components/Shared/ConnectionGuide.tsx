import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Smartphone, Usb, Zap, ChevronRight, Info } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { cn } from '../../lib/utils';

interface GuideStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  modes: string[];
}

const GUIDE_STEPS: GuideStep[] = [
  {
    id: 'adb',
    title: 'ADB Mode',
    description: 'Enable USB Debugging in Developer Options. This allows the bridge to communicate with the Android OS.',
    icon: Smartphone,
    modes: ['Settings > About Phone > Tap Build Number 7x', 'Settings > System > Developer Options > USB Debugging']
  },
  {
    id: 'fastboot',
    title: 'Fastboot Mode',
    description: 'Low-level bootloader access. Essential for flashing and deep system repairs.',
    icon: Zap,
    modes: ['Power Off', 'Hold Volume Down + Power', 'Connect USB when logo appears']
  },
  {
    id: 'keypad',
    title: 'Keypad Boot Keys',
    description: 'For feature phones, specific keys must be held while inserting the USB cable.',
    icon: Usb,
    modes: ['Hold "0" or "*" or "Center Key"', 'Insert USB while holding', 'Wait for MTK/SPD handshake']
  }
];

export const ConnectionGuide = ({ onComplete }: { onComplete: () => void }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const next = () => {
    if (currentStep < GUIDE_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />
      <GlassCard className="max-w-2xl w-full p-8 sm:p-12 liquid-glass relative z-10 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 flex items-center justify-center text-amber-500">
              <Info size={20} />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tighter">Connection Protocol</h2>
          </div>
          <div className="text-[10px] font-black text-stone-500 uppercase tracking-widest">
            Step {currentStep + 1} of {GUIDE_STEPS.length}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-3xl bg-amber-600 flex items-center justify-center text-stone-950 shadow-[0_0_50px_rgba(217,119,6,0.3)]">
                {React.createElement(GUIDE_STEPS[currentStep].icon, { size: 40 })}
              </div>
              <div>
                <h3 className="text-3xl font-black uppercase tracking-tighter">{GUIDE_STEPS[currentStep].title}</h3>
                <p className="text-stone-400 font-medium">{GUIDE_STEPS[currentStep].description}</p>
              </div>
            </div>

            <div className="space-y-3">
              {GUIDE_STEPS[currentStep].modes.map((mode, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="w-6 h-6 rounded-full bg-amber-600/10 flex items-center justify-center text-amber-500 text-[10px] font-black">
                    {i + 1}
                  </div>
                  <span className="text-xs font-medium text-stone-300">{mode}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-4 pt-4">
          <div className="flex-1 flex gap-2">
            {GUIDE_STEPS.map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "h-1 rounded-full transition-all duration-500",
                  i === currentStep ? "w-8 bg-amber-600" : "w-2 bg-white/10"
                )} 
              />
            ))}
          </div>
          <button 
            onClick={next}
            className="px-8 py-4 bg-white text-stone-950 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-600 hover:text-white transition-all flex items-center gap-3"
          >
            {currentStep === GUIDE_STEPS.length - 1 ? 'Enter Terminal' : 'Next Protocol'}
            <ChevronRight size={16} />
          </button>
        </div>
      </GlassCard>
    </div>
  );
};
