import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Smartphone, Usb, Zap, ChevronRight, Info, Globe2 } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { cn } from '../../lib/utils';

interface GuideStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  modes?: string[];
  isPreferences?: boolean;
}

const GUIDE_STEPS: GuideStep[] = [
  {
    id: 'preferences',
    title: 'Regional Settings',
    description: 'Customize your experience by selecting your country, language, and preferred currency.',
    icon: Globe2,
    isPreferences: true
  },
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
  const [countries, setCountries] = useState<any[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [exchangeRates, setExchangeRates] = useState<any>(null);

  useEffect(() => {
    // Fetch countries
    fetch('https://restcountries.com/v3.1/all?fields=name,cca2,languages,currencies')
      .then(res => res.json())
      .then(data => {
        const sorted = data.sort((a: any, b: any) => a.name.common.localeCompare(b.name.common));
        setCountries(sorted);
      })
      .catch(console.error);

    // Fetch exchange rates
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(res => res.json())
      .then(data => setExchangeRates(data.rates))
      .catch(console.error);
  }, []);

  const handleCountryChange = (cca2: string) => {
    setSelectedCountry(cca2);
    const country = countries.find(c => c.cca2 === cca2);
    if (country) {
      if (country.currencies) {
        const currCode = Object.keys(country.currencies)[0];
        setSelectedCurrency(currCode);
      }
      if (country.languages) {
        const langName = Object.values(country.languages)[0] as string;
        setSelectedLanguage(langName);
      }
    }
  };

  const next = () => {
    if (currentStep === 0) {
      // Save preferences
      localStorage.setItem('unlockpro_currency', selectedCurrency);
      localStorage.setItem('unlockpro_language', selectedLanguage);
      localStorage.setItem('unlockpro_country', selectedCountry);
      if (exchangeRates && exchangeRates[selectedCurrency]) {
        localStorage.setItem('unlockpro_exchange_rate', exchangeRates[selectedCurrency].toString());
      }
    }

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
            <h2 className="text-xl font-black uppercase tracking-tighter">
              {GUIDE_STEPS[currentStep].isPreferences ? 'Setup' : 'Connection Protocol'}
            </h2>
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
              <div className="w-20 h-20 rounded-3xl bg-amber-600 flex items-center justify-center text-stone-950 shadow-[0_0_50px_rgba(217,119,6,0.3)] shrink-0">
                {React.createElement(GUIDE_STEPS[currentStep].icon, { size: 40 })}
              </div>
              <div>
                <h3 className="text-3xl font-black uppercase tracking-tighter">{GUIDE_STEPS[currentStep].title}</h3>
                <p className="text-stone-400 font-medium">{GUIDE_STEPS[currentStep].description}</p>
              </div>
            </div>

            {GUIDE_STEPS[currentStep].isPreferences ? (
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Country</label>
                  <select 
                    value={selectedCountry}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-amber-500/50 transition-colors"
                  >
                    <option value="">Select your country...</option>
                    {countries.map(c => (
                      <option key={c.cca2} value={c.cca2} className="bg-stone-900">{c.name.common}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Language</label>
                    <input 
                      type="text" 
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-amber-500/50 transition-colors"
                      placeholder="e.g. English"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Currency</label>
                    <select 
                      value={selectedCurrency}
                      onChange={(e) => setSelectedCurrency(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-amber-500/50 transition-colors"
                    >
                      <option value="USD" className="bg-stone-900">USD - US Dollar</option>
                      {exchangeRates && Object.keys(exchangeRates).map(curr => (
                        <option key={curr} value={curr} className="bg-stone-900">{curr}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {exchangeRates && selectedCurrency !== 'USD' && exchangeRates[selectedCurrency] && (
                  <div className="text-[10px] text-amber-500/80 font-medium bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                    Current Exchange Rate: 1 USD = {exchangeRates[selectedCurrency]} {selectedCurrency}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {GUIDE_STEPS[currentStep].modes?.map((mode, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="w-6 h-6 rounded-full bg-amber-600/10 flex items-center justify-center text-amber-500 text-[10px] font-black">
                      {i + 1}
                    </div>
                    <span className="text-xs font-medium text-stone-300">{mode}</span>
                  </div>
                ))}
              </div>
            )}
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
            {currentStep === GUIDE_STEPS.length - 1 ? 'Enter Terminal' : (currentStep === 0 ? 'Save & Continue' : 'Next Protocol')}
            <ChevronRight size={16} />
          </button>
        </div>
      </GlassCard>
    </div>
  );
};
