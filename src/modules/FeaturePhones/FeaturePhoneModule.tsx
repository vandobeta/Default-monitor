import React, { useState, useCallback } from 'react';
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { Smartphone, Zap, Cpu, Unlock, CheckCircle2, AlertCircle, ChevronRight, Usb } from 'lucide-react';
import { motion } from 'motion/react';
import { User, Device, ServiceType, AppStep } from '../../types';
import { GlassCard } from '../../components/Shared/GlassCard';
import { Terminal } from '../../components/Shared/Terminal';
import { cn } from '../../lib/utils';
import { webUsb } from '../../services/webUsbService';
import { hardwareService, DeviceIdentity, DeviceMode } from '../../services/hardwareService';
import { githubService } from '../../services/githubService';
import { mcpClient } from '../../services/mcp/McpClient';

interface FeaturePhoneModuleProps {
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

export const FeaturePhoneModule: React.FC<FeaturePhoneModuleProps> = ({
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
  const [isSmartUnlocking, setIsSmartUnlocking] = useState(false);
  const [smartProgress, setSmartProgress] = useState(0);
  const [usbDevice, setUsbDevice] = useState<USBDevice | null>(initialUsbDevice);
  const [deviceIdentity, setDeviceIdentity] = useState<DeviceIdentity | null>(null);

  // Auto-start AI sequence if we are in unlocking step
  React.useEffect(() => {
    if (step === 'unlocking' && !isSmartUnlocking && usbDevice) {
      smartUnlock();
    }
  }, [step, usbDevice]);

  const connectDevice = async () => {
    if (!navigator.usb) {
      addTerminalLine(`[ERROR] WebUSB API is not supported or is blocked by your browser/policy.`);
      addTerminalLine(`[HINT] Ensure you are using Chrome/Edge and the page is served over HTTPS.`);
      return;
    }
    try {
      const device = await webUsb.requestDevice();
      await webUsb.connect(device);
      setUsbDevice(device);
      
      const identity = hardwareService.identifyDevice(device);
      setDeviceIdentity(identity);
      
      addTerminalLine(`[USB] Connected: ${device.productName}`);
      addTerminalLine(`[IDENT] Chipset: ${identity.chipset} | Mode: ${identity.mode}`);
      addTerminalLine(`[IDENT] VID: 0x${identity.vid.toString(16).toUpperCase()} | PID: 0x${identity.pid.toString(16).toUpperCase()}`);
    } catch (err) {
      addTerminalLine(`[ERROR] USB Connection failed: ${err}`);
    }
  };

  const executeTool = async (name: string, args: any) => {
    try {
      const result = await mcpClient.callTool(name, args);
      return result;
    } catch (err) {
      return { error: String(err) };
    }
  };

  const smartUnlock = async () => {
    if (!usbDevice || !user) return;
    setIsSmartUnlocking(true);
    setSmartProgress(5);
    addTerminalLine(`[SMART] Initiating AI-Driven Hardware Handshake...`);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = "gemini-3.1-pro-preview";
      
      const history: any[] = [
        {
          role: "user",
          parts: [{
            text: `
              Connected Device: ${usbDevice.productName} (${usbDevice.vendorId}:${usbDevice.productId})
              Current Mode: ${usbMode}
              
              DETERMINISTIC SEQUENCE:
              1. Call get_device_info to confirm hardware identity (VID/PID).
              2. Determine chipset family (MTK, SPD, Qualcomm).
              3. Check hardware://protocols/capabilities to see if the protocol requires a custom loader (DA/FDL/Firehose).
              4. If a custom loader is required:
                 a. Query GEMINI.md via fetch_loader_from_github.
                 b. Push binary to RAM via push_binary_to_device.
              5. Once stable (or if no loader is required), call execute_protocol_command(command='read_info') to gather IMEI and security patch.
              6. Execute target operation: ${selectedService}.
              7. Report final status.
              
              Use the provided MCP tools to interact with the hardware.
            `
          }]
        }
      ];

      let iterations = 0;
      const MAX_ITERATIONS = 10;

      while (iterations < MAX_ITERATIONS) {
        iterations++;
        const toolsResponse = await mcpClient.listTools();
        const mcpTools = toolsResponse.tools.map((t: any) => ({
          name: t.name,
          description: t.description,
          parameters: t.inputSchema
        }));

        const response = await ai.models.generateContent({
          model,
          contents: history,
          config: {
            tools: [{ functionDeclarations: mcpTools }]
          }
        });

        const candidate = response.candidates?.[0];
        if (!candidate) break;

        // Add model's response to history
        history.push(candidate.content);

        if (candidate.content.parts[0].functionCall) {
          const functionCalls = candidate.content.parts.filter(p => p.functionCall).map(p => p.functionCall!);
          const functionResponses = [];

          for (const call of functionCalls) {
            const result = await executeTool(call.name, call.args);
            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: result
              }
            });

            // Update progress
            if (call.name === 'fetch_loader_from_github') setSmartProgress(30);
            if (call.name === 'push_binary_to_device') setSmartProgress(60);
            if (call.name === 'execute_protocol_command') setSmartProgress(90);
          }

          // Add function responses to history
          history.push({
            role: "function",
            parts: functionResponses
          });
        } else {
          // No more function calls, we are done
          addTerminalLine(`[AI] Final Report: ${response.text}`);
          break;
        }
      }

