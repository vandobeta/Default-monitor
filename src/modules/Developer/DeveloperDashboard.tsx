import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Upload, Activity, DollarSign, Code, ShieldCheck, Clock, FileJson, Terminal as TerminalIcon } from 'lucide-react';
import { DriverDiagnostic } from '../../services/usb/DriverDiagnostic';

export function DeveloperDashboard({ authFetch }: { authFetch: (url: string, options?: any) => Promise<Response> }) {
  const [exploits, setExploits] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isUploading, setIsUploading] = useState(false);
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    fetchExploits();
  }, []);

  const fetchExploits = async () => {
    try {
      const res = await authFetch('/api/exploits');
      const data = await res.json();
      setExploits(data);
    } catch (err) {
      console.error("Failed to fetch exploits", err);
    }
  };

  const runDiagnostics = async () => {
    setIsTesting(true);
    setDiagnosticLogs([]);
    const logger = (msg: string) => setDiagnosticLogs(prev => [...prev, msg]);
    
    await DriverDiagnostic.runDiagnostics(logger);
    setIsTesting(false);
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUploading(true);
    
    const formData = new FormData(e.currentTarget);
    const file = formData.get('file') as File;
    
    const exploitData = {
      vid: formData.get('vid'),
      pid: formData.get('pid'),
      service: formData.get('service'),
      price: parseFloat(formData.get('price') as string) || 0,
      commands: (formData.get('commands') as string).split('\n').filter(c => c.trim() !== ''),
      manualSteps: (formData.get('manualSteps') as string).split('\n').filter(c => c.trim() !== '')
    };

    const uploadData = new FormData();
    uploadData.append('exploitData', JSON.stringify(exploitData));
    if (file && file.size > 0) {
      uploadData.append('file', file);
    }

    try {
      const res = await authFetch('/api/exploits', {
        method: 'POST',
        body: uploadData // Don't stringify FormData, let browser set multipart/form-data
      });
      
      const result = await res.json();
      if (result.success) {
        alert("Exploit uploaded successfully! It is now pending verification.");
        fetchExploits();
        setActiveTab('exploits');
      } else {
        alert("Upload failed: " + result.error);
      }
    } catch (err) {
      alert("An error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-black uppercase tracking-tighter">Developer Portal</h1>
        <div className="flex gap-4">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'overview' ? 'bg-amber-500 text-stone-950' : 'bg-stone-900 text-stone-400 hover:text-white'}`}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('exploits')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'exploits' ? 'bg-amber-500 text-stone-950' : 'bg-stone-900 text-stone-400 hover:text-white'}`}
          >
            My Exploits
          </button>
          <button 
            onClick={() => setActiveTab('upload')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'upload' ? 'bg-amber-500 text-stone-950' : 'bg-stone-900 text-stone-400 hover:text-white'}`}
          >
            Upload Exploit
          </button>
          <button 
            onClick={() => setActiveTab('api')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'api' ? 'bg-amber-500 text-stone-950' : 'bg-stone-900 text-stone-400 hover:text-white'}`}
          >
            API SDK
          </button>
          <button 
            onClick={() => setActiveTab('diagnostics')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'diagnostics' ? 'bg-amber-500 text-stone-950' : 'bg-stone-900 text-stone-400 hover:text-white'}`}
          >
            Diagnostics
          </button>
        </div>
      </div>

      {activeTab === 'diagnostics' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                  <TerminalIcon className="text-purple-500 w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Driver Simulation Test</h2>
                  <p className="text-stone-400">Run a self-test on all USB protocol drivers using a mock transport layer.</p>
                </div>
              </div>
              <button 
                onClick={runDiagnostics}
                disabled={isTesting}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
              >
                {isTesting ? 'Running...' : 'Run Diagnostics'}
              </button>
            </div>
            
            <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 min-h-[300px] max-h-[500px] overflow-y-auto font-mono text-sm space-y-1">
              {diagnosticLogs.length === 0 ? (
                <p className="text-stone-600 italic">Click "Run Diagnostics" to start the driver self-test...</p>
              ) : (
                diagnosticLogs.map((log, i) => (
                  <div key={i} className={`${log.includes('[PASS]') ? 'text-green-400' : log.includes('[FAIL]') ? 'text-red-400' : 'text-stone-300'}`}>
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'overview' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-stone-900/50 border border-stone-800 rounded-3xl p-8 space-y-4">
            <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
              <DollarSign className="text-amber-500 w-6 h-6" />
            </div>
            <p className="text-stone-400 font-medium">Total Earnings</p>
            <h3 className="text-4xl font-black">$0.00</h3>
          </div>
          <div className="bg-stone-900/50 border border-stone-800 rounded-3xl p-8 space-y-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <Activity className="text-blue-500 w-6 h-6" />
            </div>
            <p className="text-stone-400 font-medium">Active Exploits</p>
            <h3 className="text-4xl font-black">{exploits.filter(e => e.status === 'approved').length}</h3>
          </div>
          <div className="bg-stone-900/50 border border-stone-800 rounded-3xl p-8 space-y-4">
            <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
              <ShieldCheck className="text-purple-500 w-6 h-6" />
            </div>
            <p className="text-stone-400 font-medium">Success Rate</p>
            <h3 className="text-4xl font-black">0%</h3>
          </div>
        </motion.div>
      )}

      {activeTab === 'exploits' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {exploits.length === 0 ? (
            <div className="text-center py-20 bg-stone-900/30 rounded-3xl border border-stone-800 border-dashed">
              <Code className="w-16 h-16 text-stone-700 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-stone-300">No exploits yet</h3>
              <p className="text-stone-500 mt-2">Upload your first exploit to start earning.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {exploits.map((exploit) => (
                <div key={exploit.id} className="bg-stone-900 border border-stone-800 rounded-2xl p-6 flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h4 className="text-xl font-bold">{exploit.service}</h4>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        exploit.status === 'approved' ? 'bg-green-500/10 text-green-500' : 
                        exploit.status === 'pending' ? 'bg-amber-500/10 text-amber-500' : 
                        'bg-stone-800 text-stone-400'
                      }`}>
                        {exploit.status}
                      </span>
                    </div>
                    <p className="text-stone-400 font-mono text-sm">VID: {exploit.vid} | PID: {exploit.pid}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-stone-400 text-sm">Price</p>
                    <p className="text-xl font-bold text-amber-500">${exploit.price.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'upload' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <form onSubmit={handleUpload} className="bg-stone-900 border border-stone-800 rounded-3xl p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-400 uppercase tracking-wider">Vendor ID (VID)</label>
                <input required name="vid" type="text" placeholder="e.g. 05C6" className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none transition-colors font-mono" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-400 uppercase tracking-wider">Product ID (PID)</label>
                <input required name="pid" type="text" placeholder="e.g. 9008" className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none transition-colors font-mono" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-400 uppercase tracking-wider">Service Type</label>
                <select required name="service" className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none transition-colors">
                  <option value="FRP">FRP Bypass</option>
                  <option value="MDM">MDM Remove</option>
                  <option value="SIM">SIM Unlock</option>
                  <option value="BOOTLOADER">Bootloader Unlock</option>
                  <option value="FLASH">Firmware Flash</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-400 uppercase tracking-wider">Price (USD)</label>
                <input required name="price" type="number" step="0.01" min="0" placeholder="0.00" className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none transition-colors" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-400 uppercase tracking-wider">Exploit Binary / Script (Optional)</label>
              <div className="border-2 border-dashed border-stone-800 rounded-2xl p-8 text-center hover:border-amber-500/50 transition-colors">
                <input type="file" name="file" id="file-upload" className="hidden" accept=".bin,.pak,.hex,.da,.fdl,.js,.py,.sh,.json" />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-stone-950 rounded-full flex items-center justify-center">
                    <Upload className="w-8 h-8 text-stone-400" />
                  </div>
                  <div>
                    <p className="font-bold text-white">Click to upload binary or script</p>
                    <p className="text-sm text-stone-500 mt-1">Supported: .bin, .pak, .hex, .da, .fdl, .js, .py, .sh, .json</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-400 uppercase tracking-wider">Execution Commands (One per line)</label>
              <textarea name="commands" rows={4} placeholder="fastboot erase frp&#10;fastboot reboot" className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none transition-colors font-mono text-sm resize-none" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-400 uppercase tracking-wider">Manual Steps for User (One per line)</label>
              <textarea name="manualSteps" rows={3} placeholder="Hold Volume Down and Power&#10;Connect USB cable" className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none transition-colors text-sm resize-none" />
            </div>

            <button disabled={isUploading} type="submit" className="w-full py-4 bg-amber-500 text-stone-950 rounded-xl font-black uppercase tracking-widest hover:bg-amber-400 transition-colors disabled:opacity-50">
              {isUploading ? 'Uploading...' : 'Submit Exploit for Verification'}
            </button>
          </form>
        </motion.div>
      )}

      {activeTab === 'api' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <FileJson className="text-blue-500 w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Public API SDK</h2>
                <p className="text-stone-400">Embed UnlockPro services in your own platform.</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 flex justify-between items-center">
                <div>
                  <p className="text-sm text-stone-500 font-bold uppercase tracking-wider">Live API Key</p>
                  <p className="font-mono text-stone-300 mt-1">sk_live_***************************</p>
                </div>
                <button className="px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg text-sm font-bold transition-colors">Reveal</button>
              </div>
              <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 flex justify-between items-center">
                <div>
                  <p className="text-sm text-stone-500 font-bold uppercase tracking-wider">Test API Key</p>
                  <p className="font-mono text-stone-300 mt-1">sk_test_***************************</p>
                </div>
                <button className="px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg text-sm font-bold transition-colors">Reveal</button>
              </div>
            </div>
          </div>

          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 space-y-6">
            <h3 className="text-xl font-bold">Quickstart</h3>
            <div className="space-y-4">
              <div className="bg-stone-950 rounded-xl p-4 border border-stone-800 overflow-x-auto">
                <pre className="text-sm font-mono text-stone-300">
                  <code className="text-blue-400">const</code> response = <code className="text-blue-400">await</code> fetch(<code className="text-green-400">'https://api.unlockpro.com/v1/unlock'</code>, {'{\n'}
                  {'  '}method: <code className="text-green-400">'POST'</code>,{'\n'}
                  {'  '}headers: {'{\n'}
                  {'    '}<code className="text-green-400">'x-api-key'</code>: <code className="text-green-400">'your_api_key'</code>,{'\n'}
                  {'    '}<code className="text-green-400">'Content-Type'</code>: <code className="text-green-400">'application/json'</code>{'\n'}
                  {'  }'},{'\n'}
                  {'  '}body: JSON.stringify({'{\n'}
                  {'    '}model: <code className="text-green-400">'Samsung Galaxy S23'</code>,{'\n'}
                  {'    '}service: <code className="text-green-400">'FRP'</code>{'\n'}
                  {'  }'}){'\n'}
                  {'}'});
                </pre>
              </div>
              <p className="text-stone-400 text-sm">
                You will be charged a base price per API call. You can set your own markup for your users.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
