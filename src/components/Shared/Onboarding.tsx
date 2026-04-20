import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Check, Globe, Loader2, AlertCircle } from 'lucide-react';
import { countries } from 'countries-list';
import getSymbolFromCurrency from 'currency-symbol-map';
import { cn } from '../../lib/utils';
import { GlassCard } from './GlassCard';

interface CountryData {
  code: string;
  name: string;
  currency: string;
  symbol: string;
  rate: number;
}

export const Onboarding = ({ onComplete }: { onComplete: () => void }) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CountryData | null>(null);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize and memoize country list
  const countryList = useMemo(() => {
    return Object.entries(countries).map(([code, data]) => {
      // countries-list provides currency as a comma-separated string or array 
      const rawCurrency = (data as any).currency;
      const currencyList: string[] = Array.isArray(rawCurrency) 
        ? rawCurrency 
        : typeof rawCurrency === 'string' 
          ? (rawCurrency as string).split(',') 
          : [];
      const currency = currencyList[0] || 'USD';
      
      return {
        code,
        name: data.name,
        currency,
        symbol: getSymbolFromCurrency(currency) || currency,
        rate: rates[currency] || 1
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [rates]);

  // Fetch live exchange rates
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        if (!res.ok) throw new Error('System sync failed');
        const data = await res.json();
        setRates(data.rates);
        setError(null);
      } catch (err) {
        console.error('Rate fetch error:', err);
        setError('Using offline exchange protocol (Legacy rates)');
        // Fallback rates for major currencies if API fails
        setRates({
          'USD': 1, 'EUR': 0.92, 'GBP': 0.78, 'NGN': 1540, 
          'GHS': 15.2, 'ZAR': 18.5, 'KES': 130, 'INR': 83.5, 
          'PKR': 278, 'AED': 3.67, 'SAR': 3.75, 'TRY': 32.5
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRates();
  }, []);

  const filteredCountries = useMemo(() => {
    return countryList.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) || 
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.currency.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, countryList]);

  const handleFinish = () => {
    if (!selected) return;
    localStorage.setItem('unlockpro_currency', selected.currency);
    localStorage.setItem('unlockpro_exchange_rate', selected.rate.toString());
    localStorage.setItem('unlockpro_country', selected.code);
    localStorage.setItem('unlockpro_onboarded', 'true');
    onComplete();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#0a0a09] backdrop-blur-3xl">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-amber-600 animate-spin mx-auto" />
          <p className="text-stone-500 text-xs font-black uppercase tracking-[0.4em] animate-pulse">
            Syncing Global Records...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#0a0a09]/98 backdrop-blur-2xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl h-full max-h-[700px] flex flex-col"
      >
        <GlassCard className="flex flex-col h-full bg-stone-900/40 border-stone-800/50 backdrop-blur-2xl overflow-hidden p-0">
          {/* Header */}
          <div className="p-8 pb-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1 text-left">
                <h1 className="text-2xl font-black text-white tracking-tighter uppercase">Localization</h1>
                <p className="text-stone-500 text-[10px] font-black uppercase tracking-[0.3em]">Configure Deployment Region</p>
              </div>
              <Globe className="text-amber-600/40" size={32} />
            </div>

            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-600 group-focus-within:text-amber-500 transition-colors" size={18} />
              <input
                autoFocus
                type="text"
                placeholder="Find country, territory, or currency..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-black/40 border border-stone-800 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-stone-700 focus:outline-none focus:border-amber-600/40 focus:ring-1 focus:ring-amber-600/20 transition-all font-medium"
              />
              <AnimatePresence>
                {search && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => setSearch('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-stone-600 hover:text-white uppercase tracking-widest"
                  >
                    Clear
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
            
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-950/20 border border-amber-900/30 rounded-lg">
                <AlertCircle size={12} className="text-amber-600" />
                <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest">{error}</span>
              </div>
            )}
          </div>

          {/* List - Scrollable */}
          <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
            <div className="grid grid-cols-1 gap-1 pb-4">
              {filteredCountries.length > 0 ? (
                filteredCountries.map(country => (
                  <button
                    key={country.code}
                    onClick={() => setSelected(country)}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-xl transition-all border group",
                      selected?.code === country.code 
                        ? "bg-amber-600/10 border-amber-600/40 text-white shadow-lg shadow-amber-600/5" 
                        : "bg-transparent border-transparent text-stone-500 hover:bg-white/[0.03] hover:text-stone-200"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-black transition-all",
                        selected?.code === country.code 
                          ? "bg-amber-600 text-black" 
                          : "bg-stone-800 text-stone-500 group-hover:bg-stone-700 group-hover:text-stone-300"
                      )}>
                        {country.code}
                      </div>
                      <div className="text-left">
                        <p className="font-bold tracking-tight">{country.name}</p>
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-40">
                          {country.currency} • {country.symbol}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {selected?.code === country.code ? (
                        <div className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center text-black">
                          <Check size={14} strokeWidth={4} />
                        </div>
                      ) : (
                        <span className="text-[10px] font-mono opacity-20 group-hover:opacity-40 transition-opacity">
                          {country.rate.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="py-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-stone-900 rounded-full flex items-center justify-center mx-auto border border-stone-800/50">
                    <Globe size={32} className="text-stone-700" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-white font-bold tracking-tight">Access Denied</p>
                    <p className="text-stone-500 text-[10px] font-black uppercase tracking-widest">Region not found in registry</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer - Finalize */}
          <div className="p-8 pt-4 bg-stone-900/50 border-t border-stone-800/50">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="space-y-1">
                <p className="text-[9px] font-black text-stone-600 uppercase tracking-widest">Active System</p>
                <p className="text-sm font-bold text-stone-200">{selected?.name || "Pending..."}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Exchange Sync</p>
                <p className="text-sm font-bold text-amber-500">
                  {selected ? `1 USD = ${selected.rate.toFixed(2)} ${selected.currency}` : "---"}
                </p>
              </div>
            </div>

            <motion.button
              disabled={!selected}
              whileHover={selected ? { scale: 1.01 } : {}}
              whileTap={selected ? { scale: 0.99 } : {}}
              onClick={handleFinish}
              className={cn(
                "w-full py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-xs transition-all",
                selected 
                  ? "bg-white text-stone-950 shadow-[0_20px_40px_rgba(255,255,255,0.05)] hover:bg-amber-600 hover:shadow-amber-600/20 active:bg-amber-700" 
                  : "bg-stone-800/50 text-stone-600 cursor-not-allowed border border-stone-800"
              )}
            >
              Finalize Protocol Connection
            </motion.button>
          </div>
        </GlassCard>
      </motion.div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
};
