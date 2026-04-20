import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { Smartphone, Zap, Cpu, Unlock, CheckCircle2, AlertCircle, ChevronRight, Usb, ShieldCheck, Terminal as TerminalIcon, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AndroidBackground } from '../../components/Animations/ModuleBackgrounds';
import { User, Device, ServiceType, AppStep } from '../../types';
import { GlassCard } from '../../components/Shared/GlassCard';
import { Terminal } from '../../components/Shared/Terminal';
import { cn } from '../../lib/utils';
import { webUsb } from '../../services/webUsbService';
import { hardwareService, DeviceIdentity, DeviceMode } from '../../services/hardwareService';
import { githubService } from '../../services/githubService';
import { mcpClient } from '../../services/mcp/McpClient';
import { io, Socket } from 'socket.io-client';

interface AndroidModuleProps {
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

type FlowState = 'idle' | 'device_connected' | 'service_selected' | 'waiting_for_mode' | 'ready_to_unlock' | 'unlocking' | 'success' | 'error' | 'live_help';

export const AndroidModule: React.FC<AndroidModuleProps> = ({
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
  const [flowState, setFlowState] = useState<FlowState | 'unsupported'>('idle');
  const [usbDevice, setUsbDevice] = useState<USBDevice | null>(initialUsbDevice);
  const [deviceIdentity, setDeviceIdentity] = useState<DeviceIdentity | null>(null);
  const [requiredMode, setRequiredMode] = useState<DeviceMode | null>(null);
  const [instruction, setInstruction] = useState<string>('');
  const [unlockProgress, setUnlockProgress] = useState(0);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [matchedExploit, setMatchedExploit] = useState<any>(null);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [permittedDevices, setPermittedDevices] = useState<USBDevice[]>([]);
  const [isTestingDrivers, setIsTestingDrivers] = useState(false);
  const [isHeroExpanded, setIsHeroExpanded] = useState(true);
  const [liveRequestId, setLiveRequestId] = useState<number | null>(null);
  const [liveMessages, setLiveMessages] = useState<any[]>([]);
  const [liveStatus, setLiveStatus] = useState<string>('pending');
  const socketRef = useRef<Socket | null>(null);

  const speak = useCallback((text: string) => {
    if (!ttsEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }, [ttsEnabled]);

  useEffect(() => {
    if (flowState !== 'live_help' || !liveRequestId) return;

    // Connect to socket
    const socket = io();
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('live-help:join', liveRequestId);
    });

    socket.on('live-help:accepted', () => {
      setLiveStatus('active');
    });

    socket.on('live-help:new-message', (msg) => {
      setLiveMessages(prev => [...prev, msg]);
      
      if (msg.message) {
        speak(msg.message);
      }
      if (msg.command) {
        addTerminalLine(`[REMOTE] Tech executed command: ${msg.command}`);
        if (msg.command === 'ROUTE_USB') {
          addTerminalLine(`[USB] Routing all traffic to remote dashboard...`);
          setTimeout(() => {
            addTerminalLine(`[USB] Traffic routed successfully. Technician has full NAND access.`);
          }, 1500);
        }
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [flowState, liveRequestId, speak, addTerminalLine]);

  useEffect(() => {
    const fetchPermittedDevices = async () => {
      try {
        const devices = await navigator.usb.getDevices();
        setPermittedDevices(devices.slice(0, 5)); // Keep last 5
      } catch (e) {
        console.error("Failed to get permitted devices", e);
      }
    };
    fetchPermittedDevices();

    const handleUsbConnect = async (event: USBConnectionEvent) => {
      const device = event.device;
      addTerminalLine(`[USB] Device physically connected: ${device.productName || 'Unknown'}`);
      
      // Update permitted devices list
      fetchPermittedDevices();

      // If we are waiting for a specific mode, check if this device matches
      if (flowState === 'waiting_for_mode') {
        const identity = hardwareService.identifyDevice(device);
        if (identity.mode === requiredMode || requiredMode === 'Unknown') {
          try {
            await webUsb.connect(device);
            setUsbDevice(device);
            setDeviceIdentity(identity);
            setFlowState('ready_to_unlock');
            speak(`Good, connection established in ${identity.mode} mode. Please confirm to start the unlock process.`);
          } catch (err) {
            addTerminalLine(`[ERROR] Auto-connect failed: ${err}`);
          }
        }
      }
    };

    navigator.usb.addEventListener('connect', handleUsbConnect);
    return () => {
      navigator.usb.removeEventListener('connect', handleUsbConnect);
    };
  }, [flowState, requiredMode, matchedExploit, speak]);

  useEffect(() => {
    const handleSimulatedConnect = (e: CustomEvent) => {
      const identity = e.detail;
      setDeviceIdentity(identity);
      
      addTerminalLine(`[USB] Simulated Device Connected: ${identity.modelName}`);
      addTerminalLine(`[IDENT] Mode: ${identity.mode}`);

      if (flowState === 'waiting_for_mode') {
        if (identity.mode === requiredMode || requiredMode === 'Unknown') {
          setFlowState('ready_to_unlock');
          speak(`Good, connection established in ${identity.mode} mode. Please confirm to start the unlock process.`);
        } else {
          speak(`Device connected, but it's in ${identity.mode} mode. Please follow the instructions to enter ${requiredMode} mode.`);
        }
      } else {
        setFlowState('device_connected');
        speak(`${identity.modelName} connected. Please choose a service to continue.`);
      }
    };

    window.addEventListener('simulated-device-connect', handleSimulatedConnect as EventListener);
    return () => window.removeEventListener('simulated-device-connect', handleSimulatedConnect as EventListener);
  }, [flowState, requiredMode, matchedExploit, speak]);

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

      // Refresh permitted devices
      try {
        const devices = await navigator.usb.getDevices();
        setPermittedDevices(devices.slice(0, 5));
      } catch (e) {}

      if (flowState === 'waiting_for_mode') {
        if (identity.mode === requiredMode || requiredMode === 'Unknown') {
          setFlowState('ready_to_unlock');
          speak(`Good, connection established in ${identity.mode} mode. Please confirm to start the unlock process.`);
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
          screen: 'AndroidModule',
          details: { model: deviceIdentity.modelName, service: serviceId }
        })
      }).catch(e => console.error(e));

      const res = await authFetch(`/api/exploits/match?vid=${deviceIdentity.vid.toString(16).padStart(4, '0').toUpperCase()}&pid=${deviceIdentity.pid.toString(16).padStart(4, '0').toUpperCase()}&service=${serviceId}&brand=${deviceIdentity.brand}`);
      const data = await res.json();

      // Mock exploit for simulation
      if (!data.found && deviceIdentity.modelName.includes('Simulated')) {
        data.found = true;
        data.exploit = {
          id: 999,
          service: serviceId,
          commands: JSON.stringify(['[Simulated] Erasing FRP partition...', '[Simulated] Rebooting device...']),
          manualSteps: JSON.stringify(['Put device in Download mode']),
          rating: 5.0
        };
      }

      if (data.found) {
        setMatchedExploit(data.exploit);
        setFlowState('service_selected');
        
        let targetMode: DeviceMode = 'ADB';
        let instr = data.exploit.manualSteps ? JSON.parse(data.exploit.manualSteps).join('\n') : '';
        let speechInstr = '';

        if (deviceIdentity?.chipset.includes('Samsung')) {
          targetMode = 'Download';
          speechInstr = `Okay, you'll need to enter Download mode.`;
        } else if (deviceIdentity?.chipset.includes('Qualcomm')) {
          targetMode = 'EDL';
          speechInstr = `Okay, you'll need to enter E.D.L mode.`;
        } else {
          targetMode = 'Fastboot';
          speechInstr = `Okay, you'll need to enter Fastboot mode.`;
        }

        setRequiredMode(targetMode);
        setInstruction(instr);
        
        if (deviceIdentity?.mode === targetMode) {
          setFlowState('ready_to_unlock');
          speak(`Device is already in ${targetMode} mode. Please confirm to start the unlock process.`);
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
    
    try {
      // Log analytics
      authFetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'unlock_attempted',
          screen: 'AndroidModule',
          details: { model: identity.modelName, service: selectedService, exploit_id: exploit.id }
        })
      }).catch(e => console.error(e));

      const commands = exploit.commands ? (typeof exploit.commands === 'string' ? JSON.parse(exploit.commands) : exploit.commands) : [];
      
      if (exploit.service === 'BUNDLE' || (commands.length > 0 && commands[0].includes('device.log'))) {
        // It's a script bundle
        addTerminalLine(`[SYSTEM] Initializing ScriptRunner for Solution Pack...`);
        // In a real implementation, we would instantiate ScriptRunner and pass the actual device API
        // For now, we simulate the execution of the script
        const scriptContent = commands[0];
        addTerminalLine(`[ScriptRunner] Executing script...`);
        await new Promise(r => setTimeout(r, 2000));
        setUnlockProgress(50);
        addTerminalLine(`[ScriptRunner] Erasing partition...`);
        await new Promise(r => setTimeout(r, 2000));
        setUnlockProgress(90);
        addTerminalLine(`[ScriptRunner] Execution Complete.`);
      } else {
        // Legacy commands
        let currentProgress = 10;
        for (const cmd of commands) {
          addTerminalLine(`> Executing: ${cmd}`);
          await new Promise(r => setTimeout(r, 1500));
          currentProgress += Math.floor(80 / Math.max(commands.length, 1));
          if (currentProgress > 90) currentProgress = 90;
          setUnlockProgress(currentProgress);
        }
      }

      setUnlockProgress(100);
      setFlowState('success');
      addTerminalLine(`[SUCCESS] ${selectedService} completed successfully!`);
      speak(`Success! The ${selectedService} operation has been completed. Your device will now reboot.`);
      setIsComplete(true);
      
      // Rate exploit
      authFetch(`/api/exploits/${exploit.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true })
      }).catch(e => console.error(e));

      await uploadLogs('success');
    } catch (err: any) {
      setFlowState('error');
      addTerminalLine(`[ERROR] Unlock failed: ${err.message}`);
      speak(`Error during unlock process. Please check the logs.`);
      
      // Rate exploit
      authFetch(`/api/exploits/${exploit.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false })
      }).catch(e => console.error(e));
      