      addTerminalLine(`[SUCCESS] AI Sequence Completed.`);
      setSmartProgress(100);
      setIsComplete(true);
      await uploadLogs('success');

    } catch (error) {
      addTerminalLine(`[ERROR] Smart Unlock Failed: ${error}`);
      await uploadLogs('failed');
    } finally {
      setIsSmartUnlocking(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <GlassCard className="flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                <Smartphone className="text-amber-500 w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Feature Phone Module</h3>
                <p className="text-stone-500 text-sm">Specialized for keypad & legacy devices</p>
              </div>
            </div>
            <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-500 uppercase tracking-widest">
              {step === 'selection' ? 'Connection Phase' : 'Unlock Phase'}
            </div>
          </div>

          {step === 'selection' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-3xl bg-white/[0.02] border border-white/5 space-y-2">
                  <div className="flex items-center gap-2 text-stone-500">
                    <Cpu className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Chipsets</span>
                  </div>
                  <p className="text-lg font-bold text-white">MTK, SPD, RDA</p>
                </div>
                <div className="p-4 rounded-3xl bg-white/[0.02] border border-white/5 space-y-2">
                  <div className="flex items-center gap-2 text-stone-500">
                    <Zap className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Speed</span>
                  </div>
                  <p className="text-lg font-bold text-white">Ultra-Fast</p>
                </div>
              </div>

              <div className="space-y-4">
                {!navigator.usb && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-[10px] font-bold uppercase tracking-widest">
                    <AlertCircle size={16} />
                    WebUSB Disallowed by Browser Policy
                  </div>
                )}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={connectDevice}
                  className={cn(
                    "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3",
                    usbDevice ? "bg-stone-800 text-amber-500 border border-amber-500/20" : "bg-white text-stone-950 hover:bg-stone-100"
                  )}
                >
                  <Usb className="w-4 h-4" />
                  {usbDevice ? `Connected: ${usbDevice.productName}` : "Connect Device via USB"}
                </motion.button>

                {usbDevice && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-3xl space-y-4">
                      <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Select Service</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                          { id: 'FRP', label: 'FRP Bypass' },
                          { id: 'MDM', label: 'MDM Bypass' },
                          { id: 'FLASH', label: 'Flash Software' },
                          { id: 'IMEI', label: 'Repair IMEI' },
                          { id: 'NVRAM', label: 'NVRAM Management' },
                          { id: 'RESCUE', label: 'Rescue / Unbrick' },
                          { id: 'FACTORY', label: 'Factory Reset' }
                        ].map(s => (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            key={s.id}
                            onClick={() => setSelectedService(s.id as ServiceType)}
                            className={cn(
                              "px-4 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                              selectedService === s.id ? "bg-amber-600 border-amber-600 text-stone-950" : "bg-white/5 border-white/5 text-stone-400 hover:text-white"
                            )}
                          >
                            {s.label}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={!selectedService}
                      onClick={() => {
                        setSelectedModel({
                          id: 999999,
                          model: usbDevice?.productName || 'Feature Phone',
                          chipset: deviceIdentity?.chipset || 'Unknown',
                          category: 'feature-phones',
                          prices: {
                            FRP: 5,
                            MDM: 5,
                            BOOTLOADER: 5,
                            FLASH: 5,
                            UPDATE: 5,
                            RESCUE: 5,
                            SLOT: 5,
                            FACTORY: 5,
                            samsung_read_pit: 0,
                            samsung_flash_odin: 0,
                            samsung_reboot: 0
                          },
                          brand: 'Generic',
                          imageUrl: '',
                          unlockCommand: '',
                          constraints: '',
                          createdAt: new Date().toISOString()
                        });
                        setStep('payment');
                      }}
                      className="w-full py-6 bg-amber-600 text-stone-950 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] hover:bg-amber-500 shadow-2xl disabled:opacity-30 transition-all"
                    >
                      Proceed to Payment
                    </motion.button>
                  </motion.div>
                )}
              </div>
            </div>
          )}

          {step === 'unlocking' && (
            <div className="space-y-8">
              <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-3xl flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-amber-600 flex items-center justify-center text-stone-950 shadow-2xl">
                  <Cpu size={32} className={isSmartUnlocking ? "animate-pulse" : ""} />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter text-white">AI Hardware Handshake</h3>
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">
                    {isSmartUnlocking ? 'Handshaking & Fetching Loaders...' : 'Handshake Complete'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-amber-500">AI Progress</span>
                  <span className="text-white">{smartProgress}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${smartProgress}%` }}
                    className="h-full bg-amber-600"
                  />
                </div>
              </div>

              <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4">
                <div className="flex items-center gap-3 text-amber-500">
                  <Zap size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Active Task</span>
                </div>
                <p className="text-sm font-medium text-stone-300">
                  {smartProgress < 30 ? 'Identifying chipset signature...' :
                   smartProgress < 60 ? 'Fetching loaders from GitHub...' :
                   smartProgress < 90 ? 'Injecting binary payload...' :
                   'Finalizing unlock protocol...'}
                </p>
              </div>
            </div>
          )}
        </GlassCard>

        <div className="space-y-8">
          <Terminal lines={terminalLines} />
          
          <GlassCard className="p-6">
            <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-4">Module Capabilities</h4>
            <div className="space-y-3">
              {[
                "Passcode & Password Removal",
                "IMEI Repair & NVRAM Management",
                "Factory Reset & Data Wipe",
                "DA/FDL Loader Injection",
                "Chipset Signature Analysis"
              ].map((cap, i) => (
                <div key={i} className="flex items-center gap-3 text-xs text-stone-300">
                  <CheckCircle2 className="w-4 h-4 text-amber-500" />
                  {cap}
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
