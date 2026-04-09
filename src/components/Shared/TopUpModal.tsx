import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Smartphone, CreditCard, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';

export function TopUpModal({ isOpen, onClose, onTopUp }: { isOpen: boolean, onClose: () => void, onTopUp: (data: any) => Promise<void> }) {
  const [amount, setAmount] = useState(10);
  const [method, setMethod] = useState<'momo' | 'ussd' | 'card'>('momo');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('GH');
  const [provider, setProvider] = useState('mtn');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onTopUp({ amount, method, phone, country, provider });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-stone-900 border border-white/10 rounded-3xl p-6 space-y-6"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Add Funds</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-white"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-stone-500">Amount (USD)</label>
            <input 
              type="number" 
              value={amount} 
              onChange={e => setAmount(Number(e.target.value))}
              min="1"
              className="w-full bg-stone-950 border border-white/10 rounded-xl p-4 text-white font-black text-xl focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => setMethod('momo')} className={cn("p-3 rounded-xl border text-xs font-bold uppercase tracking-widest flex flex-col items-center gap-2", method === 'momo' ? "bg-amber-600/20 border-amber-500 text-amber-500" : "border-white/10 text-stone-500 hover:bg-white/5")}>
              <Smartphone size={20} /> MoMo
            </button>
            <button type="button" onClick={() => setMethod('ussd')} className={cn("p-3 rounded-xl border text-xs font-bold uppercase tracking-widest flex flex-col items-center gap-2", method === 'ussd' ? "bg-amber-600/20 border-amber-500 text-amber-500" : "border-white/10 text-stone-500 hover:bg-white/5")}>
              <Smartphone size={20} /> USSD
            </button>
            <button type="button" onClick={() => setMethod('card')} className={cn("p-3 rounded-xl border text-xs font-bold uppercase tracking-widest flex flex-col items-center gap-2", method === 'card' ? "bg-amber-600/20 border-amber-500 text-amber-500" : "border-white/10 text-stone-500 hover:bg-white/5")}>
              <CreditCard size={20} /> Card
            </button>
          </div>

          {(method === 'momo' || method === 'ussd') && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-500">Country</label>
                  <select value={country} onChange={e => setCountry(e.target.value)} className="w-full bg-stone-950 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-amber-500">
                    <option value="GH">Ghana</option>
                    <option value="NG">Nigeria</option>
                    <option value="KE">Kenya</option>
                    <option value="ZA">South Africa</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-500">Provider</label>
                  <select value={provider} onChange={e => setProvider(e.target.value)} className="w-full bg-stone-950 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-amber-500">
                    {method === 'momo' ? (
                      <>
                        <option value="mtn">MTN</option>
                        <option value="vod">Vodafone/Telecel</option>
                        <option value="tgo">AirtelTigo</option>
                        <option value="mpesa">M-PESA</option>
                      </>
                    ) : (
                      <>
                        <option value="737">GTBank (737)</option>
                        <option value="919">UBA (919)</option>
                        <option value="822">Sterling (822)</option>
                        <option value="966">Zenith (966)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
              
              {method === 'momo' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-500">Mobile Number</label>
                  <input 
                    type="tel" 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)}
                    placeholder="e.g. 0551234567"
                    className="w-full bg-stone-950 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-amber-500"
                    required={method === 'momo'}
                  />
                </div>
              )}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-4 bg-amber-600 text-stone-950 rounded-xl font-black uppercase tracking-widest hover:bg-amber-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? <RefreshCw size={20} className="animate-spin" /> : 'Proceed to Payment'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
