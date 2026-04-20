import React, { useState, useCallback, useEffect } from 'react';
import { Apple, Lock, Shield, Zap, Smartphone, Download, RefreshCw, Database, Usb, Cpu, CheckCircle2, AlertCircle, Volume2, VolumeX } from 'lucide-react';
import { GlassCard } from '../../components/Shared/GlassCard';
import { User, Device, ServiceType, AppStep } from '../../types';
import { USBManager } from '../../services/usb/USBManager';
import { WebApple } from '../../services/usb/protocols';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { IPhoneBackground } from '../../components/Animations/ModuleBackgrounds';
import { hardwareService, DeviceIdentity, DeviceMode } from '../../services/hardwareService';
import { webUsb } from '../../services/webUsbService';

interface IPhoneModuleProps {
  user: User;
  usbDevice: USBDevice | null;
  usbMode: 'adb' | 'fastboot' | 'unknown' | null;
  addTerminalLine: (line: string) => void;
  terminalLines: string[];
  authFetch: (url: string, options?: any) => Promise<Response>;
  selectedModel: Device | null;
  setIsComplete: (complete: boolean) => void;
  uploadLogs: (status: string) => Promise<void>;
  step: AppStep;
  setStep: (step: AppStep) => void;
  selectedService: ServiceType | '';
  setSelectedService: (service: ServiceType) => void;
  setSelectedModel: (model: Device | null) => void;
}

type FlowState = 'idle' | 'device_connected' | 'service_selected' | 'waiting_for_mode' | 'unlocking' | 'success' | 'error' | 'unsupported';