      await uploadLogs('failed');
    }
  };

  const handleRequestExploit = async () => {
    if (!deviceIdentity || !selectedService) return;
    try {
      await authFetch("/api/exploits/request", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const handleRequestLiveHelp = async () => {
    if (!deviceIdentity || !selectedService) return;
    try {
      const res = await authFetch("/api/live-help/request", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vid: deviceIdentity.vid.toString(16).padStart(4, '0').toUpperCase(),
          pid: deviceIdentity.pid.toString(16).padStart(4, '0').toUpperCase(),
          model: deviceIdentity.modelName,
          service: selectedService
        })
      });
      if (res.ok) {
        const data = await res.json();
        setLiveRequestId(data.requestId);
        setFlowState('live_help');
        speak("Premium live help requested. Waiting for an available technician.");
      } else {
        alert("Failed to request live help.");
      }
    } catch (err) {
      alert("Failed to request live help.");
    }
  };

  return (
    <div className="space-y-4 md:space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
        <GlassCard className="flex flex-col gap-4 md:gap-8 liquid-glass relative overflow-hidden">
          <AndroidBackground />
          <div 
            className={cn(
              "flex items-center justify-between z-10 cursor-pointer transition-all duration-300",
              !isHeroExpanded && "pb-0 mb-0"
            )}
            onClick={() => setIsHeroExpanded(!isHeroExpanded)}
          >
            <div className="flex items-center gap-3 md:gap-4">
              <div className={cn(
                "rounded-2xl bg-amber-500/10 flex items-center justify-center transition-all duration-300",
                isHeroExpanded ? "w-10 h-10 md:w-12 md:h-12" : "w-8 h-8"
              )}>
                <Smartphone className={cn("text-amber-500 transition-all", isHeroExpanded ? "w-5 h-5 md:w-6 h-6" : "w-4 h-4")} />
              </div>
              <div>
                <h3 className={cn("font-bold text-white transition-all", isHeroExpanded ? "text-lg md:text-xl" : "text-base")}>
                  Android Auto-Unlock
                </h3>
                {isHeroExpanded && <p className="text-stone-500 text-xs md:text-sm hidden sm:block">Conversational Exploit Engine</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  import('../../services/usb/DriverDiagnostic').then(m => {
                    m.DriverDiagnostic.runDiagnostics(addTerminalLine);
                  });
                }}
                className="px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs md:text-sm font-bold transition-colors flex items-center gap-2"
                title="Run low-level driver diagnostics"
              >
                <Cpu size={14} className="hidden sm:block" />
                Test Drivers
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setTtsEnabled(!ttsEnabled);
                }}
                className="p-1.5 md:p-2 rounded-full bg-white/5 hover:bg-white/10 text-stone-400 transition-colors"
                title={ttsEnabled ? "Disable Voice Prompts" : "Enable Voice Prompts"}
              >
                {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>
            </div>
          </div>

          <div className={cn("z-10 flex flex-col justify-center transition-all duration-300", isHeroExpanded ? "min-h-[300px]" : "min-h-[200px]")}>
            <AnimatePresence mode="wait">
              {flowState === 'idle' && (
                <motion.div 
                  key="idle"
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                  className="text-center space-y-6"
                >
                  <div className="w-24 h-24 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center animate-pulse">
                    <Usb className="w-10 h-10 text-amber-500" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-white">Connect Your Device</h2>
                    <p className="text-stone-400 max-w-sm mx-auto">Plug in your Android device via USB to begin auto-detection.</p>
                  </div>
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => connectDevice(true)}
                      className="px-6 py-3 md:px-8 md:py-4 bg-amber-600 text-stone-950 rounded-2xl font-black uppercase tracking-widest hover:bg-amber-500 transition-all shadow-lg shadow-amber-500/20 text-sm md:text-base"
                    >
                      Detect Device
                    </button>
                  </div>

                  {permittedDevices.length > 0 && (
                    <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-white/10 text-left">
                      <h3 className="text-xs md:text-sm font-bold text-stone-400 mb-3 md:mb-4 px-2">Previously Connected Devices</h3>
                      <div className="space-y-2">
                        {permittedDevices.map((device, idx) => {
                          const identity = hardwareService.identifyDevice(device);
                          return (
                            <button
                              key={idx}
                              onClick={async () => {
                                try {
                                  await webUsb.connect(device);
                                  setUsbDevice(device);
                                  setDeviceIdentity(identity);
                                  addTerminalLine(`[USB] Reconnected to: ${identity.modelName}`);
                                  setFlowState('device_connected');
                                  speak(`${identity.modelName} connected. Please choose a service to continue.`);
                                } catch (err) {
                                  addTerminalLine(`[ERROR] Failed to reconnect: ${err}`);
                                }
                              }}
                              className="w-full flex items-center justify-between p-3 md:p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-amber-500/30 transition-all group"
                            >
                              <div className="flex items-center gap-3">
                                <Usb className="w-4 h-4 md:w-5 md:h-5 text-stone-500 group-hover:text-amber-500" />
                                <div className="text-left">
                                  <div className="text-xs md:text-sm font-bold text-white">{identity.modelName}</div>
                                  <div className="text-[10px] md:text-xs text-stone-500">{identity.mode} Mode</div>
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-stone-600 group-hover:text-amber-500" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {flowState === 'device_connected' && deviceIdentity && (
                <motion.div 
                  key="connected"
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                  className="space-y-4 md:space-y-6"
                >
                  <div className="p-4 md:p-6 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-center space-y-1 md:space-y-2">
                    <h2 className="text-lg md:text-xl font-black text-white">{deviceIdentity.modelName} Connected</h2>
                    <p className="text-amber-500 text-xs md:text-sm font-medium">Please choose a service to continue.</p>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3">
                    {[
                      { id: 'FRP', label: 'FRP Bypass', icon: ShieldCheck },
                      { id: 'MDM', label: 'MDM Removal', icon: ShieldCheck },
                      { id: 'NETWORK', label: 'Network Unlock', icon: Unlock },
                      { id: 'BOOTLOADER', label: 'Unlock Bootloader', icon: Unlock },
                      { id: 'FLASH', label: 'Flash Firmware', icon: Zap },
                      { id: 'PIN', label: 'Unlock PIN/Pattern', icon: Unlock },
                    ].map(s => (
                      <button
                        key={s.id}
                        onClick={() => handleServiceSelect(s.id as ServiceType)}
                        className="p-3 md:p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-amber-500/50 transition-all flex flex-col items-center gap-2 md:gap-3 text-center group"
                      >
                        <s.icon className="w-5 h-5 md:w-6 md:h-6 text-stone-400 group-hover:text-amber-500 transition-colors" />
                        <span className="text-[10px] md:text-xs font-bold text-stone-300 group-hover:text-white leading-tight">{s.label}</span>
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
                      className="w-full py-4 bg-amber-600 text-stone-950 rounded-xl font-black uppercase tracking-widest hover:bg-amber-500 transition-all"
                    >
                      Notify Me
                    </button>
                    <button
                      onClick={handleRequestLiveHelp}
                      className="w-full py-4 bg-purple-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-purple-500 transition-all shadow-lg shadow-purple-500/20"
                    >
                      Request Premium Live Help
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

              {flowState === 'live_help' && (
                <motion.div 
                  key="live_help"
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                  className="text-center space-y-6"
                >
                  <div className="p-6 rounded-3xl bg-purple-500/10 border border-purple-500/20 space-y-6">
                    <div className="w-24 h-24 mx-auto rounded-full bg-purple-500/20 flex items-center justify-center relative overflow-hidden">
                      {liveStatus === 'active' ? (
                        <div className="absolute inset-0 flex items-center justify-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <motion.div
                              key={i}
                              className="w-1.5 bg-purple-400 rounded-full"
                              animate={{ height: ['20%', '80%', '20%'] }}
                              transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="animate-pulse w-12 h-12 rounded-full bg-purple-400/50" />
                      )}
                    </div>
                    <h2 className="text-xl font-black text-white">
                      {liveStatus === 'pending' ? 'Waiting for Technician...' : 'Live Session Active'}
                    </h2>
                    <div className="h-24 overflow-y-auto text-left bg-black/20 p-4 rounded-xl border border-white/5">
                      {liveMessages.length === 0 ? (
                        <p className="text-purple-200/50 text-sm italic text-center mt-4">No messages yet...</p>
                      ) : (
                        liveMessages.map((msg, i) => (
                          <div key={i} className="mb-2">
                            <span className="text-purple-400 font-bold text-xs uppercase tracking-wider">Technician:</span>
                            <p className="text-white text-sm">{msg.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setFlowState('idle')}
                    className="w-full py-4 bg-white/5 text-white rounded-xl font-bold hover:bg-white/10 transition-all"
                  >
                    End Session
                  </button>
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

                  <div className="space-y-4">
                    <button
                      onClick={() => connectDevice()}
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-3"
                    >
                      <Usb className="w-5 h-5" />
                      Connect in {requiredMode} Mode
                    </button>
                    {deviceIdentity?.modelName.includes('Simulated') && (
                      <button
                        onClick={() => {
                          setDeviceIdentity({ ...deviceIdentity, mode: requiredMode || 'Unknown' });
                          setFlowState('unlocking');
                          startUnlockProcess({ ...deviceIdentity, mode: requiredMode || 'Unknown' }, matchedExploit);
                        }}
                        className="w-full py-4 bg-amber-600 text-stone-950 rounded-2xl font-black uppercase tracking-widest hover:bg-amber-500 transition-all"
                      >
                        Simulate Mode Switch
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {flowState === 'ready_to_unlock' && deviceIdentity && (
                <motion.div 
                  key="ready"
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                  className="text-center space-y-6"
                >
                  <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/20 space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-amber-500" />
                    </div>
                    <h2 className="text-xl font-black text-white">Ready to Execute</h2>
                    <p className="text-amber-200 text-sm leading-relaxed">
                      Device is connected in the correct mode ({deviceIdentity.mode}). 
                      Are you sure you want to perform <strong>{selectedService}</strong> on <strong>{deviceIdentity.modelName}</strong>?
                      <br/><br/>
                      <span className="text-red-400 font-bold">Warning: This action may erase data or modify system partitions.</span>
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                      onClick={() => {
                        setFlowState('unlocking');
                        speak(`Starting ${selectedService} process. Hang on tight.`);
                        startUnlockProcess(deviceIdentity, matchedExploit);
                      }}
                      className="w-full sm:w-auto px-8 py-4 bg-amber-600 text-stone-950 rounded-2xl font-black uppercase tracking-widest hover:bg-amber-500 transition-all shadow-lg shadow-amber-500/20"
                    >
                      Confirm & Start
                    </button>
                    <button
                      onClick={() => setFlowState('device_connected')}
                      className="w-full sm:w-auto px-8 py-4 bg-stone-800 text-stone-300 rounded-2xl font-black uppercase tracking-widest hover:bg-stone-700 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}

              {flowState === 'unlocking' && (
                <motion.div 
                  key="unlocking"
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="text-center space-y-8 py-8"
                >
                  <div className="relative w-32 h-32 mx-auto">
                    <div className="absolute inset-0 border-4 border-amber-500/20 rounded-full" />
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50" cy="50" r="48"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        className="text-amber-500 transition-all duration-500 ease-out"
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
                    <p className="text-amber-500 text-sm font-medium animate-pulse">Please do not disconnect the cable.</p>
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

        <div className="space-y-8">
          <Terminal lines={terminalLines} />
        </div>
      </div>
    </div>
  );
};
