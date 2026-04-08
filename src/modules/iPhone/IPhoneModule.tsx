import React, { useState } from 'react';
import { Apple, Lock, Shield, Zap, Smartphone, Download, RefreshCw, Database, Usb, Cpu } from 'lucide-react';
import { GlassCard } from '../../components/Shared/GlassCard';
import { User, Device, ServiceType, AppStep } from '../../types';
import { USBManager } from '../../services/usb/USBManager';
import { WebApple } from '../../services/usb/protocols';
import { cn } from '../../lib/utils';
import { GoogleGenAI } from '@google/genai';
import { mcpClient } from '../../services/mcp/McpClient';
import { motion } from 'framer-motion';

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
  const [isSmartUnlocking, setIsSmartUnlocking] = useState(false);
  const [smartProgress, setSmartProgress] = useState(0);
  const [localUsbDevice, setLocalUsbDevice] = useState<USBDevice | null>(initialUsbDevice);

  React.useEffect(() => {
    if (step === 'unlocking' && !isSmartUnlocking && localUsbDevice) {
      startAppleUnlock();
    }
  }, [step, localUsbDevice]);

  const connectDevice = async () => {
    try {
      const { device } = await USBManager.connect(addTerminalLine);
      setLocalUsbDevice(device);
      addTerminalLine(`[USB] Apple Device Connected: ${device.productName || 'Unknown'}`);
    } catch (err: any) {
      addTerminalLine(`[ERROR] Connection failed: ${err.message}`);
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

  const startAppleUnlock = async () => {
    if (!localUsbDevice || !user) return;
    setIsSmartUnlocking(true);
    setSmartProgress(10);
    addTerminalLine(`[SMART] Starting Apple Security Bypass...`);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = "gemini-3.1-pro-preview";
      
      const history: any[] = [{
        role: "user",
        parts: [{
          text: `
            Apple Device: ${localUsbDevice.productName}
            Mode: ${usbMode}
            Service: ${selectedService}
            
            DETERMINISTIC SEQUENCE:
            1. Check hardware://protocols/capabilities to understand Apple protocol requirements.
            2. Execute apple_checkm8 if needed to enter pwned DFU.
            3. Execute target operation: ${selectedService} (e.g., apple_icloud_bypass, apple_read_syscfg, etc.).
            4. Verify and report.
            
            Use the provided MCP tools to interact with the hardware.
          `
        }]
      }];

      let iterations = 0;
      while (iterations < 5) {
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
            setSmartProgress(prev => Math.min(prev + 20, 90));
          }

          history.push({
            role: "function",
            parts: functionResponses
          });
        } else {
          addTerminalLine(`[AI] Final Report: ${response.text}`);
          break;
        }
      }

      addTerminalLine(`[SUCCESS] Apple AI Sequence Completed.`);
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
      <GlassCard className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
              <Apple className="text-blue-500 w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">iPhone Module</h3>
              <p className="text-stone-500 text-sm">Specialized for iOS devices</p>
            </div>
          </div>
          <div className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] font-bold text-green-500 uppercase tracking-widest">
            {step === 'selection' ? 'Ready' : 'Processing'}
          </div>
        </div>

        {step === 'selection' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-3xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-stone-500">
                  <Shield className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Security</span>
                </div>
                <p className="text-lg font-bold text-white">iCloud Bypass</p>
              </div>
              <div className="p-4 rounded-3xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-stone-500">
                  <Zap className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Exploit</span>
                </div>
                <p className="text-lg font-bold text-white">Checkm8 / DFU</p>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={connectDevice}
                className={cn(
                  "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3",
                  localUsbDevice ? "bg-stone-800 text-blue-500 border border-blue-500/20" : "bg-white text-stone-950 hover:bg-stone-100"
                )}
              >
                <Usb className="w-4 h-4" />
                {localUsbDevice ? `Connected: ${localUsbDevice.productName || 'Apple Device'}` : "Connect Apple Device"}
              </button>

              {localUsbDevice && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-3xl space-y-4">
                    <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Select Operation</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { id: 'apple_checkm8', label: 'Run checkm8' },
                        { id: 'apple_enter_dfu', label: 'Enter DFU' },
                        { id: 'apple_restore', label: 'Restore IPSW' },
                        { id: 'apple_reboot', label: 'Exit Recovery' },
                        { id: 'apple_icloud_bypass', label: 'iCloud Bypass' },
                        { id: 'apple_read_syscfg', label: 'Read SysCfg' }
                      ].map(s => (
                        <button
                          key={s.id}
                          onClick={() => setSelectedService(s.id as ServiceType)}
                          className={cn(
                            "px-4 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                            selectedService === s.id ? "bg-blue-600 border-blue-600 text-stone-950" : "bg-white/5 border-white/5 text-stone-400 hover:text-white"
                          )}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    disabled={!selectedService}
                    onClick={() => {
                      setSelectedModel({
                        id: 999999,
                        model: localUsbDevice?.productName || 'iPhone Device',
                        chipset: 'Apple Silicon',
                        category: 'trending',
                        prices: {
                          FRP: 0,
                          MDM: 25,
                          BOOTLOADER: 0,
                          FLASH: 15,
                          UPDATE: 10,
                          RESCUE: 20,
                          SLOT: 0,
                          FACTORY: 10,
                          samsung_read_pit: 0,
                          samsung_flash_odin: 0,
                          samsung_reboot: 0
                        },
                        brand: 'Apple',
                        imageUrl: '',
                        unlockCommand: '',
                        constraints: '',
                        createdAt: new Date().toISOString()
                      });
                      setStep('payment');
                    }}
                    className="w-full py-6 bg-blue-600 text-stone-950 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] hover:bg-blue-500 shadow-2xl disabled:opacity-30 transition-all"
                  >
                    Authorize Service
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        )}

        {step === 'unlocking' && (
          <div className="space-y-8">
            <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-3xl flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-stone-950 shadow-2xl">
                <Cpu size={32} className={isSmartUnlocking ? "animate-pulse" : ""} />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter text-white">Apple AI Engine</h3>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                  {isSmartUnlocking ? 'Bypassing Security...' : 'Bypass Complete'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                <span className="text-blue-500">Progress</span>
                <span className="text-white">{smartProgress}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${smartProgress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
};