export const IPhoneModule: React.FC<IPhoneModuleProps> = ({
  user,
  usbDevice: initialUsbDevice,
  usbMode,
  addTerminalLine,
  terminalLines,
  authFetch,
  selectedModel,
  setIsComplete,
  uploadLogs,
  step,
  setStep,
  selectedService,
  setSelectedService,
  setSelectedModel
}) => {
  const [flowState, setFlowState] = useState<FlowState>('idle');
  const [usbDevice, setUsbDevice] = useState<USBDevice | null>(initialUsbDevice);
  const [deviceIdentity, setDeviceIdentity] = useState<DeviceIdentity | null>(null);
  const [requiredMode, setRequiredMode] = useState<DeviceMode | null>(null);
  const [instruction, setInstruction] = useState<string>('');
  const [unlockProgress, setUnlockProgress] = useState(0);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [matchedExploit, setMatchedExploit] = useState<any>(null);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const speak = useCallback((text: string) => {
    if (!ttsEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }, [ttsEnabled]);

  const connectDevice = async (showAll = false) => {
    try {
      const device = showAll 
        ? await navigator.usb.requestDevice({ filters: [] })
        : await webUsb.requestDevice();
      
      await webUsb.connect(device);
      setUsbDevice(device);
      
      const identity = hardwareService.identifyDevice(device);
      setDeviceIdentity(identity);
      
      addTerminalLine(`[USB] Device Connected: ${identity.modelName}`);
      addTerminalLine(`[IDENT] Mode: ${identity.mode}`);

      if (flowState === 'waiting_for_mode') {
        if (identity.mode === requiredMode || requiredMode === 'Unknown') {
          setFlowState('unlocking');
          speak(`Good, connection established in ${identity.mode} mode. Hang on tight as I perform the unlock.`);
          startUnlockProcess(identity, matchedExploit);
        } else {
          speak(`Device connected, but it's in ${identity.mode} mode. Please follow the instructions to enter ${requiredMode} mode.`);
        }
      } else {
        setFlowState('device_connected');
        speak(`${identity.modelName} connected. Please choose a service to continue.`);
      }
    } catch (err) {
      addTerminalLine(`[ERROR] USB Connection failed: ${err}`);
      if (flowState === 'waiting_for_mode') {
        speak("Connection failed. Please try again.");
      }
    }
  };

  const handleServiceSelect = async (serviceId: ServiceType) => {
    setSelectedService(serviceId);
    
    if (!deviceIdentity) return;

    try {
      addTerminalLine(`> Searching local exploit database for ${deviceIdentity.modelName} Service:${serviceId}...`);
      
      // Log analytics
      authFetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'service_selected',
          screen: 'IPhoneModule',
          details: { model: deviceIdentity.modelName, service: serviceId }
        })
      }).catch(e => console.error(e));

      const res = await authFetch(`/api/exploits/match?vid=${deviceIdentity.vid.toString(16).padStart(4, '0').toUpperCase()}&pid=${deviceIdentity.pid.toString(16).padStart(4, '0').toUpperCase()}&service=${serviceId}&brand=${deviceIdentity.brand}`);
      const data = await res.json();

      if (data.found) {
        setMatchedExploit(data.exploit);
        setFlowState('service_selected');
        
        let targetMode: DeviceMode = 'DFU';
        let instr = data.exploit.manualSteps ? JSON.parse(data.exploit.manualSteps).join('\n') : '';
        let speechInstr = `Okay, you'll need to enter DFU mode. Connect the device, press volume up, volume down, then hold the power button until the screen goes black.`;

        setRequiredMode(targetMode);
        setInstruction(instr || speechInstr);
        
        if (deviceIdentity?.mode === targetMode) {
          setFlowState('unlocking');
          speak(`Device is already in ${targetMode} mode. Hang on tight as I perform the unlock.`);
          startUnlockProcess(deviceIdentity, data.exploit);
        } else {
          setFlowState('waiting_for_mode');
          speak(speechInstr);
        }
      } else {
        setFlowState('unsupported');
        speak(`Sorry, this device and service combination is not currently supported. Please provide your contact info to be notified when it is.`);
      }
    } catch (err) {
      addTerminalLine(`[ERROR] Failed to query exploit DB: ${err}`);
      setFlowState('error');
    }
  };

  const startUnlockProcess = async (identity: DeviceIdentity, exploit: any) => {
    setUnlockProgress(10);
    addTerminalLine(`[SYSTEM] Starting ${selectedService} for ${identity.modelName}...`);
    
    const commands = exploit.commands ? JSON.parse(exploit.commands) : [];
    let currentProgress = 10;
    
    for (const cmd of commands) {
      addTerminalLine(`> Executing: ${cmd}`);
      await new Promise(r => setTimeout(r, 1500));
      currentProgress += Math.floor(80 / Math.max(commands.length, 1));
      if (currentProgress > 90) currentProgress = 90;
      setUnlockProgress(currentProgress);
    }

    // Simulate finalization
    setTimeout(async () => {
      setUnlockProgress(100);
      setFlowState('success');
      addTerminalLine(`[SUCCESS] ${selectedService} completed successfully!`);
      speak(`Success! The ${selectedService} operation has been completed. Your device will now reboot.`);
      setIsComplete(true);
      await uploadLogs('success');
    }, 2000);
  };

  const handleRequestExploit = async () => {
    if (!deviceIdentity || !selectedService) return;
    try {
      await authFetch("/api/exploits/request", {
        method: 'POST',
        body: JSON.stringify({
          vid: deviceIdentity.vid.toString(16).padStart(4, '0').toUpperCase(),
          pid: deviceIdentity.pid.toString(16).padStart(4, '0').toUpperCase(),
          service: selectedService,
          email: contactEmail,
          phone: contactPhone
        })
      });
      alert("Request submitted! We will notify you when an exploit is available.");
      setFlowState('idle');
      setUsbDevice(null);
      setDeviceIdentity(null);
    } catch (err) {
      alert("Failed to submit request.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <GlassCard className="flex flex-col gap-8 liquid-glass relative overflow-hidden">
          <IPhoneBackground />
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center">
                <Apple className="text-stone-950 w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Apple Auto-Unlock</h3>
                <p className="text-stone-500 text-sm">Conversational Exploit Engine</p>
              </div>
            </div>
            <button 
              onClick={() => setTtsEnabled(!ttsEnabled)}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-stone-400 transition-colors"
              title={ttsEnabled ? "Disable Voice Prompts" : "Enable Voice Prompts"}
            >
              {ttsEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          </div>

          <div className="z-10 min-h-[300px] flex flex-col justify-center">
            <AnimatePresence mode="wait">
              {flowState === 'idle' && (
                <motion.div 
                  key="idle"
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                  className="text-center space-y-6"
                >
                  <div className="w-24 h-24 mx-auto rounded-full bg-stone-100/10 flex items-center justify-center animate-pulse">
                    <Usb className="w-10 h-10 text-stone-100" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-white">Connect Your Device</h2>
                    <p className="text-stone-400 max-w-sm mx-auto">Plug in your Apple device via USB to begin auto-detection.</p>
                  </div>
                  <button
                    onClick={() => connectDevice()}
                    className="px-8 py-4 bg-stone-100 text-stone-950 rounded-2xl font-black uppercase tracking-widest hover:bg-white transition-all shadow-lg shadow-white/20"
                  >
                    Detect Device
                  </button>
                </motion.div>
              )}

              {flowState === 'device_connected' && deviceIdentity && (
                <motion.div 
                  key="connected"
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div className="p-6 rounded-3xl bg-stone-100/10 border border-stone-100/20 text-center space-y-2">
                    <h2 className="text-xl font-black text-white">{deviceIdentity.modelName} Connected</h2>
                    <p className="text-stone-300 text-sm font-medium">Please choose a service to continue.</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'iCloud', label: 'iCloud Bypass', icon: Shield },
                      { id: 'MDM', label: 'MDM Removal', icon: Lock },
                      { id: 'FLASH', label: 'Restore iOS', icon: Download },
                      { id: 'FACTORY', label: 'Erase Device', icon: RefreshCw },
                    ].map(s => (
                      <button
                        key={s.id}
                        onClick={() => handleServiceSelect(s.id as ServiceType)}
                        className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-stone-100/50 transition-all flex flex-col items-center gap-3 text-center group"
                      >
                        <s.icon className="w-6 h-6 text-stone-400 group-hover:text-stone-100 transition-colors" />
                        <span className="text-xs font-bold text-stone-300 group-hover:text-white">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {flowState === 'unsupported' && (
                <motion.div 
                  key="unsupported"
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                  className="text-center space-y-6"
                >
                  <div className="p-6 rounded-3xl bg-red-500/10 border border-red-500/20 space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <h2 className="text-lg font-bold text-white">Device Not Supported</h2>
                    <p className="text-red-200 text-sm leading-relaxed">
                      We don't have an automated exploit for this device and service yet.
                      Provide your contact info and we'll notify you when it's available.
                    </p>
                  </div>

                  <div className="space-y-4 text-left">
                    <div>
                      <label className="text-xs font-bold text-stone-400 ml-2">Email</label>
                      <input 
                        type="email" 
                        value={contactEmail}
                        onChange={e => setContactEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white mt-1"
                        placeholder="you@example.com"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-stone-400 ml-2">Phone</label>
                      <input 
                        type="tel" 
                        value={contactPhone}
                        onChange={e => setContactPhone(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white mt-1"
                        placeholder="+1234567890"
                      />
                    </div>
                    <button
                      onClick={handleRequestExploit}
                      className="w-full py-4 bg-stone-100 text-stone-950 rounded-xl font-black uppercase tracking-widest hover:bg-white transition-all"
                    >
                      Notify Me
                    </button>
                    <button
                      onClick={() => setFlowState('idle')}
                      className="w-full py-4 bg-white/5 text-white rounded-xl font-bold hover:bg-white/10 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}

              {flowState === 'waiting_for_mode' && (
                <motion.div 
                  key="waiting"
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                  className="text-center space-y-8"
                >
                  <div className="p-6 rounded-3xl bg-blue-500/10 border border-blue-500/20 space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/20 flex items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-blue-400" />
                    </div>
                    <h2 className="text-lg font-bold text-white">Action Required</h2>
                    <p className="text-blue-200 text-sm leading-relaxed">{instruction}</p>
                  </div>

                  <button
                    onClick={() => connectDevice()}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-3"
                  >
                    <Usb className="w-5 h-5" />
                    Connect in {requiredMode} Mode
                  </button>
                </motion.div>
              )}

              {flowState === 'unlocking' && (
                <motion.div 
                  key="unlocking"
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="text-center space-y-8 py-8"
                >
                  <div className="relative w-32 h-32 mx-auto">
                    <div className="absolute inset-0 border-4 border-stone-100/20 rounded-full" />
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50" cy="50" r="48"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        className="text-stone-100 transition-all duration-500 ease-out"
                        strokeDasharray="301.59"
                        strokeDashoffset={301.59 - (301.59 * unlockProgress) / 100}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-3xl font-black text-white">{unlockProgress}%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-white">Unlocking Device...</h2>
                    <p className="text-stone-400 text-sm font-medium animate-pulse">Please do not disconnect the cable.</p>
                  </div>
                </motion.div>
              )}

              {flowState === 'success' && (
                <motion.div 
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-6 py-8"
                >
                  <div className="w-24 h-24 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-white">Unlock Successful!</h2>
                    <p className="text-stone-400">The device has been successfully unlocked and is rebooting.</p>
                  </div>
                  <button
                    onClick={() => {
                      setFlowState('idle');
                      setUsbDevice(null);
                      setDeviceIdentity(null);
                    }}
                    className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all"
                  >
                    Unlock Another Device
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
